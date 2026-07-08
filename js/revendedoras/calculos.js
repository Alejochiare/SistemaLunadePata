/**
 * calculos.js — Luna de Plata
 * Lógica de cálculos para el sistema de control de inventario de paños.
 * Todas las fórmulas están centralizadas aquí para facilitar cambios futuros.
 */

// =========================================================
// CONSTANTES
// =========================================================

const DIAS_VENCIMIENTO     = 40;   // Un paño vence a los 40 días
const TASA_INTERES_MENSUAL = 0.15; // 15% mensual sobre saldo en mora
const DIAS_GRACIA_INTERES  = 2;    // 48hs de gracia tras el cierre del paño
const DIAS_PENALIDAD_TIER  = 7;    // a partir del día 8 sin saldar, baja la comisión al tier mínimo
const PREMIO_VTA_MIN       = 2000000; // a partir de esta venta total, el paño es elegible para premio

// =========================================================
// FECHAS
// =========================================================

/**
 * Calcula la cantidad de días entre dos fechas.
 * @param {string|Date} fechaInicio
 * @param {string|Date} fechaFin - si no se pasa, usa hoy
 * @returns {number} días transcurridos (puede ser negativo si fechaFin < fechaInicio)
 */
function calcularDias(fechaInicio, fechaFin = null) {
  const inicio = new Date(fechaInicio);
  const fin = fechaFin ? new Date(fechaFin) : new Date();

  // Normalizar a medianoche para evitar diferencias por hora
  inicio.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);

  const diferenciaMilisegundos = fin - inicio;
  return Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
}

/**
 * Calcula cuántos días lleva un paño desde su entrega.
 * @param {string} fechaEntrega
 * @returns {number}
 */
function calcularDiasTranscurridos(fechaEntrega) {
  return calcularDias(fechaEntrega);
}

/**
 * Calcula el estado de un paño (activo, por vencer, vencido).
 * @param {string} fechaEntrega
 * @param {number} diasAdicionales - días extra concedidos al editar el paño
 * @returns {{ estado: 'activo'|'por-vencer'|'vencido', diasTranscurridos: number }}
 */
function calcularEstadoVencimiento(fechaEntrega, diasAdicionales = 0) {
  const diasTranscurridos = calcularDias(fechaEntrega);
  const limite = DIAS_VENCIMIENTO + (Number(diasAdicionales) || 0);

  let estado = 'activo';
  if (diasTranscurridos >= limite) {
    estado = 'vencido';
  } else if (diasTranscurridos >= limite - 5) {
    estado = 'por-vencer';
  }

  return {
    estado,
    diasTranscurridos,
  };
}

/**
 * Retorna la fecha de vencimiento de un paño (entrega + 40 días).
 * @param {string} fechaEntrega
 * @returns {string} fecha en formato ISO
 */
function calcularFechaVencimiento(fechaEntrega) {
  const fecha = new Date(fechaEntrega);
  fecha.setDate(fecha.getDate() + DIAS_VENCIMIENTO);
  return fecha.toISOString().split('T')[0];
}

/**
 * Indica si un paño ya estaba "vencido" (40 días + adicionales) en el
 * momento en que se cerró.
 * @param {Object} pano
 * @returns {boolean}
 */
function calcularPanoVencidoAlCierre(pano) {
  if (!pano || !pano.fechaCierre) return false;
  const limite = DIAS_VENCIMIENTO + (Number(pano.diasAdicionales) || 0);
  return calcularDias(pano.fechaEntrega, pano.fechaCierre) >= limite;
}

// =========================================================
// ESTADÍSTICAS GENERALES
// =========================================================

/**
 * Calcula estadísticas globales de todas las revendedoras.
 * @returns {Object}
 */
function calcularEstadisticasGlobales() {
  if (!window.Storage) return {};

  const revendedoras = window.Storage.obtenerRevendedoras();
  const todosLosPanos = window.Storage.obtenerTodosLosPanos();

  let totalPanos = todosLosPanos.length;
  let panosVencidos = 0;

  revendedoras.forEach(rev => {
    const panos = todosLosPanos.filter(p => p.revendedoraId === rev.id);
    panos.forEach((pano) => {
      const calc = calcularEstadoVencimiento(pano.fechaEntrega, pano.diasAdicionales);
      if (calc.estado === 'vencido') panosVencidos++;
    });
  });

  return {
    totalRevendedoras: revendedoras.length,
    totalPanos,
    panosVencidos,
  };
}

// =========================================================
// UTILIDADES DE FORMATO
// =========================================================

/**
 * Formatea una fecha ISO a formato legible en español.
 * @param {string} fecha
 * @returns {string}
 */
function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  return d.toLocaleDateString('es-AR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

/**
 * Formatea número de paño con cero a la izquierda.
 * Paño 1 → "Paño 01", Paño 10 → "Paño 10"
 * @param {number} numero
 * @returns {string}
 */
function formatearNumeroPano(numero) {
  return `Paño ${String(numero).padStart(2, '0')}`;
}

// =========================================================
// MORA E INTERESES
// =========================================================

/**
 * Fecha de vencimiento efectiva considerando días adicionales concedidos.
 * @param {string} fechaEntrega
 * @param {number} diasAdicionales
 * @returns {string} ISO date
 */
function calcularFechaVencimientoEfectiva(fechaEntrega, diasAdicionales = 0) {
  const fecha = new Date(fechaEntrega);
  fecha.setDate(fecha.getDate() + DIAS_VENCIMIENTO + (Number(diasAdicionales) || 0));
  return fecha.toISOString().split('T')[0];
}

/**
 * Fecha desde la que empiezan a correr los intereses de una liquidación:
 * fecha de entrega del paño (= fecha de cierre) + 48hs de gracia.
 * @param {string} fechaEntrega - fechaEntrega de la liquidación (= fechaCierre del paño)
 * @returns {string} ISO date
 */
function calcularFechaInicioInteres(fechaEntrega) {
  const fecha = new Date(fechaEntrega);
  fecha.setDate(fecha.getDate() + DIAS_GRACIA_INTERES);
  return fecha.toISOString().split('T')[0];
}

/**
 * Calcula días de mora e intereses sobre el saldo pendiente.
 * @param {string} fechaVencimiento - fecha desde la que corre la mora
 * @param {string} fechaPago       - fecha en que se realiza el pago
 * @param {number} saldoPrevio     - saldo antes de este pago
 * @param {number} tasaMensual     - tasa de interés mensual (default: TASA_INTERES_MENSUAL)
 * @returns {{ cantDias, interesesMensuales, interesesDiarios, intereses }}
 */
function calcularMoraEIntereses(fechaVencimiento, fechaPago, saldoPrevio, tasaMensual = TASA_INTERES_MENSUAL) {
  const cantDias         = Math.max(0, calcularDias(fechaVencimiento, fechaPago));
  const interesesMensuales = Math.abs(saldoPrevio) * tasaMensual;
  const interesesDiarios   = interesesMensuales / 30;
  const intereses          = Math.round(cantDias * interesesDiarios * 100) / 100;
  return { cantDias, interesesMensuales, interesesDiarios, intereses };
}

/**
 * Calcula cuánto aumentaría el monto que la revendedora le debe a Luna de
 * Plata si se le aplicara el tier de comisión mínimo (25%) en vez del tier
 * que le corresponde según lo vendido.
 * @param {Object} pano
 * @returns {number} diferencia (>= 0)
 */
function calcularTierDelta(pano) {
  if (!pano) return 0;
  const resumen      = calcularResumenPano(pano);
  const tierOriginal = resumen.tiers[resumen.tierAplicable];
  const tier25       = resumen.tiers[0];
  return Math.round(Math.max(0, tier25.pagaLunaDePlata - tierOriginal.pagaLunaDePlata) * 100) / 100;
}

/**
 * Calcula, para cada pago de una liquidación, los días de mora respecto
 * de la referencia anterior (cierre + 48hs para el primer pago, fecha del
 * pago previo para los siguientes), los intereses generados sobre el saldo
 * pendiente y el saldo acumulado resultante.
 *
 * Si pasan más de DIAS_PENALIDAD_TIER días desde el cierre y aún hay saldo,
 * se suma una única vez la diferencia de comisión (calcularTierDelta) al
 * saldo, antes de calcular los intereses de ese pago.
 *
 * @param {Object} liq  - liquidación v2 ({ montoLunaDePlata, fechaEntrega, pagos[] })
 * @param {Object} pano - paño asociado
 * @param {Object} [opciones]
 * @param {number} [opciones.tasaMensual] - tasa mensual a usar (default: TASA_INTERES_MENSUAL)
 * @returns {Array} copia de liq.pagos con { cantDias, intereses, saldoAcum, diasDesdeCierre, tierPenaltyMonto }
 */
function calcularPagosConIntereses(liq, pano, opciones = {}) {
  const pagos       = (liq && liq.pagos) || [];
  const tasaMensual = Number(opciones.tasaMensual) || TASA_INTERES_MENSUAL;
  let saldo = Number(liq?.montoLunaDePlata) || 0;

  const tierDelta = calcularTierDelta(pano);
  let tierPenaltyApplied = false;

  return pagos.map((p, idx) => {
    const fechaRef = idx > 0
      ? pagos[idx - 1].fecha
      : (liq?.fechaEntrega ? calcularFechaInicioInteres(liq.fechaEntrega) : p.fecha);

    const cantDias        = Math.max(0, calcularDias(fechaRef, p.fecha));
    const diasDesdeCierre = liq?.fechaEntrega ? Math.max(0, calcularDias(liq.fechaEntrega, p.fecha)) : 0;

    let tierPenaltyMonto = 0;
    if (!tierPenaltyApplied && tierDelta > 0 && diasDesdeCierre > DIAS_PENALIDAD_TIER && saldo > 0) {
      saldo = Math.round((saldo + tierDelta) * 100) / 100;
      tierPenaltyApplied = true;
      tierPenaltyMonto = tierDelta;
    }

    const intereses = saldo > 0
      ? Math.round(saldo * (tasaMensual / 30) * cantDias * 100) / 100
      : 0;

    const variosM   = Number(p.variosMontos) || 0;
    const entrega   = Number(p.entrega)      || 0;
    const pagoExtra = Number(p.pagoExtra)    || 0;

    saldo = Math.round((saldo + variosM + intereses - entrega - pagoExtra) * 100) / 100;

    return { ...p, cantDias, intereses, saldoAcum: saldo, diasDesdeCierre, tierPenaltyMonto };
  });
}

/**
 * Calcula el estado de mora "a hoy" de una liquidación: saldo actual
 * (incluyendo los intereses devengados desde el último pago —o desde el
 * cierre + 48hs de gracia si todavía no hay pagos— hasta hoy), días
 * considerados para ese cálculo y si ya se aplicó la penalización de
 * comisión por mora > DIAS_PENALIDAD_TIER días.
 * @returns {{ saldo, diasMora, intereses, diasDesdeCierre, tierPenaltyAplicado, tierPenaltyMonto }}
 */
function calcularEstadoActual(liq, pano, opciones = {}) {
  const pagos = (liq && liq.pagos) || [];
  const hoy   = new Date().toISOString().split('T')[0];
  const calc  = calcularPagosConIntereses({ ...liq, pagos: [...pagos, { fecha: hoy }] }, pano, opciones);

  const ultimo      = calc[calc.length - 1];
  const tierPenalty = calc.find(p => p.tierPenaltyMonto > 0);

  return {
    saldo:               ultimo.saldoAcum,
    diasMora:            ultimo.cantDias,
    intereses:           ultimo.intereses,
    diasDesdeCierre:     ultimo.diasDesdeCierre,
    tierPenaltyAplicado: !!tierPenalty,
    tierPenaltyMonto:    tierPenalty ? tierPenalty.tierPenaltyMonto : 0,
  };
}

/**
 * Saldo actual de una liquidación a hoy: incluye los intereses devengados
 * hasta hoy (aunque no haya pagos registrados) y la penalización de
 * comisión por mora > DIAS_PENALIDAD_TIER días.
 */
function calcularSaldoLiquidacion(liq, pano, opciones = {}) {
  if (!liq) return 0;
  return calcularEstadoActual(liq, pano, opciones).saldo;
}

/**
 * Indica si la revendedora dejó el saldo en 0 (o a favor) dentro de las
 * DIAS_GRACIA_INTERES (48hs) posteriores al cierre del paño.
 * Se usa para decidir si corresponde sugerir el premio por venta > PREMIO_VTA_MIN.
 */
function calcularPagoATiempo(liq, pano, opciones = {}) {
  const pagos = (liq && liq.pagos) || [];
  if (!pagos.length) return false;
  const calc = calcularPagosConIntereses(liq, pano, opciones);
  return calc.some(p => p.diasDesdeCierre <= DIAS_GRACIA_INTERES && p.saldoAcum <= 0);
}

// =========================================================
// RESUMEN FINANCIERO DE PAÑO
// =========================================================

/**
 * Calcula el resumen financiero completo de un paño.
 * Devuelve totales por categoría, ganancias y tiers de comisión.
 * @param {Object} pano
 * @returns {Object}
 */
function calcularResumenPano(pano) {
  const cats = pano.categorias || {};

  function sumar(keys, soloVendidos) {
    return keys.reduce((total, key) => {
      const items = cats[key];
      if (!Array.isArray(items)) return total;
      return total + items.reduce((sum, item) => {
        if (soloVendidos && !item.vendido) return sum;
        const precio = Number(item.precioVenta);
        return sum + (Number.isFinite(precio) ? precio : 0);
      }, 0);
    }, 0);
  }

  const joyasPlataKeys = ['anillos', 'aros', 'cadenasConjuntos', 'dijes', 'pulseras'];
  const aceroKeys      = ['anillosAcero', 'arosAcero', 'cadenasAcero', 'dijesAcero', 'pulserasAcero'];
  const todasKeys      = [...joyasPlataKeys, 'accesoriosGoldFabricacion', ...aceroKeys,
                          'relojes', 'joyasPersonalizadas', 'maryKay', 'precioFijoArreglos'];

  const ventaJoyasPlata    = sumar(joyasPlataKeys, true);
  const ventaAccesorios    = sumar(['accesoriosGoldFabricacion'], true);
  const ventaAcero         = sumar(aceroKeys, true);
  const ventaRelojes       = sumar(['relojes'], true);
  const ventaJoyasPerso    = sumar(['joyasPersonalizadas'], true);
  const ventaMaryKay       = sumar(['maryKay'], true);
  // Precio fijo / arreglos / grabados: 100% para Luna de Plata, sin comisión para la revendedora.
  const ventaPrecioFijo    = sumar(['precioFijoArreglos'], true);
  const ventaTotal         = ventaJoyasPlata + ventaAccesorios + ventaAcero +
                             ventaRelojes + ventaJoyasPerso + ventaMaryKay + ventaPrecioFijo;

  const montoTotal = sumar(todasKeys, false);

  // Ganancias fijas de la revendedora
  const gananciaFija = (ventaAccesorios * 0.20) + (ventaAcero * 0.25) +
                       (ventaRelojes    * 0.20) + (ventaJoyasPerso * 0.20) +
                       (ventaMaryKay    * 0.20);

  // Tiers para joyas de plata (porcentaje variable según monto vendido)
  const TIERS = [
    { pct: 0.25, pctLabel: '25%', label: 'HASTA $800.000',                  max: 800000  },
    { pct: 0.30, pctLabel: '30%', label: 'ENTRE $800.000 Y $1.200.000',    max: 1200000 },
    { pct: 0.35, pctLabel: '35%', label: 'ENTRE $1.200.000 Y $1.500.000',  max: 1500000 },
    { pct: 0.40, pctLabel: '40%', label: 'MÁS DE $1.500.000',              max: Infinity },
  ];

  const tiers = TIERS.map(t => ({
    ...t,
    gananciaJoyasPlata: ventaJoyasPlata * t.pct,
    gananciaTotal:      (ventaJoyasPlata * t.pct) + gananciaFija,
    pagaLunaDePlata:    ventaTotal - ((ventaJoyasPlata * t.pct) + gananciaFija),
  }));

  const tierAplicable = ventaTotal > 1500000 ? 3 :
                        ventaTotal > 1200000 ? 2 :
                        ventaTotal > 800000  ? 1 : 0;

  const porcentajeVenta = montoTotal > 0 ? (ventaTotal / montoTotal * 100) : 0;

  return {
    ventaJoyasPlata, ventaAccesorios, ventaAcero, ventaRelojes, ventaJoyasPerso, ventaMaryKay, ventaPrecioFijo,
    ventaTotal, montoTotal, porcentajeVenta, gananciaFija, tiers, tierAplicable,
  };
}

// Exportar al scope global
window.Calculos = {
  calcularDias,
  calcularDiasTranscurridos,
  calcularEstadoVencimiento,
  calcularFechaVencimiento,
  calcularFechaVencimientoEfectiva,
  calcularFechaInicioInteres,
  calcularPanoVencidoAlCierre,
  calcularMoraEIntereses,
  calcularTierDelta,
  calcularPagosConIntereses,
  calcularEstadoActual,
  calcularSaldoLiquidacion,
  calcularPagoATiempo,
  calcularEstadisticasGlobales,
  calcularResumenPano,
  formatearFecha,
  formatearNumeroPano,
  DIAS_VENCIMIENTO,
  TASA_INTERES_MENSUAL,
  DIAS_GRACIA_INTERES,
  DIAS_PENALIDAD_TIER,
  PREMIO_VTA_MIN,
};
