/**
 * revendedoras.js — Luna de Plata
 * Módulo principal de la sección "Gestión de Revendedoras".
 * Orquesta la UI: renderizado de cards, acciones, eventos.
 */

// =========================================================
// ESTADO LOCAL
// =========================================================

let filtroActual = '';
let revendedoraActivaId = null; // ID de la revendedora abierta en el modal de ver

// =========================================================
// INICIALIZACIÓN
// =========================================================

/**
 * Inicializa toda la sección de revendedoras.
 * Llamado desde el DOMContentLoaded del HTML.
 */
function inicializar() {
  renderizarCards();
  actualizarEstadisticas();
  vincularEventos();
  window.Formularios.inicializarCierrePorOverlay();
}

// =========================================================
// RENDER PRINCIPAL
// =========================================================

/**
 * Renderiza las cards de todas las revendedoras (con filtro si aplica).
 */
function renderizarCards() {
  const contenedor = document.getElementById('revendedoras-grid');
  if (!contenedor) return;

  let revendedoras = window.Storage.obtenerRevendedoras();

  // Aplicar filtro de búsqueda
  if (filtroActual) {
    const q = filtroActual.toLowerCase();
    revendedoras = revendedoras.filter(r =>
      r.nombre?.toLowerCase().includes(q)   ||
      r.localidad?.toLowerCase().includes(q) ||
      r.dni?.toLowerCase().includes(q)
    );
  }

  // Actualizar contador
  const countEl = document.getElementById('revendedoras-count');
  if (countEl) countEl.textContent = revendedoras.length;

  if (revendedoras.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p class="empty-state-title">${filtroActual ? 'Sin resultados' : 'Sin revendedoras'}</p>
        <p class="empty-state-desc">
          ${filtroActual
            ? 'No se encontraron revendedoras con esa búsqueda.'
            : 'Todavía no hay revendedoras. Hacé click en "+ Nueva Revendedora" para empezar.'}
        </p>
        ${!filtroActual ? `<button class="btn btn-gold" onclick="Formularios.abrirModalNuevaRevendedora()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Revendedora
        </button>` : ''}
      </div>`;
    return;
  }

  contenedor.innerHTML = revendedoras
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map(r => renderizarCard(r))
    .join('');

  // Vincular botones de las cards
  contenedor.querySelectorAll('[data-action="ver"]').forEach(btn => {
    btn.addEventListener('click', () => abrirVerRevendedora(btn.dataset.id));
  });

  contenedor.querySelectorAll('[data-action="asignar-pano"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `panos.html?nueva=true&rev=${encodeURIComponent(btn.dataset.id)}`;
    });
  });

  contenedor.querySelectorAll('[data-action="menu"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _abrirMenuCard(btn, btn.dataset.id);
    });
  });
}

/**
 * Genera el HTML de una card de revendedora.
 * @param {Object} r - revendedora
 * @returns {string} HTML
 */
function renderizarCard(r) {
  const panos = window.Storage.obtenerPanosDeRevendedora(r.id);
  const panosAbiertos = panos.filter(p => !p.cerrado);
  const panosCerrados = panos.filter(p => p.cerrado).length;
  const panosVencidos = panosAbiertos.filter(p => {
    const calc = window.Calculos.calcularEstadoVencimiento(p.fechaEntrega, p.diasAdicionales);
    return calc.estado === 'vencido';
  }).length;
  const panosPorVencer = panosAbiertos.filter(p => {
    const calc = window.Calculos.calcularEstadoVencimiento(p.fechaEntrega, p.diasAdicionales);
    return calc.estado === 'por-vencer';
  }).length;
  const panosActivos = panosAbiertos.length - panosVencidos;

  const iniciales = obtenerIniciales(r.nombre);

  const badge = panosVencidos > 0
    ? `<span class="badge badge-danger">${panosVencidos} vencido${panosVencidos > 1 ? 's' : ''}</span>`
    : panosPorVencer > 0
      ? `<span class="badge badge-warning">${panosPorVencer} por vencer</span>`
      : '';

  return `
    <div class="revendedora-card">
      <div class="card-header-row">
        <div class="card-avatar">${iniciales}</div>
        <div>
          <div class="card-name">${r.nombre}</div>
          <div class="card-meta">
            ${r.localidad ? `<span>${r.localidad}</span>` : ''}
            ${r.telefono ? `<span>${r.telefono}</span>` : ''}
          </div>
        </div>
        ${badge}
      </div>
      <div class="card-stats-row">
        <div class="card-stat-item">
          <span class="card-stat-value">${panosActivos}</span>
          <span class="card-stat-label">Activos</span>
        </div>
        <div class="card-stat-item">
          <span class="card-stat-value">${panosCerrados}</span>
          <span class="card-stat-label">Cerrados</span>
        </div>
        <div class="card-stat-item ${panosVencidos > 0 ? 'card-stat-danger' : ''}">
          <span class="card-stat-value">${panosVencidos}</span>
          <span class="card-stat-label">Vencidos</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-action="ver" data-id="${r.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Ver
        </button>
        <button class="btn btn-gold" data-action="asignar-pano" data-id="${r.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Asignar Paño
        </button>
        <button class="btn btn-ghost btn-icon btn-sm card-menu-btn" data-action="menu" data-id="${r.id}" title="Más acciones">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
        </button>
      </div>
    </div>`;
}

// =========================================================
// MENÚ DE ACCIONES DE LA CARD (portal, fuera del overflow de la card)
// =========================================================

let _menuPortal = null;
let _menuRevId  = null;

function _getMenuPortal() {
  if (!_menuPortal) {
    _menuPortal = document.createElement('div');
    _menuPortal.className = 'card-menu-portal';
    _menuPortal.style.display = 'none';
    document.body.appendChild(_menuPortal);

    document.addEventListener('click', (e) => {
      if (_menuPortal.style.display === 'none') return;
      if (!_menuPortal.contains(e.target) && !e.target.closest('.card-menu-btn')) {
        _cerrarMenuCard();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _cerrarMenuCard();
    });
    window.addEventListener('scroll', () => _cerrarMenuCard(), true);
    window.addEventListener('resize', () => _cerrarMenuCard());
  }
  return _menuPortal;
}

function _cerrarMenuCard() {
  if (_menuPortal) _menuPortal.style.display = 'none';
  _menuRevId = null;
}

function _abrirMenuCard(btn, revId) {
  // Toggle: si ya está abierto para esta misma revendedora, cerrarlo.
  if (_menuRevId === revId && _menuPortal && _menuPortal.style.display !== 'none') {
    _cerrarMenuCard();
    return;
  }

  const rev = window.Storage.obtenerRevendedoraPorId(revId);
  if (!rev) return;

  const portal = _getMenuPortal();
  _menuRevId = revId;

  portal.innerHTML = `
    <button class="card-menu-item" data-menu-accion="editar">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Editar
    </button>
    <button class="card-menu-item" data-menu-accion="imprimir">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Imprimir datos
    </button>
    <button class="card-menu-item" data-menu-accion="historial">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
      Ver historial de paños
    </button>
    <button class="card-menu-item" data-menu-accion="liquidaciones">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      Ver liquidaciones
    </button>
    <div class="card-menu-divider"></div>
    <button class="card-menu-item card-menu-item-danger" data-menu-accion="eliminar">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      Eliminar
    </button>`;

  portal.querySelectorAll('[data-menu-accion]').forEach(item => {
    item.addEventListener('click', () => {
      const accion = item.dataset.menuAccion;
      _cerrarMenuCard();
      _ejecutarAccionMenuCard(accion, rev);
    });
  });

  portal.style.display = 'block';
  const rect = btn.getBoundingClientRect();
  const menuWidth = portal.offsetWidth;
  let left = rect.right - menuWidth;
  if (left < 8) left = 8;
  let top = rect.bottom + 6;
  if (top + portal.offsetHeight > window.innerHeight - 8) {
    top = rect.top - portal.offsetHeight - 6;
  }
  portal.style.left = `${left}px`;
  portal.style.top  = `${top}px`;
}

function _ejecutarAccionMenuCard(accion, rev) {
  if (accion === 'editar') {
    window.Formularios.abrirModalEditarRevendedora(rev);
    return;
  }
  if (accion === 'imprimir') {
    _abrirImpresionDatos(rev);
    return;
  }
  if (accion === 'historial') {
    window.location.href = `panos.html?verHistorial=true&rev=${encodeURIComponent(rev.id)}`;
    return;
  }
  if (accion === 'liquidaciones') {
    window.location.href = `liquidacion-revendedora.html?rev=${encodeURIComponent(rev.id)}`;
    return;
  }
  if (accion === 'eliminar') {
    if (!confirm(`¿Eliminar a "${rev.nombre}" y todos sus paños? Esta acción no se puede deshacer.`)) return;
    window.Storage.eliminarRevendedora(rev.id);
    renderizarCards();
    actualizarEstadisticas();
    window.UI.mostrarToast(`${rev.nombre} eliminada`, 'danger');
  }
}

// =========================================================
// IMPRESIÓN DATOS DE ENVÍO
// =========================================================

function _abrirImpresionDatos(rev) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Datos de envío — ${esc(rev.nombre)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; align-items: flex-start; justify-content: center; padding: 24px; min-height: 100vh; }
  .etiqueta { background: #fff; border: 2px solid #1a1a1a; border-radius: 10px; padding: 32px 36px; width: 480px; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
  .etiqueta-titulo { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888; margin-bottom: 22px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
  .etiqueta-titulo img { display: block; height: 26px; width: auto; }
  .campo { margin-bottom: 18px; }
  .campo label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
  .campo input { width: 100%; border: none; border-bottom: 1.5px solid #ccc; font-size: 19px; font-weight: 600; color: #1a1a1a; padding: 4px 2px; background: transparent; outline: none; font-family: Arial, sans-serif; }
  .campo input:focus { border-bottom-color: #b8860b; }
  .fila-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .acciones { margin-top: 20px; display: flex; gap: 10px; }
  .btn { padding: 9px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: Arial, sans-serif; }
  .btn-print { background: #1a1a1a; color: #fff; flex: 1; }
  .btn-print:hover { background: #333; }
  .btn-close { background: #f0f0f0; color: #555; }
  .btn-close:hover { background: #e0e0e0; }
  @page { margin: 0; size: auto; }
  @media print {
    body { background: none; padding: 20px; }
    .etiqueta { box-shadow: none; border: 2px solid #000; width: 100%; max-width: 100%; }
    .acciones { display: none; }
    .campo input { border-bottom: 1px solid #aaa; }
  }
</style>
</head>
<body>
<div class="etiqueta">
  <div class="etiqueta-titulo">
    <span>Datos de envío</span>
    <img src="img/logo-dark.png" alt="Luna de Plata">
  </div>

  <div class="campo">
    <label>Nombre y apellido</label>
    <input type="text" id="f-nombre" value="${esc(rev.nombre)}">
  </div>
  <div class="fila-2">
    <div class="campo">
      <label>DNI</label>
      <input type="text" id="f-dni" value="${esc(rev.dni || '')}">
    </div>
    <div class="campo">
      <label>Teléfono</label>
      <input type="text" id="f-tel" value="${esc(rev.telefono || '')}">
    </div>
  </div>
  <div class="campo">
    <label>Calle y número</label>
    <input type="text" id="f-calle" value="${esc(rev.direccion || '')}">
  </div>
  <div class="campo">
    <label>Localidad</label>
    <input type="text" id="f-localidad" value="${esc(rev.localidad || '')}">
  </div>

  <div class="acciones">
    <button class="btn btn-print" onclick="window.print()">Imprimir</button>
    <button class="btn btn-close" onclick="window.close()">Cerrar</button>
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=580,height=680,resizable=yes');
  if (!win) { alert('El navegador bloqueó la ventana emergente. Permitila para imprimir.'); return; }
  win.document.write(html);
  win.document.close();
}

// =========================================================
// MODAL VER REVENDEDORA
// =========================================================

/**
 * Abre el modal de detalle de revendedora con tabs.
 * @param {string} id
 */
function abrirVerRevendedora(id) {
  const rev = window.Storage.obtenerRevendedoraPorId(id);
  if (!rev) return;

  revendedoraActivaId = id;

  const overlay = document.getElementById('modal-ver-revendedora');
  if (!overlay) return;

  // Rellenar cabecera
  const iniciales = obtenerIniciales(rev.nombre);
  setHTML('ver-avatar',   iniciales);
  setHTML('ver-nombre',   rev.nombre);
  setHTML('ver-localidad', rev.localidad || 'Sin localidad');

  // Rellenar info
  setHTML('ver-info-nombre',    rev.nombre || '—');
  setHTML('ver-info-dni',       rev.dni || '—');
  setHTML('ver-info-nacimiento', window.Calculos.formatearFecha(rev.fechaNacimiento));
  setHTML('ver-info-telefono',  rev.telefono || '—');
  setHTML('ver-info-mail',      rev.mail || '—');
  setHTML('ver-info-direccion', rev.direccion || '—');
  setHTML('ver-info-localidad', rev.localidad || '—');
  setHTML('ver-info-inicio',    window.Calculos.formatearFecha(rev.fechaInicio));

  // Activar tab de info por defecto
  activarTab('tab-info');

  // Botón imprimir datos de envío
  const btnImprimir = document.getElementById('btn-imprimir-datos-rev');
  if (btnImprimir) {
    btnImprimir.onclick = () => _abrirImpresionDatos(rev);
  }

  // Botón editar revendedora
  const btnEditar = document.getElementById('btn-editar-revendedora');
  if (btnEditar) {
    btnEditar.onclick = () => {
      window.Formularios.cerrarModalVerRevendedora();
      window.Formularios.abrirModalEditarRevendedora(rev);
    };
  }

  // Botón eliminar revendedora
  const btnEliminar = document.getElementById('btn-eliminar-revendedora');
  if (btnEliminar) {
    btnEliminar.onclick = () => {
      if (!confirm(`¿Eliminar a "${rev.nombre}" y todos sus paños? Esta acción no se puede deshacer.`)) return;
      window.Storage.eliminarRevendedora(id);
      window.Formularios.cerrarModalVerRevendedora();
      renderizarCards();
      actualizarEstadisticas();
      window.UI.mostrarToast(`${rev.nombre} eliminada`, 'danger');
    };
  }

  overlay.classList.add('open');
}

// =========================================================
// ESTADÍSTICAS
// =========================================================

/**
 * Actualiza las cards de estadísticas en el header de la sección.
 */
function actualizarEstadisticas() {
  const stats = window.Calculos.calcularEstadisticasGlobales();

  setHTML('stat-revendedoras', stats.totalRevendedoras);
  setHTML('stat-panos',        stats.totalPanos);
  setHTML('stat-vencidos',     stats.panosVencidos);
}

// =========================================================
// TABS DEL MODAL VER
// =========================================================

function activarTab(tabId) {
  document.querySelectorAll('.modal-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
}

// =========================================================
// EVENTOS
// =========================================================

/**
 * Vincula todos los eventos de la sección.
 */
function vincularEventos() {
  // Botón nueva revendedora
  const btnNueva = document.getElementById('btn-nueva-revendedora');
  if (btnNueva) {
    btnNueva.addEventListener('click', () => window.Formularios.abrirModalNuevaRevendedora());
  }

  // Cerrar modales
  document.getElementById('btn-cerrar-modal-rev')?.addEventListener('click', () => window.Formularios.cerrarModalRevendedora());
  document.getElementById('btn-cancelar-rev')?.addEventListener('click', () => window.Formularios.cerrarModalRevendedora());
  document.getElementById('btn-cerrar-modal-pano')?.addEventListener('click', () => window.Formularios.cerrarModalPano());
  document.getElementById('btn-cancelar-pano')?.addEventListener('click', () => window.Formularios.cerrarModalPano());
  document.getElementById('btn-cerrar-ver')?.addEventListener('click', () => window.Formularios.cerrarModalVerRevendedora());

  // Submit formulario revendedora
  const formRev = document.getElementById('form-revendedora');
  if (formRev) {
    formRev.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarRevendedora();
    });
  }

  // Submit formulario paño
  const formPano = document.getElementById('form-pano');
  if (formPano) {
    formPano.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarPano();
    });
  }

  // Búsqueda
  const inputBusqueda = document.getElementById('busqueda-revendedora');
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
      filtroActual = e.target.value.trim();
      renderizarCards();
    });
  }

  // Campos que disparan recálculo en tiempo real (paño)
  const elFecha = document.getElementById('pano-fechaEntrega');
  if (elFecha) {
    elFecha.addEventListener('change', () => window.Formularios.actualizarPreviewFechas());
  }
  const elDiasAd = document.getElementById('pano-diasAdicionales');
  if (elDiasAd) {
    elDiasAd.addEventListener('input', () => window.Formularios.actualizarPreviewFechas());
  }

  // Tabs en el modal de ver — "Paños" y "Liquidaciones" redirigen a su página completa
  // en vez de mostrar una vista embebida (quedan chicas dentro del modal).
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === 'tab-panos' && revendedoraActivaId) {
        window.location.href = `panos.html?verHistorial=true&rev=${encodeURIComponent(revendedoraActivaId)}`;
        return;
      }
      if (tab.dataset.tab === 'tab-liquidaciones' && revendedoraActivaId) {
        window.location.href = `liquidacion-revendedora.html?rev=${encodeURIComponent(revendedoraActivaId)}`;
        return;
      }
      activarTab(tab.dataset.tab);
    });
  });
}

// =========================================================
// ACCIONES
// =========================================================

/**
 * Guarda o actualiza una revendedora desde el formulario.
 */
function guardarRevendedora() {
  const datos = window.Formularios.recolectarDatosRevendedora();
  if (!datos) return;

  const { _credenciales, ...datosPuros } = datos;

  const form = document.getElementById('form-revendedora');
  const editId = form?.dataset.editId;

  let revId;
  if (editId) {
    window.Storage.actualizarRevendedora(editId, datosPuros);
    revId = editId;
    window.UI.mostrarToast('Revendedora actualizada', 'success');
  } else {
    const nueva = window.Storage.guardarRevendedora(datosPuros);
    revId = nueva.id;
    window.UI.mostrarToast('Revendedora creada exitosamente', 'success');
  }

  // Manejar credenciales de acceso
  if (_credenciales && _credenciales.username) {
    const rev = window.Storage.obtenerRevendedoraPorId(revId);
    const usuarioExistente = window.Storage.obtenerUsuarioPorRevendedoraId(revId);
    if (usuarioExistente) {
      const cambios = { username: _credenciales.username, nombre: rev?.nombre || '' };
      if (_credenciales.password) cambios.password = _credenciales.password;
      window.Storage.actualizarUsuario(usuarioExistente.id, cambios);
    } else if (_credenciales.password) {
      window.Storage.guardarUsuario({
        role:          'revendedora',
        username:      _credenciales.username,
        password:      _credenciales.password,
        nombre:        rev?.nombre || '',
        revendedoraId: revId,
      });
    }
  }

  window.Formularios.cerrarModalRevendedora();
  renderizarCards();
  actualizarEstadisticas();
}

/**
 * Guarda o actualiza un paño desde el formulario.
 */
function guardarPano() {
  const datos = window.Formularios.recolectarDatosPano();
  if (!datos) return;

  const form = document.getElementById('form-pano');
  const editId = form?.dataset.editId;

  // Calcular fechaVencimiento automáticamente (incluyendo días adicionales si los hay)
  const fechaVencimiento = window.Calculos.calcularFechaVencimientoEfectiva(datos.fechaEntrega, datos.diasAdicionales);

  // Agregar la fecha de vencimiento
  datos.fechaVencimiento = fechaVencimiento;

  if (editId) {
    window.Storage.actualizarPano(editId, datos);
    window.UI.mostrarToast('Paño actualizado', 'success');
  } else {
    const nuevo = window.Storage.guardarPano(datos);
    window.UI.mostrarToast(`${window.Calculos.formatearNumeroPano(nuevo.numero)} asignado`, 'gold');
  }

  window.Formularios.cerrarModalPano();
  renderizarCards();
  actualizarEstadisticas();

  // Si el modal de ver estaba abierto, refrescar paños
  if (revendedoraActivaId) {
    window.Panos.renderizarPanos(revendedoraActivaId);
  }
}

// =========================================================
// UTILIDADES
// =========================================================

function obtenerIniciales(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

function setHTML(id, valor) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = valor ?? '—';
}

// Exportar al scope global
window.Revendedoras = {
  inicializar,
  renderizarCards,
  actualizarEstadisticas,
  abrirVerRevendedora,
};
