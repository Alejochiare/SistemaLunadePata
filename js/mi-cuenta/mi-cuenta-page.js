/**
 * mi-cuenta-page.js — Luna de Plata
 * Portal de la revendedora: perfil, paños y liquidaciones.
 * Solo puede marcar artículos como vendidos. Sin acciones de administración.
 */

const _MC_CATS = [
  { key: 'anillos',                   label: 'ANILLOS' },
  { key: 'aros',                      label: 'AROS' },
  { key: 'cadenasConjuntos',          label: 'CADENAS Y CONJUNTOS' },
  { key: 'dijes',                     label: 'DIJES' },
  { key: 'pulseras',                  label: 'PULSERAS' },
  { key: 'accesoriosGoldFabricacion', label: 'ACCESORIOS, GOLD FIELD Y FABRICACIÓN' },
  { key: 'anillosAcero',              label: 'ANILLOS ACERO' },
  { key: 'arosAcero',                 label: 'AROS ACERO' },
  { key: 'cadenasAcero',              label: 'CADENAS Y CONJUNTOS ACERO' },
  { key: 'dijesAcero',                label: 'DIJES ACERO' },
  { key: 'pulserasAcero',             label: 'PULSERAS Y TOBILLERAS ACERO' },
  { key: 'relojes',                   label: 'RELOJES, ABRIDORES CH' },
  { key: 'joyasPersonalizadas',       label: 'JOYAS PERSONALIZADAS' },
  { key: 'maryKay',                   label: 'PRODUCTOS MARY KAY' },
  { key: 'precioFijoArreglos',        label: 'PRECIO FIJO/ARREGLOS/GRABADOS' },
];

const _MC_GRUPOS = [
  { id: 'plata',      label: 'VENTA TOTAL JOYAS PLATA',                          keys: ['anillos', 'aros', 'cadenasConjuntos', 'dijes', 'pulseras'] },
  { id: 'accesorios', label: 'VENTA TOTAL ACCESORIOS, GOLD FIELD Y FABRICACIÓN',  keys: ['accesoriosGoldFabricacion'] },
  { id: 'acero',      label: 'VENTA TOTAL ACERO IONIZADO',                        keys: ['anillosAcero', 'arosAcero', 'cadenasAcero', 'dijesAcero', 'pulserasAcero'] },
  { id: 'relojes',    label: 'TOTAL VENTA RELOJES, ABRIDORES CH Y ORO',           keys: ['relojes'] },
  { id: 'joyasPerso', label: 'TOTAL VENTA JOYAS PERSONALIZADAS',                  keys: ['joyasPersonalizadas'] },
  { id: 'maryKay',    label: 'TOTAL VENTA PRODUCTOS MARY KAY',                    keys: ['maryKay'] },
  { id: 'precioFijo', label: 'TOTAL VENTA PRECIO FIJO/ARREGLOS/GRABADOS',         keys: ['precioFijoArreglos'] },
];

let _mcRevId = null;

function inicializar() {
  const sesion = window.Auth.obtenerSesion();
  if (!sesion || !sesion.revendedoraId) return;
  _mcRevId = sesion.revendedoraId;

  window.Storage.asegurarLiquidacionesV2();
  window.Storage.aplicarReglasPremio();

  _renderPerfil();
  _renderPanos();
  _renderLiquidaciones();

  // Event delegation para acordeón y botón Vendido
  document.getElementById('mc-panos-lista')
    ?.addEventListener('click', _onClickPanos);
}

// =========================================================
// PERFIL
// =========================================================

function _renderPerfil() {
  const rev = window.Storage.obtenerRevendedoraPorId(_mcRevId);
  if (!rev) return;

  const panos = window.Storage.obtenerPanosDeRevendedora(_mcRevId).filter(p => !p.cerrado);
  let vencidos = 0;
  panos.forEach(p => {
    const { estado } = window.Calculos.calcularEstadoVencimiento(p.fechaEntrega, p.diasAdicionales);
    if (estado === 'vencido') vencidos++;
  });

  const iniciales = rev.nombre.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

  const el = document.getElementById('mc-perfil');
  if (!el) return;

  el.innerHTML = `
    <div class="mc-perfil-card">
      <div class="mc-avatar">${_mcEsc(iniciales)}</div>
      <div class="mc-info">
        <h2 class="mc-nombre">${_mcEsc(rev.nombre)}</h2>
        ${rev.localidad ? `<p class="mc-localidad">${_mcEsc(rev.localidad)}</p>` : ''}
        ${rev.telefono  ? `<p class="mc-tel">${_mcEsc(rev.telefono)}</p>`        : ''}
        <div class="mc-stats">
          <div class="mc-stat">
            <div class="mc-stat-val">${panos.length}</div>
            <div class="mc-stat-lbl">Paños</div>
          </div>
          <div class="mc-stat">
            <div class="mc-stat-val ${vencidos > 0 ? 'danger' : ''}">${vencidos}</div>
            <div class="mc-stat-lbl">Vencidos</div>
          </div>
        </div>
      </div>
    </div>`;
}

// =========================================================
// PAÑOS
// =========================================================

function _renderPanos() {
  const el = document.getElementById('mc-panos-lista');
  if (!el) return;

  const panos = window.Storage.obtenerPanosDeRevendedora(_mcRevId)
    .sort((a, b) => {
      // Los paños activos (no cerrados) van primero; dentro de cada grupo, número descendente
      if (a.cerrado !== b.cerrado) return a.cerrado ? 1 : -1;
      return b.numero - a.numero;
    });

  if (panos.length === 0) {
    el.innerHTML = '<p class="mc-empty">No tenés paños asignados aún.</p>';
    return;
  }

  // Expandir el primer paño activo; si todos están cerrados, el primero
  const primerActivo = panos.findIndex(p => !p.cerrado);
  el.innerHTML = panos.map((p, i) => _renderPanoRow(p, i === (primerActivo >= 0 ? primerActivo : 0))).join('');
}

function _renderPanoRow(pano, expandido = false) {
  const { formatearFecha, formatearNumeroPano, calcularEstadoVencimiento, calcularFechaVencimientoEfectiva } = window.Calculos;
  const { estado, diasTranscurridos } = calcularEstadoVencimiento(pano.fechaEntrega, pano.diasAdicionales);
  const fechaVencEfectiva = calcularFechaVencimientoEfectiva(pano.fechaEntrega, pano.diasAdicionales);

  let badge = 'Activo', clsBadge = 'badge-success';
  if (estado === 'vencido')    { badge = 'Vencido';    clsBadge = 'badge-danger'; }
  if (estado === 'por-vencer') { badge = 'Por vencer'; clsBadge = 'badge-warning'; }

  const { vendidos, total } = _contarItems(pano);

  return `
    <div class="pano-row ${expandido ? 'expanded' : ''}" data-pano-id="${pano.id}">
      <div class="pano-row-header">
        <span class="pano-numero">${formatearNumeroPano(pano.numero)}</span>
        <span class="pano-fecha">${formatearFecha(pano.fechaEntrega)}</span>
        <span class="badge ${clsBadge}">${badge}</span>
        ${pano.cerrado ? '<span class="badge badge-gold">Cerrado</span>' : ''}
        <span class="pano-dias">${diasTranscurridos}d</span>
        ${total > 0 ? `<span class="pano-items-progress">${vendidos}/${total} vendidos</span>` : ''}
        <svg class="pano-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="pano-row-body">
        <div id="mc-rf-${pano.id}">
          ${(() => { try { return _renderResumenFinanciero(pano, diasTranscurridos, fechaVencEfectiva); } catch(e) { console.error('[MiCuenta] resumen financiero:', e); return ''; } })()}
        </div>
        <div class="pano-categorias">
          ${_renderCatsPano(pano)}
        </div>
      </div>
    </div>`;
}

function _renderResumenFinanciero(pano, diasTranscurridos, fechaVencEfectiva) {
  const resumen = window.Calculos.calcularResumenPano(pano);
  const { ventaTotal, ventaJoyasPlata, tiers, tierAplicable, gananciaFija } = resumen;
  const tierActual = tiers[tierAplicable];
  const tieneVentas = ventaTotal > 0;

  // Progreso hacia el siguiente tier (basado en ventaTotal)
  const esMaxTier = tierAplicable === 3;
  const tierStartVal = tierAplicable === 0 ? 0 : tiers[tierAplicable - 1].max;
  const tierEndVal   = tiers[tierAplicable].max; // Infinity si max tier
  const faltaParaSiguiente = esMaxTier ? 0 : Math.max(0, tierEndVal - ventaTotal);
  const nextTier = esMaxTier ? null : tiers[tierAplicable + 1];
  const progresoPct = esMaxTier
    ? 100
    : Math.min(100, Math.round((ventaTotal - tierStartVal) / (tierEndVal - tierStartVal) * 100));

  // Ganancia estimada con tier actual
  const gananciaEstimada = Math.round(tierActual.gananciaTotal);

  // Días restantes
  const limiteTotal = window.Calculos.DIAS_VENCIMIENTO + (Number(pano.diasAdicionales) || 0);
  const diasRestantes = Math.max(0, limiteTotal - diasTranscurridos);
  const diasRestantesClass = diasRestantes <= 5 ? 'danger' : diasRestantes <= 10 ? 'warn' : '';

  // Saldo pendiente (si ya hay liquidación)
  let saldoHtml = '';
  const liq = window.Storage.obtenerLiquidacionV2PorPanoId(pano.id);
  if (liq) {
    const tasaMensual = window.Storage.obtenerTasaInteresMensual();
    const saldo = window.Calculos.calcularSaldoLiquidacion(liq, pano, { tasaMensual });
    const saldoClass = saldo > 0 ? 'danger' : saldo < 0 ? 'success' : 'success';
    const saldoTxt   = saldo === 0
      ? 'Al día ✓'
      : saldo > 0 ? `$${_mcFmt(saldo)} debés`
      : `$${_mcFmt(Math.abs(saldo))} a tu favor`;
    saldoHtml = `
      <div class="mc-rf-item">
        <div class="mc-rf-lbl">Saldo pendiente</div>
        <div class="mc-rf-val ${saldoClass}">${saldoTxt}</div>
      </div>`;
  }

  // Barra de progreso hacia siguiente tier
  const progresoHtml = esMaxTier
    ? `<div class="mc-tier-max">🏆 ¡Llegaste al máximo nivel! Tu ganancia en joyas de plata es del <strong>40%</strong>.</div>`
    : `<div class="mc-tier-next-label">
        Ahora ganás el <strong>${tierActual.pctLabel}</strong> de las ventas en joyas de plata.
        ${tieneVentas
          ? `Vendé <strong>$${_mcFmt(faltaParaSiguiente)} más</strong> en total para subir al <strong>${nextTier.pctLabel}</strong> y ganar más en plata.`
          : `Superá <strong>$${_mcFmt(tierEndVal)}</strong> en ventas totales para subir al <strong>${nextTier.pctLabel}</strong>.`
        }
      </div>
      <div class="mc-tier-prog-wrap">
        <div class="mc-tier-prog-bar" style="width:${progresoPct}%"></div>
      </div>
      <div class="mc-tier-prog-meta">
        <span>Vendido: $${_mcFmt(ventaTotal)}</span>
        <span class="mc-tier-prog-next">Meta: $${_mcFmt(tierEndVal)} → ${nextTier.pctLabel} plata</span>
      </div>`;

  return `
    <div class="mc-resumen-financiero">
      <div class="mc-rf-header">
        <div class="mc-rf-tier-badge">
          <div class="mc-rf-tier-pct">${tierActual.pctLabel}</div>
          <div class="mc-rf-tier-badge-sub">joyas de plata</div>
        </div>
        <div class="mc-rf-tier-info">
          <div class="mc-rf-tier-titulo">Tu % de ganancia actual en joyas de plata</div>
          <div class="mc-rf-tier-sub">
            ${tieneVentas
              ? `Vendiste $${_mcFmt(ventaJoyasPlata)} en joyas de plata · $${_mcFmt(ventaTotal)} vendido en total`
              : 'Todavía no hay ventas registradas en este paño'}
          </div>
        </div>
      </div>
      <div class="mc-tier-progreso">
        ${progresoHtml}
      </div>
      <div class="mc-rf-stats">
        <div class="mc-rf-item">
          <div class="mc-rf-lbl">Días restantes</div>
          <div class="mc-rf-val ${diasRestantesClass}">${diasRestantes}d</div>
          <div class="mc-rf-sub">Vence ${window.Calculos.formatearFecha(fechaVencEfectiva)}</div>
        </div>
        ${tieneVentas ? `
        <div class="mc-rf-item">
          <div class="mc-rf-lbl">Tu ganancia estimada</div>
          <div class="mc-rf-val">$${_mcFmt(gananciaEstimada)}</div>
          <div class="mc-rf-sub">Con comisión al ${tierActual.pctLabel}</div>
        </div>` : ''}
        ${saldoHtml}
      </div>
    </div>`;
}

function _renderCatsPano(pano) {
  const cats = pano.categorias || {};

  const tieneItems = _MC_CATS.some(({ key }) => Array.isArray(cats[key]) && cats[key].length > 0);
  if (!tieneItems) {
    return '<p style="color:var(--color-text-muted);font-size:13px;">Sin artículos cargados en este paño. La admin tiene que cargarlos para que puedas registrar tus ventas.</p>';
  }

  let html = '';

  _MC_GRUPOS.forEach(grupo => {
    const catsConItems = grupo.keys
      .map(key => _MC_CATS.find(c => c.key === key))
      .filter(c => c && Array.isArray(cats[c.key]) && cats[c.key].length > 0);

    if (catsConItems.length === 0) return;

    catsConItems.forEach(({ key, label }) => {
      const items = cats[key];
      const subtotal = items.reduce((s, i) => s + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);

      const filas = items.map(item => `
        <tr class="items-fila ${item.vendido ? 'item-vendido' : ''} ${item.pedidoEspecial ? 'item-pedido' : ''}"
            data-pano-id="${pano.id}" data-cat="${key}" data-item-id="${item.id}">
          <td class="item-producto">${_mcEsc(item.producto)}${item.pedidoEspecial ? '<span class="badge badge-info item-pedido-badge" title="Pedido especial: ya lo tenías vendido de palabra">Pedido</span>' : ''}</td>
          <td class="item-desc">${_mcEsc(item.descripcion || '—')}</td>
          <td class="item-precio-val">${item.precioVenta != null ? '$' + _mcFmt(item.precioVenta) : '—'}</td>
          <td class="item-acciones">
            ${pano.cerrado
              ? (item.vendido
                  ? '<span class="badge badge-success">Vendido</span>'
                  : '<span class="badge badge-neutral">No vendido</span>')
              : (item.vendido
                  ? `<span class="badge badge-success">Vendido</span>
                    <button class="btn-devolver btn-mc-cancelar" title="Desmarcar venta">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 4l4 4-4 4"/><path d="M3 12v-1a4 4 0 0 1 4-4h14"/><path d="M7 20l-4-4 4-4"/><path d="M21 12v1a4 4 0 0 1-4 4H3"/></svg>
                    </button>`
                  : '<button class="btn btn-gold btn-sm btn-mc-vender">Vendido</button>')
            }
          </td>
        </tr>`).join('');

      html += `
        <div class="pano-cat-block">
          <div class="pano-cat-titulo">${_mcEsc(label)}</div>
          <table class="items-tabla">${filas}</table>
          <div class="pano-cat-subtotal" id="mc-subtot-${pano.id}-${key}">
            ${subtotal > 0 ? 'Vendido: $' + _mcFmt(subtotal) : ''}
          </div>
        </div>`;
    });

    const grupoTotal = grupo.keys.reduce((sum, key) => {
      const items = cats[key];
      if (!Array.isArray(items)) return sum;
      return sum + items.reduce((s, i) => s + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);
    }, 0);

    html += `
      <div class="pano-grupo-total" id="mc-gtot-${grupo.id}-${pano.id}">
        <span class="gtot-label">${grupo.label}</span>
        <strong class="gtot-valor">$${_mcFmt(grupoTotal)}</strong>
      </div>`;
  });

  return html;
}

// =========================================================
// LIQUIDACIONES
// =========================================================

function _renderLiquidaciones() {
  const el = document.getElementById('mc-liquidaciones-lista');
  if (!el) return;

  const liqs = window.Storage.obtenerLiquidacionesV2DeRevendedora(_mcRevId);

  if (!liqs.length) {
    el.innerHTML = '<p class="mc-empty">Sin liquidaciones registradas aún.</p>';
    return;
  }

  const saldoTotal = window.Storage.calcularSaldoActualV2(_mcRevId);
  const clsSaldo   = saldoTotal > 0 ? 'mc-saldo-debe' : saldoTotal < 0 ? 'mc-saldo-favor' : '';
  const textoSaldo = saldoTotal === 0
    ? 'Sin saldo pendiente'
    : saldoTotal > 0
      ? `Debe $${_mcFmt(saldoTotal)}`
      : `$${_mcFmt(Math.abs(saldoTotal))} a tu favor`;

  const tasaMensual = window.Storage.obtenerTasaInteresMensual();

  const tarjetas = [...liqs].reverse().map(liq => {
    const pano      = window.Storage.obtenerPanoPorId(liq.panoId);
    const panoLabel = pano ? window.Calculos.formatearNumeroPano(pano.numero) : '—';
    const estado    = window.Calculos.calcularEstadoActual(liq, pano, { tasaMensual });
    const saldoPano = estado.saldo;
    const clsS      = saldoPano > 0 ? 'mc-saldo-debe' : saldoPano < 0 ? 'mc-saldo-favor' : '';

    // Mora / penalidad para mostrar bajo el saldo
    const diasDesde = Math.max(0, estado.diasDesdeCierre - window.Calculos.DIAS_GRACIA_INTERES);
    let moraHtml = '';
    if (saldoPano > 0 && diasDesde > 0) {
      moraHtml += `<span class="mc-liq-tag-mora">En mora · ${diasDesde}d con interés (${estado.diasDesdeCierre}d desde entrega)</span>`;
    }
    if (estado.tierPenaltyAplicado) {
      moraHtml += `<span class="mc-liq-tag-mora">Comisión bajada a 25% (+$${_mcFmt(estado.tierPenaltyMonto)})</span>`;
    }

    // Pagos detallados con intereses calculados por fila
    const pagosCalc = window.Calculos.calcularPagosConIntereses(liq, pano, { tasaMensual });

    const filasPagos = pagosCalc.map(p => {
      const entrega   = Number(p.entrega)      || 0;
      const extra     = Number(p.pagoExtra)    || 0;
      const varios    = Number(p.variosMontos) || 0;
      const intereses = Number(p.intereses)    || 0;
      const saldoAcum = Number(p.saldoAcum);
      const clsSaldoFila = saldoAcum > 0 ? 'mc-saldo-debe' : saldoAcum < 0 ? 'mc-saldo-favor' : '';

      const saldoExtra = p.tierPenaltyMonto > 0
        ? `<div class="mc-pago-tag-ajuste">+$${_mcFmt(p.tierPenaltyMonto)} ajuste por mora >7 días</div>`
        : '';

      return `
        <tr class="mc-pago-fila">
          <td>${_mcEsc(window.Calculos.formatearFecha(p.fecha))}</td>
          <td class="col-num">${entrega ? '$' + _mcFmt(entrega) : '—'}</td>
          <td>${_mcEsc(p.variosDesc || '—')}</td>
          <td class="col-num">${varios ? '$' + _mcFmt(varios) : '—'}</td>
          <td class="col-num">${extra ? '$' + _mcFmt(extra) : '—'}</td>
          <td>${_mcEsc(p.detalle || '—')}</td>
          <td class="col-num ${p.cantDias > 0 ? 'mc-mora-num' : ''}">${p.cantDias > 0 ? p.cantDias : '—'}</td>
          <td class="col-num ${intereses > 0 ? 'mc-mora-num' : ''}">${intereses > 0 ? '$' + _mcFmt(intereses) : '—'}</td>
          <td class="col-num ${clsSaldoFila}">
            $${_mcFmt(Math.abs(saldoAcum))}
            ${saldoExtra}
          </td>
        </tr>`;
    }).join('');

    const sinPagos = !pagosCalc.length
      ? '<tr><td colspan="9" class="mc-pago-vacio">Sin pagos registrados aún.</td></tr>'
      : '';

    return `
      <div class="mc-liq-card">
        <div class="mc-liq-card-header">
          <div class="mc-liq-col">
            <div class="mc-liq-col-lbl">Paño</div>
            <div class="mc-liq-col-val">${_mcEsc(panoLabel)}</div>
          </div>
          <div class="mc-liq-col">
            <div class="mc-liq-col-lbl">Fecha entrega</div>
            <div class="mc-liq-col-val">${_mcEsc(window.Calculos.formatearFecha(liq.fechaEntrega))}</div>
          </div>
          <div class="mc-liq-col">
            <div class="mc-liq-col-lbl">Debe a Luna de Plata</div>
            <div class="mc-liq-col-val mc-saldo-debe">$${_mcFmt(liq.montoLunaDePlata || 0)}</div>
          </div>
          <div class="mc-liq-col">
            <div class="mc-liq-col-lbl">Vta total</div>
            <div class="mc-liq-col-val">$${_mcFmt(liq.vtaTotal || 0)}</div>
          </div>
          <div class="mc-liq-col mc-liq-col-saldo">
            <div class="mc-liq-col-lbl">Saldo</div>
            <div class="mc-liq-col-val ${clsS}">$${_mcFmt(Math.abs(saldoPano))}</div>
            ${moraHtml}
          </div>
        </div>
        <div class="mc-tabla-pagos-wrap">
          <table class="mc-pagos-tabla">
            <thead>
              <tr>
                <th>Fecha pago</th>
                <th class="col-num">Entrega</th>
                <th>Varios</th>
                <th class="col-num">Monto V.</th>
                <th class="col-num">Pago extra</th>
                <th>Forma pago</th>
                <th class="col-num">Días mora</th>
                <th class="col-num">Intereses</th>
                <th class="col-num">Saldo</th>
              </tr>
            </thead>
            <tbody>${filasPagos}${sinPagos}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="mc-saldo-banner ${clsSaldo}">
      <span>${textoSaldo}</span>
    </div>
    <div class="mc-liqs-lista">${tarjetas}</div>`;
}

// =========================================================
// ACCIONES
// =========================================================

function _onClickPanos(e) {
  // Acordeón
  const header = e.target.closest('.pano-row-header');
  if (header && !e.target.closest('.btn-mc-vender') && !e.target.closest('.btn-mc-cancelar')) {
    header.closest('.pano-row')?.classList.toggle('expanded');
    return;
  }

  // Marcar vendido
  const btnVender = e.target.closest('.btn-mc-vender');
  if (btnVender) return _actualizarVentaItem(btnVender, true);

  // Cancelar venta / devolver
  const btnCancelar = e.target.closest('.btn-mc-cancelar');
  if (btnCancelar) return _actualizarVentaItem(btnCancelar, false);
}

function _actualizarVentaItem(btn, vendido) {
  const tr = btn.closest('.items-fila');
  if (!tr) return;

  const panoId = tr.dataset.panoId;
  const catKey = tr.dataset.cat;
  const itemId = tr.dataset.itemId;

  const panoActual = window.Storage.obtenerPanoPorId(panoId);
  if (panoActual?.cerrado) return;

  const panoActualizado = window.Storage.actualizarItemPano(panoId, catKey, itemId, {
    vendido,
    fechaVenta: vendido ? new Date().toISOString().split('T')[0] : null,
  });

  tr.classList.toggle('item-vendido', vendido);
  const tdAcc = tr.querySelector('.item-acciones');
  if (tdAcc) {
    tdAcc.innerHTML = vendido
      ? `<span class="badge badge-success">Vendido</span>
        <button class="btn-devolver btn-mc-cancelar" title="Desmarcar venta">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 4l4 4-4 4"/><path d="M3 12v-1a4 4 0 0 1 4-4h14"/><path d="M7 20l-4-4 4-4"/><path d="M21 12v1a4 4 0 0 1-4 4H3"/></svg>
        </button>`
      : '<button class="btn btn-gold btn-sm btn-mc-vender">Vendido</button>';
  }

  if (panoActualizado) {
    // Actualizar subtotal
    const items = panoActualizado.categorias?.[catKey];
    if (Array.isArray(items)) {
      const sub = items.reduce((s, i) => s + (i.vendido ? (Number(i.precioVenta) || 0) : 0), 0);
      const subEl = document.getElementById(`mc-subtot-${panoId}-${catKey}`);
      if (subEl) subEl.textContent = sub > 0 ? `Vendido: $${_mcFmt(sub)}` : '';
    }

    // Actualizar total del grupo
    const grupo = _MC_GRUPOS.find(g => g.keys.includes(catKey));
    if (grupo) {
      const elGtot = document.getElementById(`mc-gtot-${grupo.id}-${panoId}`);
      if (elGtot) {
        const grupoTotal = grupo.keys.reduce((sum, k) => {
          const its = panoActualizado.categorias?.[k];
          if (!Array.isArray(its)) return sum;
          return sum + its.reduce((s, i) => s + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);
        }, 0);
        const valEl = elGtot.querySelector('.gtot-valor');
        if (valEl) valEl.textContent = '$' + _mcFmt(grupoTotal);
      }
    }

    // Actualizar progreso en el header
    const { vendidos, total } = _contarItems(panoActualizado);
    const panoRow = tr.closest('.pano-row');
    const progEl = panoRow?.querySelector('.pano-items-progress');
    if (progEl) progEl.textContent = `${vendidos}/${total} vendidos`;

    // Actualizar resumen financiero en vivo (% comisión, barra de progreso, ganancia)
    const rfEl = document.getElementById(`mc-rf-${panoId}`);
    if (rfEl) {
      try {
        const { calcularFechaVencimientoEfectiva } = window.Calculos;
        const fechaVenc = calcularFechaVencimientoEfectiva(panoActualizado.fechaEntrega, panoActualizado.diasAdicionales);
        const diasTrans = Math.floor((new Date() - new Date(panoActualizado.fechaEntrega)) / 86400000);
        rfEl.innerHTML = _renderResumenFinanciero(panoActualizado, diasTrans, fechaVenc);
      } catch (e) { /* mantiene el contenido anterior */ }
    }
  }
}

// =========================================================
// UTILIDADES
// =========================================================

function _contarItems(pano) {
  let vendidos = 0, total = 0;
  Object.values(pano.categorias || {}).forEach(v => {
    if (Array.isArray(v)) {
      total   += v.length;
      vendidos += v.filter(i => i.vendido).length;
    }
  });
  return { vendidos, total };
}

function _mcFmt(n) {
  return new Intl.NumberFormat('es-AR').format(Math.round(n));
}

function _mcEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.MiCuenta = { inicializar };
