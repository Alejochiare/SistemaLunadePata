/**
 * liquidaciones-page.js v2 — Luna de Plata
 * Liquidaciones agrupadas por paño, con pagos múltiples.
 */

// =========================================================
// ESTADO
// =========================================================

let _editLiqId  = null;
let _pagoLiqId  = null;
let _pagoPagoId = null;

// =========================================================
// INICIALIZACIÓN
// =========================================================

function initLiquidaciones() {
  let _debugMsg = '';

  try {
    window.Storage.asegurarLiquidacionesV2();
    window.Storage.aplicarReglasPremio();
  } catch (err) {
    console.error('[Liquidaciones] Error aplicando reglas automáticas:', err);
    _debugMsg += `<div style="color:#c0392b;background:#fdecea;padding:10px;border:1px solid #c0392b;margin-bottom:10px;white-space:pre-wrap;font-family:monospace;font-size:12px;">ERROR (reglas premio): ${_esc(err.message)}\n${_esc(err.stack || '')}</div>`;
  }

  window.FormatoNumero?.attachInputsMiles('.input-miles');

  try {
    _renderConfig();
    renderStats();
    renderGrupos();
    renderNotificaciones();
  } catch (err) {
    console.error('[Liquidaciones] Error renderizando la página:', err);
    _debugMsg += `<div style="color:#c0392b;background:#fdecea;padding:10px;border:1px solid #c0392b;margin-bottom:10px;white-space:pre-wrap;font-family:monospace;font-size:12px;">ERROR (render): ${_esc(err.message)}\n${_esc(err.stack || '')}</div>`;
  }

  if (_debugMsg) {
    document.getElementById('liq-grupos')?.insertAdjacentHTML('afterbegin', _debugMsg);
  }

  ['modal-liq-edit', 'modal-pago'].forEach(mId => {
    document.getElementById(mId)?.addEventListener('click', e => {
      if (e.target.id === mId) {
        mId === 'modal-liq-edit' ? cerrarModalLiq() : cerrarModalPago();
      }
    });
  });

  document.addEventListener('click', e => {
    const wrap = document.getElementById('notif-bell')?.closest('.notif-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('notif-panel')?.classList.remove('open');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarModalLiq(); cerrarModalPago(); }
  });

  document.getElementById('liq-edit-vta-total')?.addEventListener('input', _togglePremioWrap);
  document.getElementById('pago-detalle')?.addEventListener('change', _onPagoDetalleChange);
  ['pago-efectivo-20000','pago-efectivo-10000','pago-efectivo-2000','pago-efectivo-1000','pago-efectivo-500',
   'pago-efectivo-200','pago-efectivo-100','pago-efectivo-50']
    .forEach(id => document.getElementById(id)?.addEventListener('input', _actualizarEfectivo));
  document.getElementById('pago-fecha')?.addEventListener('change', _autoIntereses);
  ['pago-entrega','pago-varios-monto','pago-pago-extra','pago-intereses']
    .forEach(id => document.getElementById(id)?.addEventListener('input', _actualizarPreview));
}

// =========================================================
// STATS
// =========================================================

function renderStats() {
  const revs = window.Storage.obtenerRevendedoras();
  let conSaldo = 0, enMora = 0, totalSaldo = 0;

  revs.forEach(rev => {
    const saldo = window.Storage.calcularSaldoActualV2(rev.id);
    if (saldo > 0) conSaldo++;
    totalSaldo += saldo;

    if (saldo > 0) {
      const liqs = window.Storage.obtenerLiquidacionesV2DeRevendedora(rev.id);
      const hayMora = liqs.some(liq => {
        const pano = window.Storage.obtenerPanoPorId(liq.panoId);
        if (!pano || !liq.fechaEntrega) return false;
        const diasDesdeCierre = window.Calculos.calcularDias(liq.fechaEntrega);
        return diasDesdeCierre > window.Calculos.DIAS_GRACIA_INTERES && _calcularSaldoLiq(liq) > 0;
      });
      if (hayMora) enMora++;
    }
  });

  _setInner('stat-con-saldo', conSaldo);
  _setInner('stat-en-mora', enMora);
  _setInner('stat-total-saldo', _formatPesos(Math.round(totalSaldo)));
}

// =========================================================
// RENDER GRUPOS
// =========================================================

function renderGrupos() {
  const contenedor = document.getElementById('liq-grupos');
  if (!contenedor) return;

  const revs = window.Storage.obtenerRevendedoras();
  contenedor.innerHTML = '';

  if (!revs.length) {
    contenedor.innerHTML = `
      <div class="liq-global-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <p>No hay revendedoras registradas</p>
        <small>Agregá una revendedora en la sección Revendedoras.</small>
      </div>`;
    return;
  }

  revs.forEach(rev => {
    try {
      contenedor.appendChild(_buildGrupo(rev));
    } catch (err) {
      console.error(`[Liquidaciones] Error renderizando a "${rev.nombre}":`, err);
      const errDiv = document.createElement('div');
      errDiv.className = 'liq-global-empty';
      errDiv.innerHTML = `<p style="color:var(--color-danger);">Error cargando liquidaciones de ${_esc(rev.nombre)}.</p><small>${_esc(err.message)}</small>`;
      contenedor.appendChild(errDiv);
    }
  });
}

function _buildGrupo(rev) {
  const liqs  = window.Storage.obtenerLiquidacionesV2DeRevendedora(rev.id);
  const saldo = Math.round(window.Storage.calcularSaldoActualV2(rev.id));
  const saldoClass = saldo > 0 ? 'saldo-positivo' : 'saldo-cero';
  const saldoTxt   = saldo <= 0 ? 'Al día'
    : `Debe ${_formatPesos(saldo)}`;

  const div = document.createElement('div');
  div.className = 'liq-group';
  div.id = `liq-group-${rev.id}`;
  div.innerHTML = `
    <div class="liq-group-header" onclick="toggleGrupo('${rev.id}')">
      <span class="liq-group-name">${_esc(rev.nombre)}</span>
      <span class="liq-group-saldo ${saldoClass}" id="liq-saldo-${rev.id}">${saldoTxt}</span>
      <svg class="liq-group-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <div class="liq-group-body" id="liq-body-${rev.id}">
      <div class="liq-panos-list" id="liq-list-${rev.id}">
        ${_buildLiqList(rev.id, liqs)}
      </div>
    </div>`;
  return div;
}

function _buildLiqList(revId, liqs) {
  if (!liqs.length) {
    return '<div class="liq-empty-msg">Sin liquidaciones. Se crean automáticamente al cerrar un paño.</div>';
  }
  return liqs.map(liq => _buildPanoCard(revId, liq)).join('');
}

function _buildPanoCard(revId, liq) {
  const pano      = window.Storage.obtenerPanoPorId(liq.panoId);
  const panoLabel = pano ? window.Calculos.formatearNumeroPano(pano.numero) : '—';
  const estado    = window.Calculos.calcularEstadoActual(liq, pano, { tasaMensual: _tasaActual() });
  const saldo     = Math.round(estado.saldo);
  const saldoClass = saldo > 0 ? 'saldo-positivo' : 'saldo-cero';
  const saldoTxt   = saldo <= 0 ? 'Al día'
    : _formatPesos(saldo);

  const moraInfo = (() => {
    const partes = [];
    if (saldo > 0 && estado.diasDesdeCierre > window.Calculos.DIAS_GRACIA_INTERES) {
      const diasInteres = estado.diasDesdeCierre - window.Calculos.DIAS_GRACIA_INTERES;
      partes.push(`En mora · ${diasInteres} día${diasInteres !== 1 ? 's' : ''} con interés (${estado.diasDesdeCierre}d desde entrega)`);
    }
    if (estado.tierPenaltyAplicado) {
      partes.push(`Comisión bajada a 25% (+${_formatPesos(estado.tierPenaltyMonto)})`);
    }
    return partes.length ? `<div class="liq-pano-mora-info">${partes.join(' · ')}</div>` : '';
  })();

  const premioHtml = liq.premio
    ? `<span class="liq-pano-premio">${_esc(liq.premio)}${liq.premioFecha ? ' · ' + _formatFecha(liq.premioFecha) : ''}</span>`
    : '';

  return `
    <div class="liq-pano-card" id="liq-pano-card-${liq.id}">
      <div class="liq-pano-header" onclick="togglePanoLiq('${liq.id}')">
        <div class="liq-pano-col">
          <div class="liq-pano-info-lbl">Paño</div>
          <div class="liq-pano-info-val">${_esc(panoLabel)}</div>
        </div>
        <div class="liq-pano-col">
          <div class="liq-pano-info-lbl">Fecha entrega</div>
          <div class="liq-pano-info-val liq-fecha-txt">${_formatFecha(liq.fechaEntrega)}</div>
        </div>
        <div class="liq-pano-col">
          <div class="liq-pano-info-lbl">Debe a Luna de Plata</div>
          <div class="liq-pano-info-val liq-debe-val">${_formatPesos(liq.montoLunaDePlata)}</div>
        </div>
        <div class="liq-pano-col">
          <div class="liq-pano-info-lbl">Vta total</div>
          <div class="liq-pano-info-val">${_formatPesos(liq.vtaTotal)}</div>
        </div>
        <div class="liq-pano-col">
          <div class="liq-pano-info-lbl">Círculo</div>
          <div>${_circuloBadge(liq.circulo)}</div>
        </div>
        <div class="liq-pano-col">
          <div class="liq-pano-info-lbl">Saldo</div>
          <div class="liq-pano-info-val ${saldoClass}" id="liq-saldo-pano-${liq.id}">${saldoTxt}</div>
          ${moraInfo}
        </div>
        ${premioHtml}
        <div class="liq-pano-acciones" onclick="event.stopPropagation()">
          <button class="btn btn-gold btn-sm" title="Agregar pago" onclick="abrirModalNuevoPago('${liq.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Pago
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" title="Editar liquidación" onclick="abrirModalEditarLiq('${liq.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-danger-ghost btn-icon btn-sm" title="Eliminar liquidación" onclick="eliminarLiqConfirm('${liq.id}', '${revId}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
        <svg class="liq-pano-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="liq-pano-body" id="liq-pano-body-${liq.id}">
        ${_buildPagosBody(liq)}
      </div>
    </div>`;
}

function _buildPagosBody(liq) {
  const pano  = window.Storage.obtenerPanoPorId(liq.panoId);
  const pagos = liq.pagos || [];

  if (!pagos.length) {
    return '<div class="liq-pagos-empty">Sin pagos registrados. Usá el botón <strong>+ Pago</strong> para registrar un cobro.</div>';
  }

  const pagosCalc = window.Calculos.calcularPagosConIntereses(liq, pano, { tasaMensual: _tasaActual() });

  const rows = pagosCalc.map(p => {
    const variosM    = Number(p.variosMontos) || 0;
    const intereses  = p.intereses;
    const entrega    = Number(p.entrega) || 0;
    const pagoExtra  = Number(p.pagoExtra) || 0;
    const cantDias   = p.cantDias;
    const saldoRnd   = Math.round(p.saldoAcum);
    const saldoClass = saldoRnd > 0 ? 'saldo-positivo' : 'saldo-cero';
    const saldoTxt   = saldoRnd <= 0
      ? (saldoRnd < 0 ? `A favor ${_formatPesos(Math.abs(saldoRnd))}` : 'Al día')
      : _formatPesos(saldoRnd);
    const saldoExtra = p.tierPenaltyMonto > 0
      ? `<div style="font-size:10px;color:var(--color-text-muted);">+${_formatPesos(p.tierPenaltyMonto)} ajuste por mora &gt;7 días</div>`
      : '';

    const esAdelanto = !!p._esAdelanto;

    const detalleText = (() => {
      if (esAdelanto) return `<span class="liq-adelanto-badge">Adelanto previo</span> ${_esc(p.detalle || '')}`;
      const base = _esc(p.detalle || '—');
      if ((p.detalle === 'Efectivo' || p.detalle === 'Mixto') && p.efectivo?.total > 0) {
        return `${base} <span style="color:var(--color-text-muted);font-size:11px">(${_formatPesos(p.efectivo.total)})</span>`;
      }
      return base;
    })();

    const acciones = esAdelanto
      ? '<td class="col-acciones">—</td>'
      : `<td class="col-acciones">
          <button class="btn btn-ghost btn-icon btn-sm" title="Editar" onclick="abrirModalEditarPago('${liq.id}', '${p.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-danger-ghost btn-icon btn-sm" title="Eliminar" onclick="eliminarPagoConfirm('${liq.id}', '${p.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </td>`;

    return `<tr class="${esAdelanto ? 'liq-fila-adelanto' : ''}">
      <td class="col-fecha">${_formatFecha(p.fecha)}</td>
      <td class="col-num">${entrega   ? _formatPesos(entrega)   : '—'}</td>
      <td>${_esc(p.variosDesc || '—')}</td>
      <td class="col-num">${variosM   ? _formatPesos(variosM)   : '—'}</td>
      <td class="col-num">${pagoExtra ? _formatPesos(pagoExtra) : '—'}</td>
      <td>${detalleText}</td>
      <td class="col-num ${cantDias > 0 ? 'mora-dias' : ''}">${cantDias > 0 ? cantDias : '—'}</td>
      <td class="col-num ${intereses > 0 ? 'saldo-positivo' : ''}">${intereses > 0 ? _formatPesos(intereses) : '—'}</td>
      <td class="col-num ${saldoClass}">${saldoTxt}${saldoExtra}</td>
      ${acciones}
    </tr>`;
  }).join('');

  return `
    <div class="liq-pagos-table-wrap">
      <table class="liq-pagos-table">
        <thead><tr>
          <th>Fecha pago</th>
          <th class="col-num">Entrega</th>
          <th>Varios</th>
          <th class="col-num">Monto V.</th>
          <th class="col-num">Pago extra</th>
          <th>Forma pago</th>
          <th class="col-num">Días mora</th>
          <th class="col-num">Intereses</th>
          <th class="col-num">Saldo</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// =========================================================
// TOGGLE ACORDEÓN
// =========================================================

function toggleGrupo(revId) {
  const header = document.querySelector(`#liq-group-${revId} .liq-group-header`);
  const body   = document.getElementById(`liq-body-${revId}`);
  if (!header || !body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  header.classList.toggle('open', !isOpen);
}

function togglePanoLiq(liqId) {
  const card = document.getElementById(`liq-pano-card-${liqId}`);
  if (card) card.classList.toggle('expanded');
}

// =========================================================
// MODAL — EDITAR LIQUIDACIÓN
// =========================================================

function abrirModalEditarLiq(liqId) {
  const liq = window.Storage.obtenerLiquidacionV2PorId(liqId);
  if (!liq) return;
  _editLiqId = liqId;

  const pano = window.Storage.obtenerPanoPorId(liq.panoId);
  const panoLabel = pano ? window.Calculos.formatearNumeroPano(pano.numero) : '—';
  const titulo = document.getElementById('modal-liq-edit-titulo');
  if (titulo) titulo.textContent = `Liquidación — ${panoLabel}`;

  _setVal('liq-edit-monto',        liq.montoLunaDePlata ?? '');
  _setVal('liq-edit-vta-total',    liq.vtaTotal         ?? '');
  _setVal('liq-edit-circulo',      liq.circulo          || '');
  _setVal('liq-edit-fecha-entrega',liq.fechaEntrega     || '');
  _setVal('liq-edit-premio',       liq.premio           || '');
  _setVal('liq-edit-premio-fecha', liq.premioFecha      || '');

  _togglePremioWrap();

  document.getElementById('modal-liq-edit')?.classList.add('open');
}

function cerrarModalLiq() {
  document.getElementById('modal-liq-edit')?.classList.remove('open');
  _editLiqId = null;
}

function _togglePremioWrap() {
  const elegible = _numVal('liq-edit-vta-total') > PREMIO_VTA_MIN;
  const wrap = document.getElementById('liq-edit-premio-wrap');
  if (wrap) wrap.style.display = elegible ? '' : 'none';
}

function guardarLiquidacion() {
  if (!_editLiqId) return;

  const liqActual = window.Storage.obtenerLiquidacionV2PorId(_editLiqId);
  const vtaTotal = _numVal('liq-edit-vta-total');
  const elegiblePremio = vtaTotal > PREMIO_VTA_MIN;
  const premioVal = elegiblePremio ? (document.getElementById('liq-edit-premio')?.value.trim() || '') : '';

  let premioEstado = liqActual?.premioEstado;
  if (!elegiblePremio) premioEstado = undefined;
  else if (premioVal) premioEstado = 'otorgado';
  else if (premioEstado === 'otorgado' || !premioEstado) premioEstado = 'pendiente';
  // si premioEstado === 'perdido' y no carga premio, se mantiene 'perdido'

  const cambios = {
    montoLunaDePlata: _numVal('liq-edit-monto'),
    vtaTotal,
    circulo:          document.getElementById('liq-edit-circulo')?.value       || '',
    premio:           premioVal,
    premioFecha:      elegiblePremio ? (document.getElementById('liq-edit-premio-fecha')?.value  || '') : '',
    premioEstado,
  };
  const fechaEntregaInput = document.getElementById('liq-edit-fecha-entrega')?.value || '';
  if (fechaEntregaInput) cambios.fechaEntrega = fechaEntregaInput;

  const liq = window.Storage.actualizarLiquidacionV2(_editLiqId, cambios);

  if (!liq) return;
  window.Storage.aplicarReglasPremio();
  window.UI?.mostrarToast('Liquidación actualizada', 'success');
  cerrarModalLiq();
  _refrescarGrupo(liq.revendedoraId);
  renderStats();
  renderNotificaciones();
}

// =========================================================
// NOTIFICACIONES
// =========================================================

function renderNotificaciones() {
  const noLeidas = window.Storage.obtenerNotificacionesNoLeidas()
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));

  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = noLeidas.length;
    badge.style.display = noLeidas.length ? '' : 'none';
  }
  const list = document.getElementById('notif-panel-list');
  if (!list) return;
  list.innerHTML = noLeidas.length
    ? noLeidas.map(_buildNotifItem).join('')
    : '<div class="notif-empty">Sin notificaciones</div>';
}

function _buildNotifItem(n) {
  const rev  = window.Storage.obtenerRevendedoraPorId(n.revendedoraId);
  const pano = window.Storage.obtenerPanoPorId(n.panoId);
  const panoLabel = pano ? window.Calculos.formatearNumeroPano(pano.numero) : '—';
  const nombre = rev ? _esc(rev.nombre) : '—';

  let icono = '🔔', mensaje = '';
  if (n.tipo === 'premio_elegible') {
    icono = '🎁';
    mensaje = `${nombre} vendió ${_formatPesos(n.datos?.vtaTotal)} en el Paño ${panoLabel} (más de $2.000.000). Podés asignarle un premio.`;
  } else if (n.tipo === 'premio_sugerido') {
    icono = '🎉';
    mensaje = `${nombre} pagó todo a tiempo en el Paño ${panoLabel}. ¿Le das el premio?`;
  } else if (n.tipo === 'premio_perdido') {
    icono = '⚠️';
    mensaje = n.datos?.teniaPremio
      ? `Se eliminó el premio de ${nombre} (Paño ${panoLabel}) por no pagar a tiempo.`
      : `${nombre} no pagó a tiempo el Paño ${panoLabel} y perdió la opción de premio.`;
  }

  return `
    <div class="notif-item notif-${n.tipo}" onclick="window.LiqPage.irANotificacion('${n.id}')">
      <span class="notif-item-icon">${icono}</span>
      <div class="notif-item-body"><div class="notif-item-msg">${mensaje}</div></div>
      <button class="notif-item-dismiss" title="Descartar" onclick="event.stopPropagation(); window.LiqPage.descartarNotificacion('${n.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
}

function toggleNotifPanel() {
  document.getElementById('notif-panel')?.classList.toggle('open');
}

function irANotificacion(notifId) {
  const notif = window.Storage.obtenerNotificaciones().find(n => n.id === notifId);
  if (!notif) return;

  window.Storage.marcarNotificacionLeida(notifId);
  renderNotificaciones();
  document.getElementById('notif-panel')?.classList.remove('open');

  const body = document.getElementById(`liq-body-${notif.revendedoraId}`);
  if (body && !body.classList.contains('open')) toggleGrupo(notif.revendedoraId);

  const card = document.getElementById(`liq-pano-card-${notif.liqId}`);
  if (card) {
    if (!card.classList.contains('expanded')) togglePanoLiq(notif.liqId);
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  if (notif.tipo === 'premio_elegible' || notif.tipo === 'premio_sugerido') {
    setTimeout(() => abrirModalEditarLiq(notif.liqId), 250);
  }
}

function descartarNotificacion(notifId) {
  window.Storage.marcarNotificacionLeida(notifId);
  renderNotificaciones();
}

// =========================================================
// MODAL — NUEVO / EDITAR PAGO
// =========================================================

function abrirModalNuevoPago(liqId) {
  const liq  = window.Storage.obtenerLiquidacionV2PorId(liqId);
  const pano = liq ? window.Storage.obtenerPanoPorId(liq.panoId) : null;
  const panoLabel = pano ? window.Calculos.formatearNumeroPano(pano.numero) : '—';

  _pagoLiqId  = liqId;
  _pagoPagoId = null;

  const titulo = document.getElementById('modal-pago-titulo');
  if (titulo) titulo.textContent = `Agregar Pago — ${panoLabel}`;

  document.getElementById('form-pago')?.reset();
  _setVal('pago-fecha', new Date().toISOString().split('T')[0]);

  _onPagoDetalleChange();
  _autoIntereses();
  document.getElementById('modal-pago')?.classList.add('open');
}

function abrirModalEditarPago(liqId, pagoId) {
  const liq = window.Storage.obtenerLiquidacionV2PorId(liqId);
  if (!liq) return;
  const pago = (liq.pagos || []).find(p => p.id === pagoId);
  if (!pago) return;

  _pagoLiqId  = liqId;
  _pagoPagoId = pagoId;

  const pano = window.Storage.obtenerPanoPorId(liq.panoId);
  const panoLabel = pano ? window.Calculos.formatearNumeroPano(pano.numero) : '—';

  const titulo = document.getElementById('modal-pago-titulo');
  if (titulo) titulo.textContent = `Editar Pago — ${panoLabel}`;

  document.getElementById('form-pago')?.reset();

  _setVal('pago-fecha',        pago.fecha        || '');
  _setVal('pago-entrega',      pago.entrega      || '');
  _setVal('pago-varios-desc',  pago.variosDesc   || '');
  _setVal('pago-varios-monto', pago.variosMontos || '');
  _setVal('pago-pago-extra',   pago.pagoExtra    || '');
  _setVal('pago-detalle',      pago.detalle      || '');

  if (pago.efectivo?.billetes) {
    Object.entries(pago.efectivo.billetes).forEach(([v, c]) => {
      if (c) _setVal(`pago-efectivo-${v}`, c);
    });
    _setVal('pago-efectivo-total', pago.efectivo.total || '');
  }

  _onPagoDetalleChange();
  _autoIntereses();
  document.getElementById('modal-pago')?.classList.add('open');
}

function cerrarModalPago() {
  document.getElementById('modal-pago')?.classList.remove('open');
  _pagoLiqId  = null;
  _pagoPagoId = null;
}

function guardarPago() {
  if (!_pagoLiqId) return;

  const fecha = document.getElementById('pago-fecha')?.value || '';
  if (!fecha) {
    document.getElementById('pago-fecha')?.classList.add('input-error');
    return;
  }

  const datos = {
    fecha,
    entrega:      _numVal('pago-entrega'),
    variosDesc:   document.getElementById('pago-varios-desc')?.value.trim() || '',
    variosMontos: _numVal('pago-varios-monto'),
    pagoExtra:    _numVal('pago-pago-extra'),
    detalle:      document.getElementById('pago-detalle')?.value || '',
    intereses:    _numVal('pago-intereses'),
    efectivo: {
      billetes: {
        20000: _numVal('pago-efectivo-20000'),
        10000: _numVal('pago-efectivo-10000'),
        2000: _numVal('pago-efectivo-2000'),
        1000: _numVal('pago-efectivo-1000'),
        500:  _numVal('pago-efectivo-500'),
        200:  _numVal('pago-efectivo-200'),
        100:  _numVal('pago-efectivo-100'),
        50:   _numVal('pago-efectivo-50'),
      },
      total: _calcTotalEfectivo(),
    },
  };

  let revId;
  if (_pagoPagoId) {
    const liq = window.Storage.actualizarPagoV2(_pagoLiqId, _pagoPagoId, datos);
    revId = liq?.revendedoraId;
  } else {
    const result = window.Storage.agregarPagoV2(_pagoLiqId, datos);
    revId = result?.liq?.revendedoraId;
  }

  window.UI?.mostrarToast('Pago guardado', 'success');
  cerrarModalPago();
  if (revId) { _refrescarGrupo(revId); renderStats(); }
}

// =========================================================
// ELIMINAR
// =========================================================

function eliminarLiqConfirm(liqId, revId) {
  if (!confirm('¿Eliminar esta liquidación y todos sus pagos?')) return;
  window.Storage.eliminarLiquidacionV2(liqId);
  window.UI?.mostrarToast('Liquidación eliminada', 'success');
  _refrescarGrupo(revId);
  renderStats();
}

function eliminarPagoConfirm(liqId, pagoId) {
  if (!confirm('¿Eliminar este pago?')) return;
  const liq = window.Storage.eliminarPagoV2(liqId, pagoId);
  window.UI?.mostrarToast('Pago eliminado', 'success');
  if (liq) { _refrescarGrupo(liq.revendedoraId); renderStats(); }
}

// =========================================================
// EVENTOS DEL MODAL DE PAGO
// =========================================================

function _onPagoDetalleChange() {
  const tipo    = document.getElementById('pago-detalle')?.value;
  const mostrar = tipo === 'Efectivo' || tipo === 'Mixto';
  document.querySelectorAll('[data-pago-cash]').forEach(el => {
    el.style.display = mostrar ? '' : 'none';
  });
  if (!mostrar) {
    ['pago-efectivo-20000','pago-efectivo-10000','pago-efectivo-2000','pago-efectivo-1000','pago-efectivo-500',
     'pago-efectivo-200','pago-efectivo-100','pago-efectivo-50','pago-efectivo-total']
      .forEach(id => _setVal(id, ''));
  }
  _actualizarEfectivo();
  _actualizarPreview();
}

function _actualizarEfectivo() {
  const total = _calcTotalEfectivo();
  _setVal('pago-efectivo-total', total || '');
  const tipo = document.getElementById('pago-detalle')?.value;
  if (tipo === 'Efectivo') _setVal('pago-entrega', total || '');
  _actualizarPreview();
}

function _calcTotalEfectivo() {
  return [20000, 10000, 2000, 1000, 500, 200, 100, 50]
    .reduce((s, v) => s + (_numVal(`pago-efectivo-${v}`) * v), 0);
}

function _autoIntereses() {
  if (!_pagoLiqId) return;
  const liq  = window.Storage.obtenerLiquidacionV2PorId(_pagoLiqId);
  if (!liq) return;
  const pano = window.Storage.obtenerPanoPorId(liq.panoId);
  if (!pano) return;

  const fechaPago = document.getElementById('pago-fecha')?.value || '';
  if (!fechaPago) return;

  const saldoPrev = _calcularSaldoLiqHasta(liq, _pagoPagoId, fechaPago);
  if (saldoPrev <= 0) { _setVal('pago-intereses', '0'); _actualizarPreview(); return; }

  const pagos = liq.pagos || [];
  const idx = _pagoPagoId ? pagos.findIndex(p => p.id === _pagoPagoId) : pagos.length;
  const fechaRef = _fechaReferenciaPago(pagos, idx < 0 ? pagos.length : idx, liq);

  const { intereses } = window.Calculos.calcularMoraEIntereses(fechaRef, fechaPago, saldoPrev, _tasaActual());
  _setVal('pago-intereses', Math.round(intereses * 100) / 100);
  _actualizarPreview();
}

function _actualizarPreview() {
  if (!_pagoLiqId) return;
  const liq = window.Storage.obtenerLiquidacionV2PorId(_pagoLiqId);
  if (!liq) return;

  const fechaPago  = document.getElementById('pago-fecha')?.value || '';
  const saldoPrev  = _calcularSaldoLiqHasta(liq, _pagoPagoId, fechaPago);
  const entrega    = _numVal('pago-entrega');
  const variosM    = _numVal('pago-varios-monto');
  const pagoExtra  = _numVal('pago-pago-extra');
  const intereses  = _numVal('pago-intereses');
  const saldoNuevo = saldoPrev + variosM + intereses - entrega - pagoExtra;

  const elPrev  = document.getElementById('preview-saldo-previo');
  const elNuevo = document.getElementById('preview-saldo-nuevo');
  if (elPrev)  elPrev.textContent  = _formatPesos(saldoPrev + intereses);
  if (elNuevo) {
    elNuevo.textContent = _formatPesos(Math.round(saldoNuevo * 100) / 100);
    elNuevo.className   = 'liq-saldo-nuevo' + (saldoNuevo > 0 ? ' en-mora' : '');
  }
}

// =========================================================
// REFRESH PARCIAL
// =========================================================

function _refrescarGrupo(revId) {
  const rev = window.Storage.obtenerRevendedoraPorId(revId);
  if (!rev) return;

  const liqs  = window.Storage.obtenerLiquidacionesV2DeRevendedora(revId);
  const saldo = Math.round(window.Storage.calcularSaldoActualV2(revId));

  const saldoClass = saldo > 0 ? 'saldo-positivo' : 'saldo-cero';
  const saldoTxt   = saldo <= 0 ? 'Al día'
    : `Debe ${_formatPesos(saldo)}`;

  const elSaldo = document.getElementById(`liq-saldo-${revId}`);
  if (elSaldo) { elSaldo.textContent = saldoTxt; elSaldo.className = `liq-group-saldo ${saldoClass}`; }

  const list = document.getElementById(`liq-list-${revId}`);
  if (list) list.innerHTML = _buildLiqList(revId, liqs);
}

// =========================================================
// CONFIGURACIÓN
// =========================================================

function _renderConfig() {
  const cfg = window.Storage.obtenerConfig();
  const tasaPct = Math.round((Number(cfg.tasaInteresMensual) || 0) * 1000) / 10; // 0.15 -> 15
  _setVal('config-tasa-interes', tasaPct);
}

function guardarConfig() {
  const pct  = _numVal('config-tasa-interes');
  const tasa = Math.round((pct / 100) * 10000) / 10000; // 15 -> 0.15
  window.Storage.guardarConfig({ tasaInteresMensual: tasa });
  window.UI?.mostrarToast('Configuración guardada', 'success');
  renderStats();
  renderGrupos();
}

function _tasaActual() {
  return window.Storage.obtenerTasaInteresMensual();
}

// =========================================================
// CÁLCULOS INTERNOS
// =========================================================

function _calcularSaldoLiq(liq) {
  const pano = window.Storage.obtenerPanoPorId(liq.panoId);
  return window.Calculos.calcularSaldoLiquidacion(liq, pano, { tasaMensual: _tasaActual() });
}

/**
 * Saldo previo al pago que se está agregando/editando (excluyéndolo si ya
 * existe). Si el pago nuevo es el primero en superar DIAS_PENALIDAD_TIER
 * desde el cierre y aún no se aplicó la penalización de tier en pagos
 * anteriores, se incluye acá para que la previsualización sea correcta.
 */
function _calcularSaldoLiqHasta(liq, excludePagoId, fechaPagoNuevo) {
  const pano   = window.Storage.obtenerPanoPorId(liq.panoId);
  const pagos  = liq.pagos || [];
  const idx    = excludePagoId ? pagos.findIndex(p => p.id === excludePagoId) : pagos.length;
  const cutIdx = idx < 0 ? pagos.length : idx;

  let saldo, yaAplicado;
  if (cutIdx === 0) {
    saldo = Number(liq.montoLunaDePlata) || 0;
    yaAplicado = false;
  } else {
    const pagosCalc = window.Calculos.calcularPagosConIntereses(
      { ...liq, pagos: pagos.slice(0, cutIdx) }, pano, { tasaMensual: _tasaActual() }
    );
    saldo = pagosCalc[pagosCalc.length - 1].saldoAcum;
    yaAplicado = pagosCalc.some(p => p.tierPenaltyMonto > 0);
  }

  if (!yaAplicado && pano && fechaPagoNuevo && liq.fechaEntrega && saldo > 0) {
    const diasDesdeCierre = window.Calculos.calcularDias(liq.fechaEntrega, fechaPagoNuevo);
    if (diasDesdeCierre > window.Calculos.DIAS_PENALIDAD_TIER) {
      saldo = Math.round((saldo + window.Calculos.calcularTierDelta(pano)) * 100) / 100;
    }
  }

  return saldo;
}

/**
 * Fecha de referencia para contar días de mora de un pago:
 * el primer pago se mide contra el cierre + 48hs de gracia;
 * los siguientes, contra la fecha del pago anterior.
 */
function _fechaReferenciaPago(pagos, idx, liq) {
  if (idx > 0 && pagos[idx - 1]) return pagos[idx - 1].fecha;
  return window.Calculos.calcularFechaInicioInteres(liq.fechaEntrega);
}

// =========================================================
// HELPERS
// =========================================================

function _formatPesos(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function _formatFecha(f) {
  return window.Calculos.formatearFecha(f);
}

function _circuloBadge(circulo) {
  if (!circulo) return '—';
  const norm = circulo.trim().toUpperCase();
  if (norm === 'ORO')   return `<span class="circulo-badge oro">${_esc(circulo)}</span>`;
  if (norm === 'PLATA') return `<span class="circulo-badge plata">${_esc(circulo)}</span>`;
  return `<span class="circulo-badge nc">${_esc(circulo)}</span>`;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _numVal(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return 0;
  if (el.classList.contains('input-miles')) {
    return window.FormatoNumero.desformatearMiles(el.value);
  }
  const n = parseFloat(el.value);
  return isNaN(n) ? 0 : n;
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.classList.contains('input-miles') && val !== '' && val != null) {
    el.value = window.FormatoNumero.formatearMiles(val);
  } else {
    el.value = val ?? '';
  }
}

function _setInner(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val ?? '—';
}

// =========================================================
// BOOTSTRAP
// =========================================================

document.addEventListener('DOMContentLoaded', initLiquidaciones);

window.LiqPage = {
  toggleGrupo,
  togglePanoLiq,
  abrirModalEditarLiq,
  cerrarModalLiq,
  guardarLiquidacion,
  guardarConfig,
  abrirModalNuevoPago,
  abrirModalEditarPago,
  cerrarModalPago,
  guardarPago,
  eliminarLiqConfirm,
  eliminarPagoConfirm,
  renderNotificaciones,
  toggleNotifPanel,
  irANotificacion,
  descartarNotificacion,
};
