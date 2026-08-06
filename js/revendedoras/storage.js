/**
 * storage.js — Luna de Plata
 * Capa de abstracción sobre LocalStorage.
 * Todas las operaciones de lectura/escritura pasan por aquí.
 */

const KEYS = {
  REVENDEDORAS:    'ldp_revendedoras',
  PANOS:           'ldp_panos',
  CONFIG:          'ldp_config',
  LIQUIDACIONES:   'ldp_liquidaciones',
  LIQUIDACIONES_V2:'ldp_liquidaciones_v2',
  USERS:           'ldp_users',
  SESSION:         'ldp_session',
  CIERRES_CAJA:    'ldp_cierres_caja',
  NOTIFICACIONES:  'ldp_notificaciones',
  SUCURSALES:      'ldp_sucursales',
  NOMENCLATURAS:   'ldp_nomenclaturas_custom',
};

const SUCURSALES = ['Balnearia', 'Miramar', 'La Para'];

// --- Utilidades internas ---

function _leer(clave) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    console.error(`[storage] Error leyendo "${clave}"`);
    return null;
  }
}

function _guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    console.error(`[storage] Error guardando "${clave}"`);
    return false;
  }
}

// =========================================================
// REVENDEDORAS
// =========================================================

/**
 * Obtiene todas las revendedoras.
 * @returns {Array}
 */
function obtenerRevendedoras() {
  return _leer(KEYS.REVENDEDORAS) || [];
}

/**
 * Guarda una nueva revendedora.
 * @param {Object} revendedora
 * @returns {Object} revendedora con id asignado
 */
function guardarRevendedora(revendedora) {
  const lista = obtenerRevendedoras();
  const nueva = {
    ...revendedora,
    id: generarId(),
    creadaEn: new Date().toISOString(),
  };
  lista.push(nueva);
  _guardar(KEYS.REVENDEDORAS, lista);
  return nueva;
}

/**
 * Actualiza una revendedora existente por id.
 * @param {string} id
 * @param {Object} cambios
 * @returns {Object|null}
 */
function actualizarRevendedora(id, cambios) {
  const lista = obtenerRevendedoras();
  const idx = lista.findIndex(r => r.id === id);
  if (idx === -1) return null;
  lista[idx] = { ...lista[idx], ...cambios, actualizadaEn: new Date().toISOString() };
  _guardar(KEYS.REVENDEDORAS, lista);
  return lista[idx];
}

/**
 * Elimina una revendedora y sus paños asociados.
 * @param {string} id
 */
function eliminarRevendedora(id) {
  const lista = obtenerRevendedoras().filter(r => r.id !== id);
  _guardar(KEYS.REVENDEDORAS, lista);
  const panos = obtenerTodosLosPanos().filter(p => p.revendedoraId !== id);
  _guardar(KEYS.PANOS, panos);
  eliminarUsuarioPorRevendedoraId(id);
}

/**
 * Obtiene una revendedora por id.
 * @param {string} id
 * @returns {Object|null}
 */
function obtenerRevendedoraPorId(id) {
  return obtenerRevendedoras().find(r => r.id === id) || null;
}

// =========================================================
// PAÑOS
// =========================================================

/**
 * Obtiene todos los paños (sin filtrar).
 * @returns {Array}
 */
function obtenerTodosLosPanos() {
  return _leer(KEYS.PANOS) || [];
}

/**
 * Obtiene los paños de una revendedora específica.
 * @param {string} revendedoraId
 * @returns {Array}
 */
function obtenerPanosDeRevendedora(revendedoraId) {
  return obtenerTodosLosPanos().filter(p => p.revendedoraId === revendedoraId);
}

/**
 * Guarda un nuevo paño para una revendedora.
 * El número de paño se detecta automáticamente.
 * @param {Object} pano
 * @returns {Object} paño con id y número asignados
 */
function guardarPano(pano) {
  const todos = obtenerTodosLosPanos();
  const panosRevendedora = todos.filter(p => p.revendedoraId === pano.revendedoraId);
  
  // Calcular número automático del paño
  const numeroPano = calcularNumeroPano(panosRevendedora);
  
  const nuevo = {
    ...pano,
    id: generarId(),
    numero: numeroPano,
    cerrado: false,
    creadoEn: new Date().toISOString(),
  };
  todos.push(nuevo);
  _guardar(KEYS.PANOS, todos);
  return nuevo;
}

/**
 * Actualiza un paño existente.
 * @param {string} id
 * @param {Object} cambios
 * @returns {Object|null}
 */
function actualizarPano(id, cambios) {
  const todos = obtenerTodosLosPanos();
  const idx = todos.findIndex(p => p.id === id);
  if (idx === -1) return null;
  todos[idx] = { ...todos[idx], ...cambios, actualizadoEn: new Date().toISOString() };
  _guardar(KEYS.PANOS, todos);
  return todos[idx];
}

/**
 * Marca un paño como cerrado.
 * @param {string} id
 * @returns {Object|null}
 */
function cerrarPano(id) {
  return actualizarPano(id, { cerrado: true, fechaCierre: new Date().toISOString().split('T')[0] });
}

/**
 * Agrega un adelanto al paño (pago parcial antes del cierre).
 * @param {string} panoId
 * @param {{ fecha:string, monto:number, nota:string, registradoPor:string }} adelanto
 * @returns {Object|null}
 */
function agregarAdelanto(panoId, adelanto) {
  const pano = obtenerPanoPorId(panoId);
  if (!pano || pano.cerrado) return null;
  const adelantos = Array.isArray(pano.adelantos) ? pano.adelantos : [];
  const nuevo = { ...adelanto, id: generarId() };
  return actualizarPano(panoId, { adelantos: [...adelantos, nuevo] });
}

/**
 * Elimina un adelanto de un paño.
 * @param {string} panoId
 * @param {string} adelantoId
 */
function eliminarAdelanto(panoId, adelantoId) {
  const pano = obtenerPanoPorId(panoId);
  if (!pano) return;
  const adelantos = (pano.adelantos || []).filter(a => a.id !== adelantoId);
  actualizarPano(panoId, { adelantos });
}

/**
 * Elimina un paño por id.
 * @param {string} id
 */
function eliminarPano(id) {
  const todos = obtenerTodosLosPanos().filter(p => p.id !== id);
  _guardar(KEYS.PANOS, todos);
}

/**
 * Obtiene un paño por id.
 * @param {string} id
 * @returns {Object|null}
 */
function obtenerPanoPorId(id) {
  return obtenerTodosLosPanos().find(p => p.id === id) || null;
}

/**
 * Actualiza un item individual dentro de una categoría de un paño.
 * @param {string} panoId
 * @param {string} catKey - clave de la categoría (ej: 'anillos')
 * @param {string} itemId
 * @param {Object} cambios - campos a actualizar (vendido, precioVenta, etc.)
 * @returns {Object|null} paño actualizado
 */
function actualizarItemPano(panoId, catKey, itemId, cambios) {
  const todos = obtenerTodosLosPanos();
  const idx = todos.findIndex(p => p.id === panoId);
  if (idx === -1) return null;

  const pano = todos[idx];
  const categorias = { ...(pano.categorias || {}) };
  const items = categorias[catKey];
  if (!Array.isArray(items)) return null;

  const itemIdx = items.findIndex(i => i.id === itemId);
  if (itemIdx === -1) return null;

  items[itemIdx] = { ...items[itemIdx], ...cambios };
  categorias[catKey] = items;
  todos[idx] = { ...pano, categorias, actualizadoEn: new Date().toISOString() };
  _guardar(KEYS.PANOS, todos);
  return todos[idx];
}

// =========================================================
// LIQUIDACIONES
// =========================================================

/**
 * Obtiene todas las liquidaciones.
 * @returns {Array}
 */
function obtenerTodasLasLiquidaciones() {
  return _leer(KEYS.LIQUIDACIONES) || [];
}

/**
 * Obtiene las liquidaciones de una revendedora específica, ordenadas por fecha.
 * @param {string} revendedoraId
 * @returns {Array}
 */
function obtenerLiquidacionesDeRevendedora(revendedoraId) {
  return obtenerTodasLasLiquidaciones()
    .filter(l => l.revendedoraId === revendedoraId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Guarda una nueva liquidación.
 * El saldo se recalcula automáticamente en base al historial de la revendedora.
 * @param {Object} liq
 * @returns {Object} liquidación con id asignado
 */
function guardarLiquidacion(liq) {
  const todas = obtenerTodasLasLiquidaciones();
  const nueva = {
    ...liq,
    id: generarId(),
    creadoEn: new Date().toISOString(),
  };
  todas.push(nueva);
  _guardar(KEYS.LIQUIDACIONES, todas);
  return nueva;
}

/**
 * Actualiza una liquidación existente.
 * @param {string} id
 * @param {Object} cambios
 * @returns {Object|null}
 */
function actualizarLiquidacion(id, cambios) {
  const todas = obtenerTodasLasLiquidaciones();
  const idx = todas.findIndex(l => l.id === id);
  if (idx === -1) return null;
  todas[idx] = { ...todas[idx], ...cambios, actualizadoEn: new Date().toISOString() };
  _guardar(KEYS.LIQUIDACIONES, todas);
  return todas[idx];
}

/**
 * Elimina una liquidación por id.
 * @param {string} id
 */
function eliminarLiquidacion(id) {
  const todas = obtenerTodasLasLiquidaciones().filter(l => l.id !== id);
  _guardar(KEYS.LIQUIDACIONES, todas);
}

/**
 * Obtiene una liquidación por id.
 * @param {string} id
 * @returns {Object|null}
 */
function obtenerLiquidacionPorId(id) {
  return obtenerTodasLasLiquidaciones().find(l => l.id === id) || null;
}

/**
 * Calcula el saldo corriente de una revendedora a partir de todas sus liquidaciones ordenadas.
 * saldo = prevSaldo + pano + variosMontos + intereses - entrega - pagoExtra
 * @param {string} revendedoraId
 * @returns {number}
 */
function calcularSaldoActual(revendedoraId) {
  const liqOrdenadas = obtenerLiquidacionesDeRevendedora(revendedoraId);
  return liqOrdenadas.reduce((saldo, l) => {
    return saldo
      + (Number(l.pano)         || 0)
      + (Number(l.variosMontos) || 0)
      + (Number(l.intereses)    || 0)
      - (Number(l.entrega)      || 0)
      - (Number(l.pagoExtra)    || 0);
  }, 0);
}

// =========================================================
// LIQUIDACIONES V2 (paño → pagos[])
// =========================================================

function obtenerTodasLasLiquidacionesV2() {
  return _leer(KEYS.LIQUIDACIONES_V2) || [];
}

function obtenerLiquidacionesV2DeRevendedora(revendedoraId) {
  return obtenerTodasLasLiquidacionesV2()
    .filter(l => l.revendedoraId === revendedoraId)
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
}

function obtenerLiquidacionV2PorPanoId(panoId) {
  return obtenerTodasLasLiquidacionesV2().find(l => l.panoId === panoId) || null;
}

function obtenerLiquidacionV2PorId(id) {
  return obtenerTodasLasLiquidacionesV2().find(l => l.id === id) || null;
}

function guardarLiquidacionV2(liq) {
  const todas = obtenerTodasLasLiquidacionesV2();
  const nueva = { ...liq, id: generarId(), pagos: liq.pagos || [], creadoEn: new Date().toISOString() };
  todas.push(nueva);
  _guardar(KEYS.LIQUIDACIONES_V2, todas);
  return nueva;
}

function actualizarLiquidacionV2(id, cambios) {
  const todas = obtenerTodasLasLiquidacionesV2();
  const idx = todas.findIndex(l => l.id === id);
  if (idx === -1) return null;
  todas[idx] = { ...todas[idx], ...cambios, actualizadoEn: new Date().toISOString() };
  _guardar(KEYS.LIQUIDACIONES_V2, todas);
  return todas[idx];
}

function eliminarLiquidacionV2(id) {
  const todas = obtenerTodasLasLiquidacionesV2().filter(l => l.id !== id);
  _guardar(KEYS.LIQUIDACIONES_V2, todas);
}

function agregarPagoV2(liqId, pago) {
  const todas = obtenerTodasLasLiquidacionesV2();
  const idx = todas.findIndex(l => l.id === liqId);
  if (idx === -1) return null;
  const nuevoPago = { ...pago, id: generarId(), creadoEn: new Date().toISOString() };
  todas[idx].pagos = [...(todas[idx].pagos || []), nuevoPago];
  todas[idx].actualizadoEn = new Date().toISOString();
  _guardar(KEYS.LIQUIDACIONES_V2, todas);
  return { liq: todas[idx], pago: nuevoPago };
}

function actualizarPagoV2(liqId, pagoId, cambios) {
  const todas = obtenerTodasLasLiquidacionesV2();
  const idx = todas.findIndex(l => l.id === liqId);
  if (idx === -1) return null;
  const pagos = [...(todas[idx].pagos || [])];
  const pIdx = pagos.findIndex(p => p.id === pagoId);
  if (pIdx === -1) return null;
  pagos[pIdx] = { ...pagos[pIdx], ...cambios };
  todas[idx].pagos = pagos;
  todas[idx].actualizadoEn = new Date().toISOString();
  _guardar(KEYS.LIQUIDACIONES_V2, todas);
  return todas[idx];
}

function eliminarPagoV2(liqId, pagoId) {
  const todas = obtenerTodasLasLiquidacionesV2();
  const idx = todas.findIndex(l => l.id === liqId);
  if (idx === -1) return null;
  todas[idx].pagos = (todas[idx].pagos || []).filter(p => p.id !== pagoId);
  todas[idx].actualizadoEn = new Date().toISOString();
  _guardar(KEYS.LIQUIDACIONES_V2, todas);
  return todas[idx];
}

// =========================================================
// NOTIFICACIONES
// =========================================================

function obtenerNotificaciones() {
  return _leer(KEYS.NOTIFICACIONES) || [];
}

function obtenerNotificacionesNoLeidas() {
  return obtenerNotificaciones().filter(n => !n.leida);
}

function marcarNotificacionLeida(id) {
  const todas = obtenerNotificaciones();
  const idx = todas.findIndex(n => n.id === id);
  if (idx === -1) return;
  todas[idx].leida = true;
  _guardar(KEYS.NOTIFICACIONES, todas);
}

function _crearNotificacion(tipo, { revendedoraId, panoId, liqId, datos = {} }) {
  const todas = obtenerNotificaciones();
  todas.push({ id: generarId(), tipo, revendedoraId, panoId, liqId, datos, leida: false, creadaEn: new Date().toISOString() });
  _guardar(KEYS.NOTIFICACIONES, todas);
}

function calcularSaldoActualV2(revendedoraId) {
  const tasaMensual = obtenerTasaInteresMensual();
  const total = obtenerLiquidacionesV2DeRevendedora(revendedoraId).reduce((sum, liq) => {
    const pano = obtenerPanoPorId(liq.panoId);
    return sum + window.Calculos.calcularSaldoLiquidacion(liq, pano, { tasaMensual });
  }, 0);
  return Math.round(total);
}

/**
 * Recorre todas las liquidaciones v2 y aplica las reglas automáticas de premio:
 *
 *  Caso A (premio ya otorgado): se borra automáticamente si
 *   (a) el paño ya estaba "vencido" (40 días + adicionales) al cerrarse, o
 *   (b) pasaron más de 48hs desde el cierre y todavía hay saldo pendiente.
 *   Al decomisar se crea una notificación 'premio_perdido' (teniaPremio: true).
 *
 *  Caso B (paño elegible por venta > PREMIO_VTA_MIN, sin premio asignado):
 *   - si pagó todo a tiempo (dentro de las 48hs) → notificación 'premio_sugerido'
 *     (una sola vez, vía premioNotifSugerido).
 *   - si no pagó a tiempo y ya pasaron las 48hs → premioEstado: 'perdido' +
 *     notificación 'premio_perdido' (teniaPremio: false).
 *
 * Es idempotente y de un solo sentido (nunca restaura un premio ni una notificación).
 * @returns {boolean} true si se modificó alguna liquidación
 */
function aplicarReglasPremio() {
  const tasaMensual = obtenerTasaInteresMensual();
  let huboCambios = false;

  obtenerTodasLasLiquidacionesV2().forEach(liq => {
    const pano = obtenerPanoPorId(liq.panoId);
    if (!pano) return;

    if (liq.premio || liq.premioFecha) {
      // Caso A: ya tiene premio asignado, evaluar decomiso.
      let debeDecomisar = window.Calculos.calcularPanoVencidoAlCierre(pano);

      if (!debeDecomisar && liq.fechaEntrega) {
        const diasDesdeCierre = window.Calculos.calcularDias(liq.fechaEntrega);
        if (diasDesdeCierre > window.Calculos.DIAS_GRACIA_INTERES) {
          const saldo = window.Calculos.calcularSaldoLiquidacion(liq, pano, { tasaMensual });
          if (saldo > 0) debeDecomisar = true;
        }
      }

      if (debeDecomisar) {
        actualizarLiquidacionV2(liq.id, { premio: '', premioFecha: '', premioEstado: 'perdido' });
        _crearNotificacion('premio_perdido', {
          revendedoraId: liq.revendedoraId, panoId: liq.panoId, liqId: liq.id,
          datos: { teniaPremio: true },
        });
        huboCambios = true;
      }
      return;
    }

    if (liq.premioEstado !== 'pendiente') return;

    // Caso B: paño elegible para premio, todavía sin decisión.
    const pagoATiempo = window.Calculos.calcularPagoATiempo(liq, pano, { tasaMensual });

    if (pagoATiempo) {
      if (!liq.premioNotifSugerido) {
        actualizarLiquidacionV2(liq.id, { premioNotifSugerido: true });
        _crearNotificacion('premio_sugerido', {
          revendedoraId: liq.revendedoraId, panoId: liq.panoId, liqId: liq.id,
        });
        huboCambios = true;
      }
      return;
    }

    if (liq.fechaEntrega) {
      const diasDesdeCierre = window.Calculos.calcularDias(liq.fechaEntrega);
      if (diasDesdeCierre > window.Calculos.DIAS_GRACIA_INTERES) {
        actualizarLiquidacionV2(liq.id, { premioEstado: 'perdido' });
        _crearNotificacion('premio_perdido', {
          revendedoraId: liq.revendedoraId, panoId: liq.panoId, liqId: liq.id,
          datos: { teniaPremio: false },
        });
        huboCambios = true;
      }
    }
  });

  return huboCambios;
}

function asegurarLiquidacionV2ParaPano(panoId) {
  const pano = obtenerPanoPorId(panoId);
  if (!pano || !pano.cerrado) return null;

  const existente = obtenerLiquidacionV2PorPanoId(panoId);
  if (existente) return existente;

  const resumen = window.Calculos.calcularResumenPano(pano);
  const tier = resumen.tiers[resumen.tierAplicable];
  const vtaTotal = Math.round(resumen.ventaTotal);
  const elegiblePremio = vtaTotal > window.Calculos.PREMIO_VTA_MIN;

  // Convertir adelantos en pagos iniciales para que sean visibles en el historial
  const pagosAdelantos = (pano.adelantos || []).map(a => ({
    id:          a.id || generarId(),
    fecha:       a.fecha,
    entrega:     Math.round(Number(a.monto) || 0),
    variosDesc:  a.nota ? `Adelanto — ${a.nota}` : 'Adelanto previo al cierre',
    variosMontos: 0,
    pagoExtra:   0,
    detalle:     a.registradoPor ? `Registrado por ${a.registradoPor}` : 'Adelanto',
    _esAdelanto: true,
  }));

  const nueva = guardarLiquidacionV2({
    revendedoraId:    pano.revendedoraId,
    panoId:           panoId,
    fechaEntrega:     pano.fechaCierre || new Date().toISOString().split('T')[0],
    montoLunaDePlata: Math.round(Math.max(0, tier.pagaLunaDePlata)),
    vtaTotal:         vtaTotal,
    circulo:          '',
    premio:           '',
    premioFecha:      '',
    premioEstado:     elegiblePremio ? 'pendiente' : undefined,
    pagos:            pagosAdelantos,
  });

  if (elegiblePremio) {
    _crearNotificacion('premio_elegible', {
      revendedoraId: pano.revendedoraId, panoId, liqId: nueva.id,
      datos: { vtaTotal },
    });
  }

  return nueva;
}

function asegurarLiquidacionesV2() {
  obtenerTodosLosPanos()
    .filter(p => p.cerrado)
    .forEach(p => asegurarLiquidacionV2ParaPano(p.id));
}

// =========================================================
// SUCURSALES
// =========================================================

function obtenerTodasLasSucursales() {
  return _leer(KEYS.SUCURSALES) || [];
}

function obtenerSucursalPorId(id) {
  return obtenerTodasLasSucursales().find(s => s.id === id) || null;
}

function obtenerSucursalPorNombre(nombre) {
  return obtenerTodasLasSucursales().find(s => s.nombre === nombre) || null;
}

function guardarSucursal(datos) {
  const todas = obtenerTodasLasSucursales();
  const nueva = { ...datos, id: generarId(), creadaEn: new Date().toISOString() };
  todas.push(nueva);
  _guardar(KEYS.SUCURSALES, todas);
  return nueva;
}

function actualizarSucursal(id, cambios) {
  const todas = obtenerTodasLasSucursales();
  const idx = todas.findIndex(s => s.id === id);
  if (idx === -1) return null;
  todas[idx] = { ...todas[idx], ...cambios, id };
  _guardar(KEYS.SUCURSALES, todas);
  return todas[idx];
}

function eliminarSucursal(id) {
  _guardar(KEYS.SUCURSALES, obtenerTodasLasSucursales().filter(s => s.id !== id));
}

function obtenerUsuariosDeSucursal(sucursalId) {
  return obtenerUsuarios().filter(u => u.role === 'sucursal' && u.sucursalId === sucursalId);
}

function _seedSucursalesIniciales() {
  if (obtenerTodasLasSucursales().length > 0) return;
  const iniciales = [
    { nombre: 'Balnearia', color: 'balnearia', usuario: 'balnearia', password: 'balnearia123' },
    { nombre: 'Miramar',   color: 'miramar',   usuario: 'miramar',   password: 'miramar123'   },
    { nombre: 'La Para',   color: 'la-para',   usuario: 'lapara',    password: 'lapara123'     },
  ];
  iniciales.forEach(s => guardarSucursal(s));
}

// =========================================================
// NOMENCLATURAS PERSONALIZADAS (agregadas desde Configuración)
// =========================================================

/**
 * Obtiene el mapa completo de nomenclaturas personalizadas por categoría.
 * @returns {Object} { [catKey]: Array<{id, codigo, descripcion}> }
 */
function obtenerNomenclaturasCustom() {
  return _leer(KEYS.NOMENCLATURAS) || {};
}

/**
 * Obtiene las nomenclaturas personalizadas de una categoría puntual.
 * @param {string} catKey
 * @returns {Array}
 */
function obtenerNomenclaturasCustomDeCategoria(catKey) {
  return obtenerNomenclaturasCustom()[catKey] || [];
}

/**
 * Agrega una nomenclatura personalizada a una categoría.
 * @param {string} catKey
 * @param {{codigo:string, descripcion:string}} datos
 * @returns {Object} nomenclatura con id asignado
 */
function agregarNomenclaturaCustom(catKey, datos) {
  const todas = obtenerNomenclaturasCustom();
  const lista = todas[catKey] || [];
  const nueva = { ...datos, id: generarId(), creadaEn: new Date().toISOString() };
  todas[catKey] = [...lista, nueva];
  _guardar(KEYS.NOMENCLATURAS, todas);
  return nueva;
}

/**
 * Elimina una nomenclatura personalizada de una categoría.
 * @param {string} catKey
 * @param {string} id
 */
function eliminarNomenclaturaCustom(catKey, id) {
  const todas = obtenerNomenclaturasCustom();
  todas[catKey] = (todas[catKey] || []).filter(n => n.id !== id);
  _guardar(KEYS.NOMENCLATURAS, todas);
}

// =========================================================
// CIERRES DE CAJA
// =========================================================

function obtenerTodosLosCierres() {
  return _leer(KEYS.CIERRES_CAJA) || [];
}

function obtenerCierresDeSucursal(sucursal) {
  return obtenerTodosLosCierres()
    .filter(c => c.sucursal === sucursal)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function obtenerCierresPorFecha(fecha) {
  return obtenerTodosLosCierres().filter(c => c.fecha === fecha);
}

function guardarCierre(cierre) {
  const todos = obtenerTodosLosCierres();
  const totalVentas = (Number(cierre.ventasEfectivo) || 0)
    + (Number(cierre.ventasTransferencia) || 0)
    + (Number(cierre.ventasTarjeta) || 0);
  const totalGastos = (cierre.gastos || []).reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const cajaFinal = (Number(cierre.fondoInicio) || 0)
    + (Number(cierre.ventasEfectivo) || 0)
    - totalGastos;
  const nuevo = {
    ...cierre,
    id: generarId(),
    totalVentas,
    totalGastos,
    cajaFinal,
    creadoEn: new Date().toISOString(),
  };
  todos.push(nuevo);
  _guardar(KEYS.CIERRES_CAJA, todos);
  return nuevo;
}

function actualizarCierre(id, cambios) {
  const todos = obtenerTodosLosCierres();
  const idx = todos.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const merged = { ...todos[idx], ...cambios };
  const totalVentas = (Number(merged.ventasEfectivo) || 0)
    + (Number(merged.ventasTransferencia) || 0)
    + (Number(merged.ventasTarjeta) || 0);
  const totalGastos = (merged.gastos || []).reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const cajaFinal = (Number(merged.fondoInicio) || 0)
    + (Number(merged.ventasEfectivo) || 0)
    - totalGastos;
  todos[idx] = { ...merged, totalVentas, totalGastos, cajaFinal, actualizadoEn: new Date().toISOString() };
  _guardar(KEYS.CIERRES_CAJA, todos);
  return todos[idx];
}

function eliminarCierre(id) {
  const todos = obtenerTodosLosCierres().filter(c => c.id !== id);
  _guardar(KEYS.CIERRES_CAJA, todos);
}

function obtenerCierrePorId(id) {
  return obtenerTodosLosCierres().find(c => c.id === id) || null;
}

// =========================================================
// USUARIOS
// =========================================================

function obtenerUsuarios() {
  return _leer(KEYS.USERS) || [];
}

function guardarUsuario(usuario) {
  const lista = obtenerUsuarios();
  const nuevo = { ...usuario, id: generarId(), creadoEn: new Date().toISOString() };
  lista.push(nuevo);
  _guardar(KEYS.USERS, lista);
  return nuevo;
}

function actualizarUsuario(id, cambios) {
  const lista = obtenerUsuarios();
  const idx = lista.findIndex(u => u.id === id);
  if (idx === -1) return null;
  lista[idx] = { ...lista[idx], ...cambios, actualizadoEn: new Date().toISOString() };
  _guardar(KEYS.USERS, lista);
  return lista[idx];
}

function eliminarUsuarioPorRevendedoraId(revendedoraId) {
  const lista = obtenerUsuarios().filter(u => u.revendedoraId !== revendedoraId);
  _guardar(KEYS.USERS, lista);
}

function obtenerUsuarioPorUsername(username) {
  return obtenerUsuarios().find(u => u.username === username) || null;
}

function obtenerUsuarioPorRevendedoraId(revendedoraId) {
  return obtenerUsuarios().find(u => u.revendedoraId === revendedoraId) || null;
}

// =========================================================
// SESIÓN
// =========================================================

function obtenerSesion() {
  try {
    const raw = sessionStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function guardarSesion(sesion) {
  try {
    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(sesion));
  } catch { console.error('[storage] Error guardando sesión'); }
}

function eliminarSesion() {
  sessionStorage.removeItem(KEYS.SESSION);
}

// =========================================================
// CONFIGURACIÓN
// =========================================================

/**
 * Obtiene la configuración del sistema.
 * @returns {Object}
 */
function obtenerConfig() {
  const guardado = _leer(KEYS.CONFIG) || {};
  return {
    diasVencimientoPano: 40,
    tasaInteresMensual: window.Calculos?.TASA_INTERES_MENSUAL ?? 0.15,
    ...guardado,
  };
}

/**
 * Guarda configuración del sistema.
 * @param {Object} config
 */
function guardarConfig(config) {
  const actual = obtenerConfig();
  _guardar(KEYS.CONFIG, { ...actual, ...config });
}

/**
 * Tasa de interés mensual configurada por mora (fracción, ej. 0.15 = 15%).
 * @returns {number}
 */
function obtenerTasaInteresMensual() {
  const tasa = Number(obtenerConfig().tasaInteresMensual);
  return Number.isFinite(tasa) && tasa >= 0 ? tasa : (window.Calculos?.TASA_INTERES_MENSUAL ?? 0.15);
}

// =========================================================
// UTILIDADES
// =========================================================

/**
 * Calcula el próximo número de paño para una revendedora.
 * Detecta el máximo actual y suma 1.
 * Si no hay paños, empieza en 1.
 * @param {Array} panosExistentes - paños ya asignados a la revendedora
 * @returns {number}
 */
function calcularNumeroPano(panosExistentes) {
  if (!panosExistentes || panosExistentes.length === 0) return 1;
  const numeros = panosExistentes.map(p => Number(p.numero) || 0);
  return Math.max(...numeros) + 1;
}

/**
 * Genera un id único simple (timestamp + random).
 * @returns {string}
 */
function generarId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Limpia todos los datos (usar con cuidado).
 */
function limpiarTodo() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

// Exportar al scope global (sin módulos ES para compatibilidad)
window.Storage = {
  obtenerRevendedoras,
  guardarRevendedora,
  actualizarRevendedora,
  eliminarRevendedora,
  obtenerRevendedoraPorId,

  obtenerTodosLosPanos,
  obtenerPanosDeRevendedora,
  guardarPano,
  actualizarPano,
  cerrarPano,
  eliminarPano,
  obtenerPanoPorId,
  agregarAdelanto,
  eliminarAdelanto,

  obtenerConfig,
  guardarConfig,
  obtenerTasaInteresMensual,

  actualizarItemPano,

  obtenerTodasLasLiquidaciones,
  obtenerLiquidacionesDeRevendedora,
  guardarLiquidacion,
  actualizarLiquidacion,
  eliminarLiquidacion,
  obtenerLiquidacionPorId,
  calcularSaldoActual,

  obtenerTodasLasLiquidacionesV2,
  obtenerLiquidacionesV2DeRevendedora,
  obtenerLiquidacionV2PorPanoId,
  obtenerLiquidacionV2PorId,
  guardarLiquidacionV2,
  actualizarLiquidacionV2,
  eliminarLiquidacionV2,
  agregarPagoV2,
  actualizarPagoV2,
  eliminarPagoV2,
  calcularSaldoActualV2,
  asegurarLiquidacionV2ParaPano,
  asegurarLiquidacionesV2,
  aplicarReglasPremio,

  obtenerNotificaciones,
  obtenerNotificacionesNoLeidas,
  marcarNotificacionLeida,

  obtenerUsuarios,
  guardarUsuario,
  actualizarUsuario,
  eliminarUsuarioPorRevendedoraId,
  obtenerUsuarioPorUsername,
  obtenerUsuarioPorRevendedoraId,

  obtenerSesion,
  guardarSesion,
  eliminarSesion,

  obtenerTodosLosCierres,
  obtenerCierresDeSucursal,
  obtenerCierresPorFecha,
  guardarCierre,
  actualizarCierre,
  eliminarCierre,
  obtenerCierrePorId,

  obtenerTodasLasSucursales,
  obtenerSucursalPorId,
  obtenerSucursalPorNombre,
  guardarSucursal,
  actualizarSucursal,
  eliminarSucursal,
  obtenerUsuariosDeSucursal,
  inicializarSucursales: _seedSucursalesIniciales,

  obtenerNomenclaturasCustom,
  obtenerNomenclaturasCustomDeCategoria,
  agregarNomenclaturaCustom,
  eliminarNomenclaturaCustom,

  SUCURSALES,
  calcularNumeroPano,
  generarId,
  limpiarTodo,
};
