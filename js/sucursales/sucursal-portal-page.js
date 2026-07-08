/**
 * sucursal-portal-page.js — Luna de Plata
 * Portal de cierre de caja para sucursales.
 */

(function () {
  'use strict';

  let _sucursalId     = null;
  let _sucursalNombre = '';
  let _gastoIdCounter = 0;
  let _mesExpandido   = {};
  let _cierreExpandido = {};

  // =========================================================
  // INIT
  // =========================================================

  function inicializar() {
    const sesion = window.Storage.obtenerSesion();
    if (!sesion || sesion.role !== 'sucursal') {
      window.location.replace('login.html');
      return;
    }
    _sucursalId     = sesion.sucursalId;
    _sucursalNombre = sesion.sucursalNombre || sesion.nombre || 'Sucursal';

    document.getElementById('portal-nombre-sucursal').textContent = _sucursalNombre;
    document.getElementById('portal-nombre-header').textContent   = _sucursalNombre;

    document.getElementById('btn-logout')?.addEventListener('click', () => window.Auth.logout());

    _renderHoy();
    _renderHistorial();
  }

  // =========================================================
  // RENDER HOY
  // =========================================================

  function _renderHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    const cierresHoy = window.Storage.obtenerCierresDeSucursal(_sucursalNombre)
      .filter(c => c.fecha === hoy);

    const container = document.getElementById('portal-hoy');
    if (!container) return;

    if (cierresHoy.length > 0) {
      const c = cierresHoy[0];
      container.innerHTML = `
        <div class="portal-hoy-card">
          <div class="portal-hoy-header">
            <span class="portal-hoy-fecha">Hoy — ${_formatFecha(hoy)}</span>
            <button class="btn btn-ghost btn-sm" onclick="window.SucursalPortalPage.editarHoy('${c.id}')">Editar</button>
          </div>
          <div class="portal-hoy-total">${_fmt(c.totalVentas)}</div>
          <div class="portal-hoy-meta">
            <div class="portal-hoy-meta-item">
              <span class="portal-hoy-meta-lbl">Efectivo</span>
              <span class="portal-hoy-meta-val">${_fmt(c.ventasEfectivo)}</span>
            </div>
            <div class="portal-hoy-meta-item">
              <span class="portal-hoy-meta-lbl">Transferencia</span>
              <span class="portal-hoy-meta-val">${_fmt(c.ventasTransferencia)}</span>
            </div>
            <div class="portal-hoy-meta-item">
              <span class="portal-hoy-meta-lbl">Tarjeta</span>
              <span class="portal-hoy-meta-val">${_fmt(c.ventasTarjeta)}</span>
            </div>
            ${c.totalGastos > 0 ? `
            <div class="portal-hoy-meta-item">
              <span class="portal-hoy-meta-lbl">Gastos</span>
              <span class="portal-hoy-meta-val" style="color:var(--color-danger)">- ${_fmt(c.totalGastos)}</span>
            </div>` : ''}
            <div class="portal-hoy-meta-item">
              <span class="portal-hoy-meta-lbl">Caja final</span>
              <span class="portal-hoy-meta-val">${_fmt(c.cajaFinal)}</span>
            </div>
          </div>
          ${c.observaciones ? `<div class="cierre-obs" style="margin-top:var(--space-4)">${c.observaciones}</div>` : ''}
        </div>`;
    } else {
      container.innerHTML = `
        <div class="portal-hoy-card" style="text-align:center; padding: var(--space-8) var(--space-5);">
          <p style="color:var(--color-text-muted); margin-bottom:var(--space-4)">No hay cierre registrado para hoy.</p>
          <button class="btn btn-gold" onclick="window.SucursalPortalPage.mostrarForm()">Registrar cierre de hoy</button>
        </div>`;
    }
  }

  // =========================================================
  // FORMULARIO
  // =========================================================

  function mostrarForm(cierreId) {
    const cierre = cierreId ? window.Storage.obtenerCierrePorId(cierreId) : null;

    const container = document.getElementById('portal-form-container');
    if (!container) return;

    _gastoIdCounter = 0;

    const hoy = new Date().toISOString().split('T')[0];
    const fecha = cierre ? cierre.fecha : hoy;

    container.innerHTML = `
      <div class="portal-form">
        <form id="portal-form-cierre" novalidate>
          <input type="hidden" id="portal-cierre-id" value="${cierre ? cierre.id : ''}">

          <div class="divider-label">Fondo inicial de caja</div>
          <div class="form-group">
            <label class="form-label">Fondo de inicio (efectivo)</label>
            <div class="input-currency">
              <span class="input-currency-symbol">$</span>
              <input type="text" inputmode="numeric" class="form-input input-miles" id="p-fondo-inicio" placeholder="0"
                value="${cierre ? window.FormatoNumero.formatearMiles(cierre.fondoInicio || 0) : ''}">
            </div>
          </div>

          <div class="divider-label">Ventas del día por método de pago</div>
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label">Efectivo</label>
              <div class="input-currency">
                <span class="input-currency-symbol">$</span>
                <input type="text" inputmode="numeric" class="form-input input-miles" id="p-efectivo" placeholder="0"
                  value="${cierre ? window.FormatoNumero.formatearMiles(cierre.ventasEfectivo || 0) : ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Transferencia</label>
              <div class="input-currency">
                <span class="input-currency-symbol">$</span>
                <input type="text" inputmode="numeric" class="form-input input-miles" id="p-transfer" placeholder="0"
                  value="${cierre ? window.FormatoNumero.formatearMiles(cierre.ventasTransferencia || 0) : ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Tarjeta</label>
              <div class="input-currency">
                <span class="input-currency-symbol">$</span>
                <input type="text" inputmode="numeric" class="form-input input-miles" id="p-tarjeta" placeholder="0"
                  value="${cierre ? window.FormatoNumero.formatearMiles(cierre.ventasTarjeta || 0) : ''}">
              </div>
            </div>
          </div>

          <div class="divider-label">
            Gastos del día
            <button type="button" class="btn btn-ghost btn-sm" onclick="window.SucursalPortalPage.agregarGasto()" style="margin-left:auto">
              + Agregar gasto
            </button>
          </div>
          <div id="p-gastos-lista" class="gastos-lista-modal"></div>

          <div class="divider-label">Observaciones</div>
          <div class="form-group">
            <textarea class="form-textarea" id="p-observaciones" rows="2" placeholder="Notas del día...">${cierre ? (cierre.observaciones || '') : ''}</textarea>
          </div>

          <div class="cierre-preview">
            <div class="cierre-preview-titulo">Resumen</div>
            <div class="cierre-preview-fila">
              <span class="cierre-preview-fila-lbl">Efectivo</span>
              <span class="cierre-preview-fila-val gold" id="p-prev-efectivo">$0</span>
            </div>
            <div class="cierre-preview-fila">
              <span class="cierre-preview-fila-lbl">Transferencia</span>
              <span class="cierre-preview-fila-val gold" id="p-prev-transfer">$0</span>
            </div>
            <div class="cierre-preview-fila">
              <span class="cierre-preview-fila-lbl">Tarjeta</span>
              <span class="cierre-preview-fila-val gold" id="p-prev-tarjeta">$0</span>
            </div>
            <div class="cierre-preview-divider"></div>
            <div class="cierre-preview-fila">
              <span class="cierre-preview-fila-lbl" style="font-weight:600">Total ventas</span>
              <span class="cierre-preview-fila-val gold" id="p-prev-total" style="font-size:15px">$0</span>
            </div>
            <div class="cierre-preview-divider"></div>
            <div class="cierre-preview-fila">
              <span class="cierre-preview-fila-lbl">Fondo inicial</span>
              <span class="cierre-preview-fila-val" id="p-prev-fondo">$0</span>
            </div>
            <div class="cierre-preview-fila">
              <span class="cierre-preview-fila-lbl">Gastos del día</span>
              <span class="cierre-preview-fila-val danger" id="p-prev-gastos">- $0</span>
            </div>
            <div class="cierre-preview-divider"></div>
            <div class="cierre-preview-total">
              <span>Caja de efectivo final</span>
              <strong id="p-prev-caja">$0</strong>
            </div>
          </div>

          <div class="portal-form-actions">
            <button type="button" class="btn btn-ghost" onclick="window.SucursalPortalPage.cancelarForm()">Cancelar</button>
            <button type="submit" class="btn btn-gold">Guardar cierre</button>
          </div>
        </form>
      </div>`;

    window.FormatoNumero?.attachInputsMiles('#portal-form-cierre .input-miles');

    ['p-fondo-inicio', 'p-efectivo', 'p-transfer', 'p-tarjeta'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', _actualizarPreview);
    });

    if (cierre && cierre.gastos) {
      cierre.gastos.forEach(g => _agregarFilaGasto(g.descripcion, g.monto));
    }

    _actualizarPreview();

    document.getElementById('portal-form-cierre')?.addEventListener('submit', e => {
      e.preventDefault();
      guardar();
    });

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editarHoy(id) {
    mostrarForm(id);
  }

  function cancelarForm() {
    const container = document.getElementById('portal-form-container');
    if (container) container.innerHTML = '';
  }

  // =========================================================
  // GASTOS
  // =========================================================

  function agregarGasto() {
    _agregarFilaGasto('', '');
  }

  function _agregarFilaGasto(desc, monto) {
    const id = ++_gastoIdCounter;
    const container = document.getElementById('p-gastos-lista');
    if (!container) return;
    const fila = document.createElement('div');
    fila.className = 'gasto-fila';
    fila.dataset.gastoId = id;
    fila.innerHTML = `
      <input type="text" class="form-input gasto-desc" placeholder="Descripción del gasto" value="${desc || ''}">
      <div class="input-currency">
        <span class="input-currency-symbol">$</span>
        <input type="text" inputmode="numeric" class="form-input gasto-monto input-miles" placeholder="0"
          value="${monto ? window.FormatoNumero.formatearMiles(monto) : ''}">
      </div>
      <button type="button" class="btn btn-danger-ghost btn-icon" onclick="window.SucursalPortalPage.eliminarGasto(${id})" title="Eliminar">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    const montoInput = fila.querySelector('.gasto-monto');
    window.FormatoNumero.attachInputMiles(montoInput);
    montoInput.addEventListener('input', _actualizarPreview);
    container.appendChild(fila);
    _actualizarPreview();
  }

  function eliminarGasto(id) {
    const fila = document.querySelector(`[data-gasto-id="${id}"]`);
    if (fila) fila.remove();
    _actualizarPreview();
  }

  // =========================================================
  // PREVIEW
  // =========================================================

  function _actualizarPreview() {
    const efectivo = window.FormatoNumero.desformatearMiles(document.getElementById('p-efectivo')?.value);
    const transfer = window.FormatoNumero.desformatearMiles(document.getElementById('p-transfer')?.value);
    const tarjeta  = window.FormatoNumero.desformatearMiles(document.getElementById('p-tarjeta')?.value);
    const fondo    = window.FormatoNumero.desformatearMiles(document.getElementById('p-fondo-inicio')?.value);

    const gastoFilas  = document.querySelectorAll('#p-gastos-lista .gasto-monto');
    const totalGastos = Array.from(gastoFilas).reduce((s, el) => s + window.FormatoNumero.desformatearMiles(el.value), 0);
    const totalVentas = efectivo + transfer + tarjeta;
    const cajaFinal   = fondo + efectivo - totalGastos;

    const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    _set('p-prev-efectivo', _fmt(efectivo));
    _set('p-prev-transfer', _fmt(transfer));
    _set('p-prev-tarjeta',  _fmt(tarjeta));
    _set('p-prev-total',    _fmt(totalVentas));
    _set('p-prev-fondo',    _fmt(fondo));
    _set('p-prev-gastos',   `- ${_fmt(totalGastos)}`);
    _set('p-prev-caja',     _fmt(cajaFinal));

    const cajaEl = document.getElementById('p-prev-caja');
    if (cajaEl) cajaEl.style.color = cajaFinal >= 0 ? 'var(--color-gold-dark)' : 'var(--color-danger)';
  }

  // =========================================================
  // GUARDAR
  // =========================================================

  function guardar() {
    const cierreId = document.getElementById('portal-cierre-id')?.value;

    const gastoFilas = document.querySelectorAll('#p-gastos-lista .gasto-fila');
    const gastos = Array.from(gastoFilas).map(fila => ({
      id:          window.Storage.generarId(),
      descripcion: fila.querySelector('.gasto-desc')?.value.trim() || '',
      monto:       window.FormatoNumero.desformatearMiles(fila.querySelector('.gasto-monto')?.value),
    })).filter(g => g.monto > 0 || g.descripcion);

    const hoy = new Date().toISOString().split('T')[0];

    const datos = {
      sucursal:            _sucursalNombre,
      fecha:               hoy,
      fondoInicio:         window.FormatoNumero.desformatearMiles(document.getElementById('p-fondo-inicio')?.value),
      ventasEfectivo:      window.FormatoNumero.desformatearMiles(document.getElementById('p-efectivo')?.value),
      ventasTransferencia: window.FormatoNumero.desformatearMiles(document.getElementById('p-transfer')?.value),
      ventasTarjeta:       window.FormatoNumero.desformatearMiles(document.getElementById('p-tarjeta')?.value),
      gastos,
      observaciones:       document.getElementById('p-observaciones')?.value.trim() || '',
    };

    if (cierreId) {
      window.Storage.actualizarCierre(cierreId, datos);
    } else {
      datos.creadoPor = _sucursalNombre;
      window.Storage.guardarCierre(datos);
    }

    cancelarForm();
    _renderHoy();
    _renderHistorial();
    _mostrarToast('Cierre guardado correctamente', 'success');
  }

  // =========================================================
  // HISTORIAL
  // =========================================================

  function _renderHistorial() {
    const container = document.getElementById('portal-historial');
    if (!container) return;

    const cierres = window.Storage.obtenerCierresDeSucursal(_sucursalNombre).slice(0, 90);

    if (cierres.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Sin cierres anteriores</div></div>';
      return;
    }

    const porMes = {};
    cierres.forEach(c => {
      const mes = c.fecha.slice(0, 7);
      if (!porMes[mes]) porMes[mes] = [];
      porMes[mes].push(c);
    });

    const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a));

    container.innerHTML = meses.map(mes => {
      const lista = porMes[mes];
      const totalMes = lista.reduce((s, c) => s + (Number(c.totalVentas) || 0), 0);
      const [anio, numMes] = mes.split('-');
      const nombreMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(numMes) - 1];
      const expanded = _mesExpandido[mes] !== false;

      return `
        <div class="portal-historial-mes ${expanded ? 'expanded' : ''}" id="mes-${mes}">
          <div class="portal-mes-header" onclick="window.SucursalPortalPage.toggleMes('${mes}')">
            <span>${nombreMes} ${anio}</span>
            <span style="color:var(--color-gold-dark); font-family:var(--font-display)">${_fmt(totalMes)}</span>
            <svg class="portal-mes-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div class="portal-mes-body">
            ${lista.map(c => _renderCierreRow(c)).join('')}
          </div>
        </div>`;
    }).join('');
  }

  function _renderCierreRow(c) {
    const expanded = _cierreExpandido[c.id];
    const gastosList = (c.gastos || []).length > 0
      ? `<ul class="cierre-gastos-lista">${(c.gastos || []).map(g => `<li class="cierre-gasto-item"><span>${g.descripcion || 'Gasto'}</span><span class="cierre-gasto-monto">- ${_fmt(g.monto)}</span></li>`).join('')}</ul>`
      : '<span style="color:var(--color-text-muted);font-size:12px">Sin gastos</span>';

    return `
      <div class="portal-cierre-row ${expanded ? 'expanded' : ''}" onclick="window.SucursalPortalPage.toggleCierre('${c.id}')">
        <span class="portal-cierre-fecha">${_formatFecha(c.fecha)}</span>
        <div class="portal-cierre-montos">
          <div class="portal-cierre-monto-item">
            <span class="portal-cierre-monto-lbl">Efectivo</span>
            <span class="portal-cierre-monto-val">${_fmt(c.ventasEfectivo)}</span>
          </div>
          <div class="portal-cierre-monto-item">
            <span class="portal-cierre-monto-lbl">Transf.</span>
            <span class="portal-cierre-monto-val">${_fmt(c.ventasTransferencia)}</span>
          </div>
          <div class="portal-cierre-monto-item">
            <span class="portal-cierre-monto-lbl">Tarjeta</span>
            <span class="portal-cierre-monto-val">${_fmt(c.ventasTarjeta)}</span>
          </div>
        </div>
        <span class="portal-cierre-total">${_fmt(c.totalVentas)}</span>
      </div>
      <div class="portal-cierre-detalle" id="det-${c.id}" style="${expanded ? '' : 'display:none'}">
        <div style="display:flex;gap:var(--space-6);flex-wrap:wrap;font-size:13px">
          <div><strong>Fondo inicial:</strong> ${_fmt(c.fondoInicio)}</div>
          <div><strong>Caja final:</strong> ${_fmt(c.cajaFinal)}</div>
          ${c.totalGastos > 0 ? `<div><strong>Total gastos:</strong> <span style="color:var(--color-danger)">- ${_fmt(c.totalGastos)}</span></div>` : ''}
        </div>
        ${c.totalGastos > 0 ? `<div style="margin-top:var(--space-3)">${gastosList}</div>` : ''}
        ${c.observaciones ? `<div class="cierre-obs" style="margin-top:var(--space-3)">${c.observaciones}</div>` : ''}
      </div>`;
  }

  function toggleMes(key) {
    _mesExpandido[key] = !(_mesExpandido[key] !== false);
    _renderHistorial();
  }

  function toggleCierre(id) {
    _cierreExpandido[id] = !_cierreExpandido[id];
    const row = document.querySelector(`.portal-cierre-row[onclick*="'${id}'"]`);
    const det  = document.getElementById('det-' + id);
    if (row) row.classList.toggle('expanded', !!_cierreExpandido[id]);
    if (det) det.style.display = _cierreExpandido[id] ? 'block' : 'none';
  }

  // =========================================================
  // UTILIDADES
  // =========================================================

  function _fmt(num) {
    const n = Number(num) || 0;
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function _formatFecha(fechaStr) {
    if (!fechaStr) return '—';
    const [y, m, d] = fechaStr.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
  }

  function _mostrarToast(mensaje, tipo) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo || 'default'}`;
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        ${tipo === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
      </svg>
      <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 3000);
  }

  // =========================================================
  // API PÚBLICA
  // =========================================================

  window.SucursalPortalPage = {
    inicializar,
    mostrarForm,
    editarHoy,
    cancelarForm,
    agregarGasto,
    eliminarGasto,
    guardar,
    toggleMes,
    toggleCierre,
  };

})();
