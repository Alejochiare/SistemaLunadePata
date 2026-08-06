/**
 * configuracion-page.js — Luna de Plata
 * Sección Configuración: alta de nomenclaturas de productos por sector.
 */

(function () {
  'use strict';

  let _catKey    = null;
  let _busqueda  = '';

  // =========================================================
  // INIT
  // =========================================================

  function inicializar() {
    _poblarSelects();
    _catKey = window.Nomenclaturas.categorias[0]?.key || null;
    _render();
    _vincularEventos();
  }

  function _poblarSelects() {
    const opciones = window.Nomenclaturas.categorias
      .map(c => `<option value="${c.key}">${_esc(c.label)}</option>`).join('');
    const selToolbar = document.getElementById('config-categoria');
    const selModal    = document.getElementById('nom-sector');
    if (selToolbar) selToolbar.innerHTML = opciones;
    if (selModal)    selModal.innerHTML    = opciones;
  }

  // =========================================================
  // RENDER
  // =========================================================

  function _listaCombinada() {
    const base   = (window.Nomenclaturas[_catKey] || []).map(n => ({ ...n, _base: true }));
    const custom = window.Storage.obtenerNomenclaturasCustomDeCategoria(_catKey).map(n => ({ ...n, _base: false }));
    return [...base, ...custom];
  }

  function _render() {
    const container = document.getElementById('nomenclaturas-lista');
    const countEl    = document.getElementById('nom-count');
    if (!container || !_catKey) return;

    let lista = _listaCombinada();
    if (_busqueda.trim()) {
      const q = _busqueda.trim().toLowerCase();
      lista = lista.filter(n =>
        (n.codigo || '').toLowerCase().includes(q) ||
        (n.descripcion || '').toLowerCase().includes(q));
    }

    if (countEl) countEl.textContent = lista.length;

    if (lista.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div class="empty-state-title">Sin nomenclaturas</div>
          <div class="empty-state-desc">No hay resultados para este sector. Agregá una con el botón "+ Nueva nomenclatura".</div>
        </div>`;
      return;
    }

    container.innerHTML = lista.map(n => `
      <div class="nom-row">
        <span class="nom-codigo ${n.codigo ? '' : 'empty'}">${_esc(n.codigo || 'sin código')}</span>
        <span class="nom-desc">${_esc(n.descripcion)}</span>
        <div class="nom-row-actions">
          ${n._base
            ? `<span class="badge badge-neutral">De fábrica</span>`
            : `<button class="btn btn-danger-ghost btn-sm" onclick="window.ConfiguracionPage.eliminar('${n.id}')">
                 <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                 Eliminar
               </button>`}
        </div>
      </div>`).join('');
  }

  // =========================================================
  // MODAL — NUEVA NOMENCLATURA
  // =========================================================

  function abrirModalNueva() {
    document.getElementById('form-nomenclatura').reset();
    const errEl = document.getElementById('error-nom-descripcion');
    if (errEl) errEl.style.display = 'none';
    _ocultarPreview();

    const selModal = document.getElementById('nom-sector');
    if (selModal && _catKey) selModal.value = _catKey;

    document.getElementById('modal-nomenclatura')?.classList.add('open');
    document.getElementById('nom-codigo')?.focus();
  }

  function cerrarModal() {
    document.getElementById('modal-nomenclatura')?.classList.remove('open');
  }

  function guardar() {
    const catKey      = document.getElementById('nom-sector').value;
    const codigo      = document.getElementById('nom-codigo').value.trim().toUpperCase();
    const descripcion = document.getElementById('nom-descripcion').value.trim();

    const errEl = document.getElementById('error-nom-descripcion');
    if (!descripcion) {
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Ingresá una descripción'; }
      return;
    }
    if (errEl) errEl.style.display = 'none';

    window.Storage.agregarNomenclaturaCustom(catKey, { codigo, descripcion });
    window.UI.mostrarToast('Nomenclatura agregada correctamente', 'success');

    cerrarModal();

    // Si el sector cargado es el que se está viendo, refrescar la lista.
    if (catKey === _catKey) _render();

    const selToolbar = document.getElementById('config-categoria');
    if (selToolbar && catKey !== _catKey) {
      _catKey = catKey;
      selToolbar.value = catKey;
      _render();
    }
  }

  function eliminar(id) {
    const conf = confirm('¿Eliminar esta nomenclatura?\n\nDejará de aparecer como sugerencia en el formulario de paños.');
    if (!conf) return;
    window.Storage.eliminarNomenclaturaCustom(_catKey, id);
    window.UI.mostrarToast('Nomenclatura eliminada', 'default');
    _render();
  }

  // =========================================================
  // PREVIEW EN VIVO
  // =========================================================

  function _actualizarPreview() {
    const codigo      = document.getElementById('nom-codigo').value.trim().toUpperCase();
    const descripcion = document.getElementById('nom-descripcion').value.trim();
    if (!descripcion) { _ocultarPreview(); return; }
    const wrap  = document.getElementById('nom-preview-wrap');
    const texto = document.getElementById('nom-preview-texto');
    if (texto) texto.textContent = window.Nomenclaturas.formatear({ codigo, descripcion });
    if (wrap) wrap.style.display = 'block';
  }

  function _ocultarPreview() {
    const wrap = document.getElementById('nom-preview-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  // =========================================================
  // EVENTOS
  // =========================================================

  function _vincularEventos() {
    document.getElementById('config-categoria')?.addEventListener('change', e => {
      _catKey = e.target.value;
      _busqueda = '';
      const buscador = document.getElementById('config-busqueda');
      if (buscador) buscador.value = '';
      _render();
    });

    document.getElementById('config-busqueda')?.addEventListener('input', e => {
      _busqueda = e.target.value;
      _render();
    });

    document.getElementById('form-nomenclatura')?.addEventListener('submit', e => {
      e.preventDefault();
      guardar();
    });

    ['nom-codigo', 'nom-descripcion'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', _actualizarPreview);
    });

    document.getElementById('modal-nomenclatura')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) cerrarModal();
    });
  }

  // =========================================================
  // UTILIDADES
  // =========================================================

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

  window.ConfiguracionPage = {
    inicializar,
    abrirModalNueva,
    cerrarModal,
    guardar,
    eliminar,
  };

})();
