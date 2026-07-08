/**
 * sucursales-page.js — Luna de Plata
 * Gestión de sucursales y cierres de caja.
 */

(function () {
  'use strict';

  // Colores por sucursal
  const SUCURSAL_COLOR = {
    'Balnearia': 'balnearia',
    'Miramar':   'miramar',
    'La Para':   'la-para',
  };

  let _filtroSucursal    = 'todas';
  let _filtroFecha       = '';
  let _modalMode         = 'nuevo';
  let _modalEditId       = null;
  let _gastoIdCounter    = 0;
  let _modalSucursalMode = 'nuevo';
  let _modalSucursalId   = null;

  // =========================================================
  // INIT
  // =========================================================

  function inicializar() {
    window.FormatoNumero?.attachInputsMiles('.input-miles');
    _seedSucursalesYUsuarios();
    _poblarSelectSucursal();
    _renderSucursales();
    _renderStats();
    _renderTabs();
    _renderCierres();
    _vincularEventos();
  }

  // =========================================================
  // STATS
  // =========================================================

  function _renderStats() {
    const hoy = new Date().toISOString().split('T')[0];
    const todos = window.Storage.obtenerTodosLosCierres();
    const cierresHoy = todos.filter(c => c.fecha === hoy);

    const ventasTotalesHoy = cierresHoy.reduce((s, c) => s + (Number(c.totalVentas) || 0), 0);

    // Ventas del mes
    const mesActual = hoy.slice(0, 7); // YYYY-MM
    const cierresMes = todos.filter(c => c.fecha.startsWith(mesActual));
    const ventasMes = cierresMes.reduce((s, c) => s + (Number(c.totalVentas) || 0), 0);

    // Sucursales con cierre hoy
    const sucursalesConCierre = new Set(cierresHoy.map(c => c.sucursal));
    const todasLasSucursales = window.Storage.obtenerTodasLasSucursales();
    const pendientes = todasLasSucursales.length - sucursalesConCierre.size;

    // Sucursal top del día
    const ventasPorSucursal = {};
    cierresHoy.forEach(c => {
      ventasPorSucursal[c.sucursal] = (ventasPorSucursal[c.sucursal] || 0) + (Number(c.totalVentas) || 0);
    });
    const topEntry = Object.entries(ventasPorSucursal).sort((a, b) => b[1] - a[1])[0];
    const topSucursal = topEntry ? topEntry[0] : '—';

    _setText('stat-ventas-hoy', _fmt(ventasTotalesHoy));
    _setText('stat-ventas-mes', _fmt(ventasMes));
    _setText('stat-pendientes', pendientes);
    _setText('stat-top-sucursal', topSucursal);
  }

  // =========================================================
  // TABS
  // =========================================================

  function _renderTabs() {
    const todos = window.Storage.obtenerTodosLosCierres();
    const hoy = new Date().toISOString().split('T')[0];

    const sucursalesDinamicas = window.Storage.obtenerTodasLasSucursales().map(s => s.nombre);
    const opciones = [{ key: 'todas', label: 'Todas' }, ...sucursalesDinamicas.map(s => ({ key: s, label: s }))];

    const container = document.getElementById('sucursal-tabs');
    if (!container) return;

    container.innerHTML = opciones.map(({ key, label }) => {
      const count = key === 'todas'
        ? todos.filter(c => c.fecha === hoy).length
        : todos.filter(c => c.sucursal === key && c.fecha === hoy).length;
      const isActive = _filtroSucursal === key;
      return `
        <button class="sucursal-tab ${isActive ? 'active' : ''}" data-sucursal="${key}">
          ${label}
          <span class="sucursal-tab-badge">${count > 0 ? count : 0}</span>
        </button>`;
    }).join('');
  }

  // =========================================================
  // RENDER LISTA DE CIERRES
  // =========================================================

  function _renderCierres() {
    let lista = window.Storage.obtenerTodosLosCierres();

    if (_filtroSucursal !== 'todas') {
      lista = lista.filter(c => c.sucursal === _filtroSucursal);
    }
    if (_filtroFecha) {
      lista = lista.filter(c => c.fecha === _filtroFecha);
    }

    lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));

    const container = document.getElementById('cierres-lista');
    const countEl   = document.getElementById('cierres-count');
    if (!container) return;

    if (countEl) countEl.textContent = lista.length;

    if (lista.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="7" width="20" height="15" rx="2"/>
            <path d="M16 2H8l-2 5h12L16 2z"/>
          </svg>
          <div class="empty-state-title">Sin cierres registrados</div>
          <div class="empty-state-desc">Registrá el primer cierre de caja usando el botón "+ Nuevo cierre"</div>
        </div>`;
      return;
    }

    // Agrupar por fecha
    const porFecha = {};
    lista.forEach(c => {
      if (!porFecha[c.fecha]) porFecha[c.fecha] = [];
      porFecha[c.fecha].push(c);
    });

    const fechas = Object.keys(porFecha).sort((a, b) => b.localeCompare(a));

    container.innerHTML = fechas.map(fecha => {
      const cierresDia = porFecha[fecha];
      const totalDia = cierresDia.reduce((s, c) => s + (Number(c.totalVentas) || 0), 0);
      const esHoy = fecha === new Date().toISOString().split('T')[0];
      const labelFecha = esHoy ? `Hoy — ${_formatFecha(fecha)}` : _formatFecha(fecha);

      return `
        <div class="cierre-fecha-grupo">
          <div class="cierre-fecha-label">
            ${labelFecha}
            <span style="float:right; font-weight:600; color: var(--color-gold-dark);">Total día: ${_fmt(totalDia)}</span>
          </div>
          ${cierresDia.map(c => _renderCierreCard(c)).join('')}
        </div>`;
    }).join('');
  }

  function _renderCierreCard(c) {
    const dotClass = SUCURSAL_COLOR[c.sucursal] || 'la-para';
    const gastosList = (c.gastos || []).length > 0
      ? `<ul class="cierre-gastos-lista">
          ${(c.gastos || []).map(g => `
            <li class="cierre-gasto-item">
              <span>${g.descripcion || 'Gasto'}</span>
              <span class="cierre-gasto-monto">- ${_fmt(g.monto)}</span>
            </li>`).join('')}
         </ul>`
      : `<span style="color: var(--color-text-muted); font-size: 12.5px;">Sin gastos registrados</span>`;

    const obsHtml = c.observaciones
      ? `<div class="cierre-obs">${c.observaciones}</div>` : '';

    return `
      <div class="cierre-card" id="cierre-${c.id}">
        <div class="cierre-card-header" onclick="window.SucursalesPage.toggleCierre('${c.id}')">
          <span class="cierre-sucursal-dot ${dotClass}"></span>
          <span class="cierre-sucursal-nombre">${c.sucursal}</span>
          <div class="cierre-meta">
            <div class="cierre-meta-item">
              <span class="cierre-meta-lbl">Efectivo</span>
              <span class="cierre-meta-val">${_fmt(c.ventasEfectivo)}</span>
            </div>
            <div class="cierre-meta-item">
              <span class="cierre-meta-lbl">Transferencia</span>
              <span class="cierre-meta-val">${_fmt(c.ventasTransferencia)}</span>
            </div>
            <div class="cierre-meta-item">
              <span class="cierre-meta-lbl">Tarjeta</span>
              <span class="cierre-meta-val">${_fmt(c.ventasTarjeta)}</span>
            </div>
            ${c.totalGastos > 0 ? `
            <div class="cierre-meta-item">
              <span class="cierre-meta-lbl">Gastos</span>
              <span class="cierre-meta-val danger" style="color:var(--color-danger)">- ${_fmt(c.totalGastos)}</span>
            </div>` : ''}
          </div>
          <span class="cierre-total-venta">${_fmt(c.totalVentas)}</span>
          <svg class="cierre-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>

        <div class="cierre-card-body">
          <div class="cierre-detalle-grid">
            <div class="cierre-detalle-bloque">
              <div class="cierre-detalle-titulo">Ingresos por método</div>
              <div class="cierre-detalle-fila">
                <span class="cierre-detalle-fila-lbl">Efectivo</span>
                <span class="cierre-detalle-fila-val gold">${_fmt(c.ventasEfectivo)}</span>
              </div>
              <div class="cierre-detalle-fila">
                <span class="cierre-detalle-fila-lbl">Transferencia</span>
                <span class="cierre-detalle-fila-val gold">${_fmt(c.ventasTransferencia)}</span>
              </div>
              <div class="cierre-detalle-fila">
                <span class="cierre-detalle-fila-lbl">Tarjeta</span>
                <span class="cierre-detalle-fila-val gold">${_fmt(c.ventasTarjeta)}</span>
              </div>
              <div class="cierre-detalle-total">
                <span>Total ventas</span>
                <strong>${_fmt(c.totalVentas)}</strong>
              </div>
            </div>

            <div class="cierre-detalle-bloque">
              <div class="cierre-detalle-titulo">Caja de efectivo</div>
              <div class="cierre-detalle-fila">
                <span class="cierre-detalle-fila-lbl">Fondo inicial</span>
                <span class="cierre-detalle-fila-val">${_fmt(c.fondoInicio)}</span>
              </div>
              <div class="cierre-detalle-fila">
                <span class="cierre-detalle-fila-lbl">+ Ventas efectivo</span>
                <span class="cierre-detalle-fila-val success">${_fmt(c.ventasEfectivo)}</span>
              </div>
              <div class="cierre-detalle-fila">
                <span class="cierre-detalle-fila-lbl">- Gastos</span>
                <span class="cierre-detalle-fila-val danger">- ${_fmt(c.totalGastos)}</span>
              </div>
              <div class="cierre-detalle-total">
                <span>Caja final</span>
                <strong>${_fmt(c.cajaFinal)}</strong>
              </div>
            </div>

            <div class="cierre-detalle-bloque">
              <div class="cierre-detalle-titulo">Gastos del día</div>
              ${gastosList}
              ${c.totalGastos > 0 ? `<div class="cierre-detalle-total">
                <span>Total gastos</span>
                <strong style="color:var(--color-danger)">- ${_fmt(c.totalGastos)}</strong>
              </div>` : ''}
            </div>
          </div>
          ${obsHtml}
          <div class="cierre-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="window.SucursalesPage.abrirModalEditar('${c.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
            <button class="btn btn-danger-ghost btn-sm" onclick="window.SucursalesPage.eliminarCierre('${c.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>`;
  }

  // =========================================================
  // TOGGLE EXPAND
  // =========================================================

  function toggleCierre(id) {
    const card = document.getElementById('cierre-' + id);
    if (card) card.classList.toggle('expanded');
  }

  // =========================================================
  // SEED SUCURSALES + USUARIOS
  // =========================================================

  function _seedSucursalesYUsuarios() {
    const sucursales = window.Storage.obtenerTodasLasSucursales();
    sucursales.forEach(suc => {
      const usuarios = window.Storage.obtenerUsuarios().filter(u => u.role === 'sucursal' && u.sucursalId === suc.id);
      if (usuarios.length === 0 && suc.usuario && suc.password) {
        window.Storage.guardarUsuario({
          role:       'sucursal',
          username:   suc.usuario,
          password:   suc.password,
          nombre:     suc.nombre,
          sucursalId: suc.id,
        });
      }
    });
  }

  // =========================================================
  // SELECT SUCURSAL DINÁMICO
  // =========================================================

  function _poblarSelectSucursal(valorActual) {
    const sel = document.getElementById('cierre-sucursal');
    if (!sel) return;
    const sucursales = window.Storage.obtenerTodasLasSucursales();
    sel.innerHTML = '<option value="">— Seleccionar —</option>'
      + sucursales.map(s => `<option value="${s.nombre}"${s.nombre === valorActual ? ' selected' : ''}>${s.nombre}</option>`).join('');
  }

  // =========================================================
  // RENDER SUCURSALES
  // =========================================================

  function _renderSucursales() {
    const container = document.getElementById('sucursales-lista');
    if (!container) return;
    const sucursales = window.Storage.obtenerTodasLasSucursales();
    if (sucursales.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Sin sucursales</div></div>';
      return;
    }
    container.innerHTML = sucursales.map(suc => `
      <div class="suc-card">
        <div class="suc-card-header">
          <span class="cierre-sucursal-dot ${suc.color || 'la-para'}"></span>
          <span class="suc-nombre">${_esc(suc.nombre)}</span>
          <div class="suc-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="window.SucursalesPage.abrirModalSucursal('${suc.id}')">Editar</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="window.SucursalesPage.eliminarSucursalConfirm('${suc.id}')">Eliminar</button>
          </div>
        </div>
        <div class="suc-card-body">
          <div class="suc-info-row"><span>Usuario:</span><code>${_esc(suc.usuario || '—')}</code></div>
          <div class="suc-info-row"><span>Contraseña:</span>
            <span class="suc-password-wrap">
              <span class="suc-password-hidden" id="pwd-${suc.id}">••••••••</span>
              <button class="btn-show-pwd" onclick="window.SucursalesPage.togglePassword('${suc.id}', '${_esc(suc.password || '')}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </span>
          </div>
          ${suc.encargado ? `<div class="suc-info-row"><span>Encargado:</span><span>${_esc(suc.encargado)}</span></div>` : ''}
          ${suc.direccion ? `<div class="suc-info-row"><span>Dirección:</span><span>${_esc(suc.direccion)}</span></div>` : ''}
        </div>
      </div>`).join('');
  }

  // =========================================================
  // MODAL SUCURSAL
  // =========================================================

  function abrirModalSucursal(id) {
    _modalSucursalMode = id ? 'editar' : 'nuevo';
    _modalSucursalId   = id || null;

    _setText('modal-sucursal-titulo', id ? 'Editar sucursal' : 'Nueva sucursal');
    document.getElementById('form-sucursal').reset();

    const errores = ['error-suc-nombre', 'error-suc-usuario', 'error-suc-password'];
    errores.forEach(e => { const el = document.getElementById(e); if (el) el.style.display = 'none'; });

    if (id) {
      const suc = window.Storage.obtenerSucursalPorId(id);
      if (!suc) return;
      document.getElementById('suc-nombre').value     = suc.nombre || '';
      document.getElementById('suc-encargado').value  = suc.encargado || '';
      document.getElementById('suc-direccion').value  = suc.direccion || '';
      document.getElementById('suc-usuario').value    = suc.usuario || '';
      document.getElementById('suc-password').value   = suc.password || '';
    }

    document.getElementById('modal-sucursal').classList.add('open');
  }

  function cerrarModalSucursal() {
    document.getElementById('modal-sucursal')?.classList.remove('open');
  }

  function guardarSucursal() {
    const nombre   = document.getElementById('suc-nombre').value.trim();
    const usuario  = document.getElementById('suc-usuario').value.trim();
    const password = document.getElementById('suc-password').value.trim();

    let ok = true;
    const setErr = (id, msg) => {
      const el = document.getElementById(id);
      if (el) { el.style.display = msg ? 'block' : 'none'; el.textContent = msg || ''; }
    };

    setErr('error-suc-nombre',    nombre   ? '' : 'Ingresá el nombre de la sucursal');
    setErr('error-suc-usuario',   usuario  ? '' : 'Ingresá un nombre de usuario');
    setErr('error-suc-password',  password ? '' : 'Ingresá una contraseña');

    if (!nombre)   ok = false;
    if (!usuario)  ok = false;
    if (!password) ok = false;
    if (!ok) return;

    const encargado = document.getElementById('suc-encargado').value.trim();
    const direccion = document.getElementById('suc-direccion').value.trim();

    if (_modalSucursalMode === 'nuevo') {
      const colorMap = { 'Balnearia': 'balnearia', 'Miramar': 'miramar', 'La Para': 'la-para' };
      const color = colorMap[nombre] || 'la-para';
      const nueva = window.Storage.guardarSucursal({ nombre, encargado, direccion, usuario, password, color });
      window.Storage.guardarUsuario({
        role:       'sucursal',
        username:   usuario,
        password,
        nombre,
        sucursalId: nueva.id,
      });
      window.UI.mostrarToast('Sucursal creada correctamente', 'success');
    } else {
      const suc = window.Storage.obtenerSucursalPorId(_modalSucursalId);
      window.Storage.actualizarSucursal(_modalSucursalId, { nombre, encargado, direccion, usuario, password });
      const usersViejos = window.Storage.obtenerUsuarios().filter(u => u.role === 'sucursal' && u.sucursalId === _modalSucursalId);
      if (usersViejos.length > 0) {
        window.Storage.actualizarUsuario(usersViejos[0].id, { username: usuario, password, nombre });
      } else {
        window.Storage.guardarUsuario({ role: 'sucursal', username: usuario, password, nombre, sucursalId: _modalSucursalId });
      }
      window.UI.mostrarToast('Sucursal actualizada', 'success');
    }

    cerrarModalSucursal();
    _renderSucursales();
    _renderTabs();
    _poblarSelectSucursal();
    _renderStats();
  }

  function eliminarSucursalConfirm(id) {
    const suc = window.Storage.obtenerSucursalPorId(id);
    if (!suc) return;
    const conf = confirm(`¿Eliminar la sucursal "${suc.nombre}"?\n\nEsta acción no se puede deshacer.`);
    if (!conf) return;
    const users = window.Storage.obtenerUsuarios().filter(u => u.role === 'sucursal' && u.sucursalId === id);
    users.forEach(u => window.Storage.actualizarUsuario(u.id, { _eliminado: true }));
    window.Storage.eliminarSucursal(id);
    window.UI.mostrarToast('Sucursal eliminada', 'default');
    _renderSucursales();
    _renderTabs();
    _poblarSelectSucursal();
    _renderStats();
  }

  function togglePassword(id, pwd) {
    const el = document.getElementById('pwd-' + id);
    if (!el) return;
    el.textContent = el.textContent === '••••••••' ? pwd : '••••••••';
  }

  // =========================================================
  // MODAL
  // =========================================================

  function abrirModalNuevo() {
    _modalMode   = 'nuevo';
    _modalEditId = null;

    _setText('modal-cierre-titulo', 'Nuevo cierre de caja');
    document.getElementById('form-cierre').reset();
    _poblarSelectSucursal();

    // Fecha por defecto: hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('cierre-fecha').value = hoy;

    // Limpiar gastos
    document.getElementById('gastos-lista-modal').innerHTML = '';
    _gastoIdCounter = 0;

    _actualizarPreview();
    _abrirModal();
  }

  function abrirModalEditar(id) {
    const cierre = window.Storage.obtenerCierrePorId(id);
    if (!cierre) return;

    _modalMode   = 'editar';
    _modalEditId = id;

    _setText('modal-cierre-titulo', 'Editar cierre de caja');

    _poblarSelectSucursal(cierre.sucursal);
    document.getElementById('cierre-fecha').value             = cierre.fecha || '';
    document.getElementById('cierre-fondo-inicio').value      = window.FormatoNumero.formatearMiles(cierre.fondoInicio || 0);
    document.getElementById('cierre-ventas-efectivo').value   = window.FormatoNumero.formatearMiles(cierre.ventasEfectivo || 0);
    document.getElementById('cierre-ventas-transfer').value   = window.FormatoNumero.formatearMiles(cierre.ventasTransferencia || 0);
    document.getElementById('cierre-ventas-tarjeta').value    = window.FormatoNumero.formatearMiles(cierre.ventasTarjeta || 0);
    document.getElementById('cierre-observaciones').value     = cierre.observaciones || '';

    // Cargar gastos
    const gastosContainer = document.getElementById('gastos-lista-modal');
    gastosContainer.innerHTML = '';
    _gastoIdCounter = 0;
    (cierre.gastos || []).forEach(g => _agregarFilaGasto(g.descripcion, g.monto));

    _actualizarPreview();
    _abrirModal();
  }

  function cerrarModal() {
    const overlay = document.getElementById('modal-cierre');
    if (overlay) {
      overlay.classList.remove('open');
    }
  }

  function _abrirModal() {
    const overlay = document.getElementById('modal-cierre');
    if (overlay) overlay.classList.add('open');
  }

  // =========================================================
  // GASTOS DINÁMICOS EN MODAL
  // =========================================================

  function agregarGasto() {
    _agregarFilaGasto('', '');
  }

  function _agregarFilaGasto(desc, monto) {
    const id = ++_gastoIdCounter;
    const container = document.getElementById('gastos-lista-modal');
    const fila = document.createElement('div');
    fila.className = 'gasto-fila';
    fila.dataset.gastoId = id;
    fila.innerHTML = `
      <input type="text" class="form-input gasto-desc" placeholder="Descripción del gasto" value="${desc || ''}">
      <div class="input-currency">
        <span class="input-currency-symbol">$</span>
        <input type="text" inputmode="numeric" class="form-input gasto-monto input-miles" placeholder="0" value="${monto ? window.FormatoNumero.formatearMiles(monto) : ''}">
      </div>
      <button type="button" class="btn btn-danger-ghost btn-icon" onclick="window.SucursalesPage.eliminarGasto(${id})" title="Eliminar">
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
  // PREVIEW EN TIEMPO REAL
  // =========================================================

  function _actualizarPreview() {
    const efectivo   = window.FormatoNumero.desformatearMiles(document.getElementById('cierre-ventas-efectivo')?.value);
    const transfer   = window.FormatoNumero.desformatearMiles(document.getElementById('cierre-ventas-transfer')?.value);
    const tarjeta    = window.FormatoNumero.desformatearMiles(document.getElementById('cierre-ventas-tarjeta')?.value);
    const fondo      = window.FormatoNumero.desformatearMiles(document.getElementById('cierre-fondo-inicio')?.value);

    const gastoFilas = document.querySelectorAll('#gastos-lista-modal .gasto-monto');
    const totalGastos = Array.from(gastoFilas).reduce((s, el) => s + window.FormatoNumero.desformatearMiles(el.value), 0);

    const totalVentas = efectivo + transfer + tarjeta;
    const cajaFinal   = fondo + efectivo - totalGastos;

    _setText('preview-ventas-efectivo', _fmt(efectivo));
    _setText('preview-ventas-transfer', _fmt(transfer));
    _setText('preview-ventas-tarjeta',  _fmt(tarjeta));
    _setText('preview-total-ventas',    _fmt(totalVentas));
    _setText('preview-fondo',           _fmt(fondo));
    _setText('preview-total-gastos',    `- ${_fmt(totalGastos)}`);
    _setText('preview-caja-final',      _fmt(cajaFinal));

    const cajaEl = document.getElementById('preview-caja-final');
    if (cajaEl) {
      cajaEl.className = 'cierre-preview-fila-val ' + (cajaFinal >= 0 ? 'gold' : 'danger');
    }
  }

  // =========================================================
  // GUARDAR
  // =========================================================

  function guardarCierre() {
    const sucursal  = document.getElementById('cierre-sucursal').value.trim();
    const fecha     = document.getElementById('cierre-fecha').value;

    // Validación básica
    const errSucursal = document.getElementById('error-sucursal');
    const errFecha    = document.getElementById('error-fecha');

    let ok = true;
    if (!sucursal) {
      if (errSucursal) { errSucursal.style.display = 'block'; errSucursal.textContent = 'Seleccioná una sucursal'; }
      ok = false;
    } else {
      if (errSucursal) errSucursal.style.display = 'none';
    }
    if (!fecha) {
      if (errFecha) { errFecha.style.display = 'block'; errFecha.textContent = 'Ingresá una fecha'; }
      ok = false;
    } else {
      if (errFecha) errFecha.style.display = 'none';
    }
    if (!ok) return;

    // Recolectar gastos
    const gastoFilas = document.querySelectorAll('#gastos-lista-modal .gasto-fila');
    const gastos = Array.from(gastoFilas).map(fila => ({
      id:          window.Storage.generarId(),
      descripcion: fila.querySelector('.gasto-desc')?.value.trim() || '',
      monto:       window.FormatoNumero.desformatearMiles(fila.querySelector('.gasto-monto')?.value),
    })).filter(g => g.monto > 0 || g.descripcion);

    const datos = {
      sucursal,
      fecha,
      fondoInicio:         window.FormatoNumero.desformatearMiles(document.getElementById('cierre-fondo-inicio').value),
      ventasEfectivo:      window.FormatoNumero.desformatearMiles(document.getElementById('cierre-ventas-efectivo').value),
      ventasTransferencia: window.FormatoNumero.desformatearMiles(document.getElementById('cierre-ventas-transfer').value),
      ventasTarjeta:       window.FormatoNumero.desformatearMiles(document.getElementById('cierre-ventas-tarjeta').value),
      gastos,
      observaciones: document.getElementById('cierre-observaciones').value.trim(),
    };

    if (_modalMode === 'nuevo') {
      const sesion = window.Storage.obtenerSesion();
      datos.creadoPor = sesion ? sesion.nombre : 'Admin';
      window.Storage.guardarCierre(datos);
      window.UI.mostrarToast('Cierre registrado correctamente', 'success');
    } else {
      window.Storage.actualizarCierre(_modalEditId, datos);
      window.UI.mostrarToast('Cierre actualizado correctamente', 'success');
    }

    cerrarModal();
    _renderStats();
    _renderTabs();
    _renderCierres();
  }

  // =========================================================
  // ELIMINAR
  // =========================================================

  function eliminarCierre(id) {
    const cierre = window.Storage.obtenerCierrePorId(id);
    if (!cierre) return;
    const conf = confirm(`¿Eliminar el cierre de ${cierre.sucursal} del ${_formatFecha(cierre.fecha)}?\n\nEsta acción no se puede deshacer.`);
    if (!conf) return;
    window.Storage.eliminarCierre(id);
    window.UI.mostrarToast('Cierre eliminado', 'default');
    _renderStats();
    _renderTabs();
    _renderCierres();
  }

  // =========================================================
  // EVENTOS
  // =========================================================

  function _vincularEventos() {
    // Tabs de sucursal
    document.getElementById('sucursal-tabs')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-sucursal]');
      if (!btn) return;
      _filtroSucursal = btn.dataset.sucursal;
      _renderTabs();
      _renderCierres();
    });

    // Filtro de fecha
    document.getElementById('filtro-fecha')?.addEventListener('change', e => {
      _filtroFecha = e.target.value;
      _renderCierres();
    });

    // Limpiar filtro fecha
    document.getElementById('btn-limpiar-fecha')?.addEventListener('click', () => {
      _filtroFecha = '';
      const el = document.getElementById('filtro-fecha');
      if (el) el.value = '';
      _renderCierres();
    });

    // Inputs del modal → actualizar preview
    ['cierre-ventas-efectivo', 'cierre-ventas-transfer', 'cierre-ventas-tarjeta', 'cierre-fondo-inicio'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', _actualizarPreview);
    });

    // Submit del formulario
    document.getElementById('form-cierre')?.addEventListener('submit', e => {
      e.preventDefault();
      guardarCierre();
    });

    // Cerrar modal al click en overlay
    document.getElementById('modal-cierre')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) cerrarModal();
    });

    // Submit form sucursal
    document.getElementById('form-sucursal')?.addEventListener('submit', e => {
      e.preventDefault();
      guardarSucursal();
    });

    // Cerrar modal sucursal al click en overlay
    document.getElementById('modal-sucursal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) cerrarModalSucursal();
    });
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
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
  }

  function _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // =========================================================
  // API PÚBLICA
  // =========================================================

  window.SucursalesPage = {
    inicializar,
    abrirModalNuevo,
    abrirModalEditar,
    cerrarModal,
    guardarCierre,
    eliminarCierre,
    agregarGasto,
    eliminarGasto,
    toggleCierre,
    abrirModalSucursal,
    cerrarModalSucursal,
    guardarSucursal,
    eliminarSucursalConfirm,
    togglePassword,
  };

})();
