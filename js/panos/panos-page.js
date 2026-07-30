/**
 * panos-page.js — Luna de Plata
 * Sección Paños: listado por revendedora con paños expandibles y venta de items.
 */

const CATS_PAGE = [
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

const GRUPOS_PAGE = [
  { id: 'plata',      label: 'VENTA TOTAL JOYAS PLATA',                          keys: ['anillos', 'aros', 'cadenasConjuntos', 'dijes', 'pulseras'] },
  { id: 'accesorios', label: 'VENTA TOTAL ACCESORIOS, GOLD FIELD Y FABRICACIÓN',  keys: ['accesoriosGoldFabricacion'] },
  { id: 'acero',      label: 'VENTA TOTAL ACERO IONIZADO',                        keys: ['anillosAcero', 'arosAcero', 'cadenasAcero', 'dijesAcero', 'pulserasAcero'] },
  { id: 'relojes',    label: 'TOTAL VENTA RELOJES, ABRIDORES CH Y ORO',           keys: ['relojes'] },
  { id: 'joyasPerso', label: 'TOTAL VENTA JOYAS PERSONALIZADAS',                  keys: ['joyasPersonalizadas'] },
  { id: 'maryKay',    label: 'TOTAL VENTA PRODUCTOS MARY KAY',                    keys: ['maryKay'] },
  { id: 'precioFijo', label: 'TOTAL VENTA PRECIO FIJO/ARREGLOS/GRABADOS',         keys: ['precioFijoArreglos'] },
];

let filtroEstado   = 'todos';
let filtroBusqueda = '';
let filtroRevId    = null; // deep-link exacto desde la card de revendedora (sección principal)

// Historial
let filtroHistAnio    = '';
let filtroHistMes     = '';
let filtroHistPersona = '';
let filtroHistRevId   = null; // deep-link exacto desde la card de revendedora

// =========================================================
// INICIALIZACIÓN
// =========================================================

function inicializar() {
  renderizar();
  vincularEventos();
  _poblarSelectsHistorial();
}

// =========================================================
// RENDER PRINCIPAL
// =========================================================

function renderizar() {
  const revendedoras = window.Storage.obtenerRevendedoras()
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  actualizarStats();

  const contenedor = document.getElementById('panos-grupos');
  if (!contenedor) return;

  if (revendedoras.length === 0) {
    contenedor.innerHTML = _emptyState('Sin revendedoras', 'Agregá revendedoras desde la sección Revendedoras.');
    actualizarContador(0);
    return;
  }

  const grupos = [];

  revendedoras.forEach(rev => {
    if (filtroRevId) {
      if (rev.id !== filtroRevId) return;
    } else if (filtroBusqueda) {
      const q = filtroBusqueda.toLowerCase();
      if (!rev.nombre?.toLowerCase().includes(q) && !rev.localidad?.toLowerCase().includes(q)) return;
    }

    const todosLosPanos  = window.Storage.obtenerPanosDeRevendedora(rev.id)
      .sort((a, b) => b.numero - a.numero);
    const panosFiltrados = filtrarPanos(todosLosPanos);

    if (filtroEstado !== 'todos' && panosFiltrados.length === 0) return;

    grupos.push(renderizarGrupo(rev, todosLosPanos, panosFiltrados));
  });

  actualizarContador(grupos.length);

  if (grupos.length === 0) {
    contenedor.innerHTML = _emptyState(
      filtroBusqueda ? 'Sin resultados' : 'Sin coincidencias',
      'Probá con otro filtro o búsqueda.'
    );
    return;
  }

  contenedor.innerHTML = `<div class="rev-grupos-list">${grupos.join('')}</div>`;

  renderizarHistorial();
}

// =========================================================
// FILTRADO DE PAÑOS (sección principal — solo abiertos)
// =========================================================

function filtrarPanos(panos) {
  // La sección principal nunca muestra paños cerrados
  const abiertos = panos.filter(p => !p.cerrado);
  if (filtroEstado === 'todos') return abiertos;
  return abiertos.filter(p => {
    const { estado } = window.Calculos.calcularEstadoVencimiento(p.fechaEntrega, p.diasAdicionales);
    return estado === filtroEstado;
  });
}

// =========================================================
// HISTORIAL
// =========================================================

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function _poblarSelectsHistorial() {
  // Año: rango dinámico basado en los paños existentes
  const todos = window.Storage.obtenerTodosLosPanos();
  const anios = [...new Set(todos.map(p => p.fechaEntrega?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const selAnio = document.getElementById('hist-filtro-anio');
  if (selAnio) {
    selAnio.innerHTML = '<option value="">Todos los años</option>'
      + anios.map(a => `<option value="${a}">${a}</option>`).join('');
  }
  // Mes: siempre fijo
  const selMes = document.getElementById('hist-filtro-mes');
  if (selMes) {
    selMes.innerHTML = '<option value="">Todos los meses</option>'
      + MESES.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('');
  }
}

function renderizarHistorial() {
  const el = document.getElementById('historial-grupos');
  if (!el) return;

  const revendedoras = window.Storage.obtenerRevendedoras()
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const grupos = [];

  revendedoras.forEach(rev => {
    if (filtroHistRevId) {
      if (rev.id !== filtroHistRevId) return;
    } else if (filtroHistPersona) {
      const q = filtroHistPersona.toLowerCase();
      if (!rev.nombre?.toLowerCase().includes(q) && !rev.localidad?.toLowerCase().includes(q)) return;
    }

    const todosPanos = window.Storage.obtenerPanosDeRevendedora(rev.id)
      .sort((a, b) => b.numero - a.numero);

    const filtrados = todosPanos.filter(p => {
      if (filtroHistAnio && p.fechaEntrega?.slice(0, 4) !== filtroHistAnio) return false;
      if (filtroHistMes  && p.fechaEntrega?.slice(5, 7) !== filtroHistMes)  return false;
      return true;
    });

    if (filtrados.length === 0) return;
    grupos.push(renderizarGrupo(rev, todosPanos, filtrados));
  });

  if (grupos.length === 0) {
    el.innerHTML = _emptyState('Sin resultados', 'No hay paños que coincidan con los filtros seleccionados.');
    return;
  }

  el.innerHTML = `<div class="rev-grupos-list">${grupos.join('')}</div>`;
}

/**
 * Deep-link desde la card de revendedora: filtra toda la página (sección
 * principal + historial) a una sola revendedora y hace scroll al historial.
 */
function filtrarHistorialPorRevendedora(revId) {
  const rev = window.Storage.obtenerRevendedoraPorId(revId);
  if (!rev) return;

  filtroRevId       = revId;
  filtroBusqueda    = '';
  filtroEstado      = 'todos';
  filtroHistRevId   = revId;
  filtroHistPersona = '';
  filtroHistAnio    = '';
  filtroHistMes     = '';

  const inputBusquedaPrincipal = document.getElementById('busqueda-panos');
  if (inputBusquedaPrincipal) inputBusquedaPrincipal.value = rev.nombre;
  const inputBusqueda = document.getElementById('hist-busqueda');
  if (inputBusqueda) inputBusqueda.value = rev.nombre;
  const selAnio = document.getElementById('hist-filtro-anio');
  if (selAnio) selAnio.value = '';
  const selMes = document.getElementById('hist-filtro-mes');
  if (selMes) selMes.value = '';

  renderizar();
  document.querySelector('.historial-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =========================================================
// RENDER GRUPO REVENDEDORA
// =========================================================

function renderizarGrupo(rev, todosLosPanos, panosFiltrados) {
  const iniciales = _iniciales(rev.nombre);

  let cActivos = 0, cPorVencer = 0, cVencidos = 0;
  todosLosPanos.forEach(p => {
    const { estado } = window.Calculos.calcularEstadoVencimiento(p.fechaEntrega, p.diasAdicionales);
    if (estado === 'activo') cActivos++;
    else if (estado === 'por-vencer') cPorVencer++;
    else cVencidos++;
  });

  const badges = [
    cActivos   > 0 ? `<span class="badge badge-success">${cActivos} activo${cActivos !== 1 ? 's' : ''}</span>` : '',
    cPorVencer > 0 ? `<span class="badge badge-warning">${cPorVencer} por vencer</span>` : '',
    cVencidos  > 0 ? `<span class="badge badge-danger">${cVencidos} vencido${cVencidos !== 1 ? 's' : ''}</span>` : '',
    (!cActivos && !cPorVencer && !cVencidos) ? '<span class="badge badge-neutral">Sin paños</span>' : '',
  ].join('');

  const metaParts = [rev.localidad, rev.telefono].filter(Boolean);

  let cuerpoPanos;
  if (todosLosPanos.length === 0) {
    cuerpoPanos = '<div class="grupo-sin-panos">Sin paños asignados</div>';
  } else if (panosFiltrados.length === 0) {
    cuerpoPanos = '<div class="grupo-sin-panos">Sin paños en este estado</div>';
  } else {
    cuerpoPanos = panosFiltrados.map(p => renderizarPanoCard(p)).join('');
  }

  return `
    <div class="rev-grupo">
      <div class="rev-grupo-header">
        <div class="rev-grupo-avatar">${iniciales}</div>
        <div class="rev-grupo-info">
          <div class="rev-grupo-nombre">${rev.nombre}</div>
          ${metaParts.length ? `<div class="rev-grupo-meta">${metaParts.join(' · ')}</div>` : ''}
        </div>
        <div class="rev-grupo-badges">${badges}</div>
        <a href="revendedoras.html" class="btn btn-ghost btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Ver ficha
        </a>
      </div>
      <div class="rev-grupo-panos">${cuerpoPanos}</div>
    </div>`;
}

// =========================================================
// RENDER CARD DE PAÑO (expandible)
// =========================================================

function renderizarPanoCard(pano) {
  const { estado, diasTranscurridos } = window.Calculos.calcularEstadoVencimiento(pano.fechaEntrega, pano.diasAdicionales);
  const { formatearFecha, formatearNumeroPano, calcularResumenPano } = window.Calculos;

  let claseBadge, textoEstado;
  if (pano.cerrado) {
    claseBadge = 'badge-gold';     textoEstado = 'Cerrado';
  } else if (estado === 'vencido') {
    claseBadge = 'badge-danger';   textoEstado = 'Vencido';
  } else if (estado === 'por-vencer') {
    claseBadge = 'badge-warning';  textoEstado = 'Por vencer';
  } else {
    claseBadge = 'badge-success';  textoEstado = 'Activo';
  }

  const { vendidos, total } = _contarItems(pano);
  const progreso = total > 0
    ? `<span class="pano-card-progress" id="prog-${pano.id}">${vendidos}/${total} vendidos</span>`
    : '';

  const fin = _buildHeaderFinanciero(pano);

  const prepBadge = pano.preparadoPor
    ? `<span class="pano-card-prep" title="Preparado por ${_esc(pano.preparadoPor)}">✦ ${_esc(pano.preparadoPor)}</span>`
    : '';

  const modBadge = pano.fechaModificacion
    ? (() => {
        const d = new Date(pano.fechaModificacion);
        const fechaMod = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaMod  = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const quienMod = pano.modificadoPor ? ` · ${_esc(pano.modificadoPor)}` : '';
        const nMods = Array.isArray(pano.historialModificaciones) ? pano.historialModificaciones.length : 1;
        return `<span class="pano-card-mod" title="Última modificación: ${fechaMod} ${horaMod}${quienMod}">✎ ${nMods > 1 ? nMods + ' modif.' : fechaMod}${quienMod}</span>`;
      })()
    : '';

  return `
    <div class="pano-card" id="pano-card-${pano.id}">
      <div class="pano-card-header">
        <span class="pano-card-numero">${formatearNumeroPano(pano.numero)}</span>
        <div class="pano-card-meta">
          <span>${formatearFecha(pano.fechaEntrega)}</span>
          <span class="badge ${claseBadge}">${textoEstado}</span>
          <span style="font-size:12px; color:var(--color-text-muted)">${diasTranscurridos}d</span>
        </div>
        ${progreso}
        ${prepBadge}
        ${modBadge}
        <span id="pano-hfin-${pano.id}">${fin}</span>
        <svg class="pano-card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="pano-card-body">
        ${_renderCategoriasPanoCard(pano)}
        ${_renderHistorialMods(pano)}
        ${_renderAdelantos(pano)}
        <div class="pano-card-actions">
          <button class="btn btn-ghost btn-sm btn-editar-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="btn btn-ghost btn-sm btn-imprimir-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir
          </button>
          ${!pano.cerrado ? `
          <button class="btn btn-ghost btn-sm btn-adelanto-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Adelanto
          </button>
          <button class="btn btn-gold btn-sm btn-cerrar-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Cerrar paño
          </button>
          ` : `
          <span class="badge badge-gold">Cerrado</span>
          `}
          <button class="btn btn-danger-ghost btn-sm btn-eliminar-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Eliminar paño
          </button>
        </div>
      </div>
    </div>`;
}

function _renderCategoriasPanoCard(pano) {
  const categorias = pano.categorias || {};

  const tieneItems = CATS_PAGE.some(({ key }) => {
    const v = categorias[key];
    return v && (Array.isArray(v) ? v.length > 0 : v.trim());
  });
  if (!tieneItems) {
    return '<div class="grupo-sin-panos" style="padding: 12px 0">Sin artículos cargados en este paño.</div>';
  }

  let html = '';

  GRUPOS_PAGE.forEach(grupo => {
    const catsConItems = grupo.keys
      .map(key => CATS_PAGE.find(c => c.key === key))
      .filter(c => c && Array.isArray(categorias[c.key]) && categorias[c.key].length > 0);

    if (catsConItems.length === 0) return;

    catsConItems.forEach(({ key, label }) => {
      const items = categorias[key];
      const subtotalVendido = items.reduce((s, i) => s + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);

      html += `
        <div class="pano-cat-block">
          <div class="pano-cat-titulo">${label}</div>
          <table class="items-tabla">
            ${items.map(item => `
              <tr class="items-fila ${item.vendido ? 'item-vendido' : ''} ${item.pedidoEspecial ? 'item-pedido' : ''}"
                  data-pano-id="${pano.id}" data-cat="${key}" data-item-id="${item.id}">
                <td class="item-producto">${_esc(item.producto)}${item.pedidoEspecial ? '<span class="badge badge-info item-pedido-badge" title="Pedido especial: la revendedora ya lo tenía vendido de palabra">Pedido</span>' : ''}</td>
                <td class="item-desc">${_esc(item.descripcion || '—')}</td>
                <td class="item-precio-val">${item.precioVenta != null ? '$' + _fmt(item.precioVenta) : '—'}</td>
                <td class="item-acciones">
                  <div class="item-acciones-wrap">${_renderItemAccionesHtml(item)}</div>
                </td>
              </tr>`).join('')}
          </table>
          <div class="pano-cat-subtotal" id="subtot-${pano.id}-${key}">
            ${subtotalVendido > 0 ? 'Vendido: $' + _fmt(subtotalVendido) : ''}
          </div>
        </div>`;
    });

    const grupoTotal = grupo.keys.reduce((sum, key) => {
      const items = categorias[key];
      if (!Array.isArray(items)) return sum;
      return sum + items.reduce((s, i) => s + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);
    }, 0);

    html += `
      <div class="pano-grupo-total" id="gtot-${grupo.id}-${pano.id}">
        <span class="gtot-label">${grupo.label}</span>
        <strong class="gtot-valor">$${_fmt(grupoTotal)}</strong>
      </div>`;
  });

  html += `<div class="pano-resumen" id="resumen-${pano.id}">${_buildResumenContent(pano)}</div>`;
  return html;
}

// =========================================================
// HISTORIAL DE MODIFICACIONES (render)
// =========================================================

function _renderAdelantos(pano) {
  const adelantos = pano.adelantos || [];
  const total = adelantos.reduce((s, a) => s + (Number(a.monto) || 0), 0);

  if (!adelantos.length && pano.cerrado) return '';

  const filas = adelantos.map(a => `
    <div class="pano-adelanto-fila">
      <span class="pano-adelanto-fecha">${window.Calculos.formatearFecha(a.fecha)}</span>
      <span class="pano-adelanto-monto">$${_fmt(a.monto)}</span>
      <span class="pano-adelanto-nota">${_esc(a.nota || '—')}</span>
      <span class="pano-adelanto-por">${_esc(a.registradoPor || '')}</span>
      ${!pano.cerrado ? `<button class="btn btn-danger-ghost btn-icon btn-del-adelanto" data-pano-id="${pano.id}" data-adelanto-id="${a.id}" title="Eliminar adelanto">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>` : ''}
    </div>`).join('');

  return `
    <div class="pano-adelantos-bloque">
      <div class="pano-adelantos-titulo">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Adelantos
        ${total > 0 ? `<span class="pano-adelantos-total">$${_fmt(total)} descontado${pano.cerrado ? ' del saldo' : ' al cerrar'}</span>` : ''}
      </div>
      ${filas || '<div class="pano-adelantos-vacio">Sin adelantos registrados</div>'}
    </div>`;
}

function abrirModalAdelanto(panoId) {
  document.getElementById('adelanto-pano-id').value = panoId;
  document.getElementById('adelanto-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('adelanto-monto').value = '';
  document.getElementById('adelanto-nota').value = '';
  document.getElementById('adelanto-por').value = '';
  document.getElementById('adelanto-error').style.display = 'none';
  document.getElementById('modal-adelanto').classList.add('open');
  setTimeout(() => document.getElementById('adelanto-monto')?.focus(), 80);
}

function guardarAdelanto() {
  const panoId = document.getElementById('adelanto-pano-id').value;
  const fecha  = document.getElementById('adelanto-fecha').value;
  const montoRaw = document.getElementById('adelanto-monto').value;
  const nota   = document.getElementById('adelanto-nota').value.trim();
  const por    = document.getElementById('adelanto-por').value.trim();
  const errEl  = document.getElementById('adelanto-error');

  const monto = window.FormatoNumero
    ? window.FormatoNumero.desformatearMiles(montoRaw)
    : parseFloat(montoRaw.replace(/\./g, '').replace(',', '.')) || 0;

  if (!fecha || !monto || monto <= 0 || !por) {
    errEl.textContent = 'Completá fecha, monto y quién registra el adelanto.';
    errEl.style.display = '';
    return;
  }
  errEl.style.display = 'none';

  window.Storage.agregarAdelanto(panoId, { fecha, monto, nota, registradoPor: por });
  document.getElementById('modal-adelanto').classList.remove('open');
  renderizar();
  window.UI.mostrarToast('Adelanto registrado', 'success');
}

function _renderHistorialMods(pano) {
  const historial = Array.isArray(pano.historialModificaciones) ? pano.historialModificaciones : [];
  if (historial.length === 0) return '';

  const items = [...historial].reverse().map(mod => {
    const d     = new Date(mod.fecha);
    const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const por   = mod.por ? `<strong>${_esc(mod.por)}</strong>` : '<em>desconocido</em>';

    const cambiosHtml = (mod.cambios || []).map(c => _renderCambio(c)).join('');

    return `
      <div class="pano-mod-entrada">
        <div class="pano-mod-cabecera">
          <span class="pano-mod-fecha">${fecha} ${hora}</span>
          <span class="pano-mod-por">por ${por}</span>
        </div>
        ${cambiosHtml
          ? `<ul class="pano-mod-lista">${cambiosHtml}</ul>`
          : '<p class="pano-mod-sin-cambios">Sin diferencias detectadas en el contenido</p>'
        }
      </div>`;
  }).join('');

  return `
    <div class="pano-historial-mods">
      <div class="pano-historial-mods-titulo">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Historial de modificaciones (${historial.length})
      </div>
      <div class="pano-historial-mods-body">${items}</div>
    </div>`;
}

function _renderCambio(c) {
  if (c.tipo === 'campo') {
    return `<li class="pano-mod-item pano-mod-campo">
      <span class="mod-tag mod-tag-campo">Campo</span>
      <span>${_esc(c.campo)}: <em>${_esc(c.de)}</em> → <strong>${_esc(c.a)}</strong></span>
    </li>`;
  }
  if (c.tipo === 'agregado') {
    const precio = c.precio != null ? ` · $${_fmt(c.precio)}` : '';
    const desc   = c.descripcion ? ` — ${_esc(c.descripcion)}` : '';
    return `<li class="pano-mod-item pano-mod-agregado">
      <span class="mod-tag mod-tag-agregado">+ Agregado</span>
      <span>${_esc(c.cat)}: <strong>${_esc(c.producto)}</strong>${desc}${precio}</span>
    </li>`;
  }
  if (c.tipo === 'eliminado') {
    const precio = c.precio != null ? ` · $${_fmt(c.precio)}` : '';
    const desc   = c.descripcion ? ` — ${_esc(c.descripcion)}` : '';
    return `<li class="pano-mod-item pano-mod-eliminado">
      <span class="mod-tag mod-tag-eliminado">− Eliminado</span>
      <span>${_esc(c.cat)}: <strong>${_esc(c.producto)}</strong>${desc}${precio}</span>
    </li>`;
  }
  if (c.tipo === 'modificado') {
    const subs = c.subcambios.map(s => `<li class="pano-mod-subitem">${_esc(s)}</li>`).join('');
    return `<li class="pano-mod-item pano-mod-modificado">
      <span class="mod-tag mod-tag-modificado">✎ Modificado</span>
      <span>${_esc(c.cat)}: <strong>${_esc(c.producto)}</strong></span>
      <ul class="pano-mod-sublista">${subs}</ul>
    </li>`;
  }
  return '';
}

// =========================================================
// ACCIÓN VENDIDO (un clic, precio ya estaba fijado)
// =========================================================

function confirmarVenta(btn) {
  const tr = btn.closest('.items-fila');
  if (!tr) return;

  const panoId = tr.dataset.panoId;
  const catKey = tr.dataset.cat;
  const itemId = tr.dataset.itemId;

  window.Storage.actualizarItemPano(panoId, catKey, itemId, {
    vendido:    true,
    fechaVenta: new Date().toISOString().split('T')[0],
  });

  const panoActual = window.Storage.obtenerPanoPorId(panoId);
  const itemActual = panoActual?.categorias?.[catKey]?.find(i => i.id === itemId);

  // Actualizar fila
  tr.classList.add('item-vendido');
  const tdAcciones = tr.querySelector('.item-acciones');
  if (tdAcciones && itemActual) {
    tdAcciones.innerHTML = `<div class="item-acciones-wrap">${_renderItemAccionesHtml(itemActual)}</div>`;
  }

  if (panoActual) {
    _actualizarSubtotal(panoId, catKey, panoActual);
    _actualizarGrupoTotal(panoId, catKey, panoActual);
    _actualizarProgresoCard(tr, panoActual);
    _actualizarResumen(panoId, panoActual);
  }

  actualizarStats();
}

function revertirVenta(btn) {
  const tr = btn.closest('.items-fila');
  if (!tr) return;

  const panoId = tr.dataset.panoId;
  const catKey = tr.dataset.cat;
  const itemId = tr.dataset.itemId;

  window.Storage.actualizarItemPano(panoId, catKey, itemId, {
    vendido:    false,
    fechaVenta: null,
  });

  const panoActual = window.Storage.obtenerPanoPorId(panoId);
  const itemActual = panoActual?.categorias?.[catKey]?.find(i => i.id === itemId);

  // Actualizar fila
  tr.classList.remove('item-vendido');
  const tdAcciones = tr.querySelector('.item-acciones');
  if (tdAcciones && itemActual) {
    tdAcciones.innerHTML = `<div class="item-acciones-wrap">${_renderItemAccionesHtml(itemActual)}</div>`;
  }

  if (panoActual) {
    _actualizarSubtotal(panoId, catKey, panoActual);
    _actualizarGrupoTotal(panoId, catKey, panoActual);
    _actualizarProgresoCard(tr, panoActual);
    _actualizarResumen(panoId, panoActual);
  }

  actualizarStats();
}

function _actualizarSubtotal(panoId, catKey, pano) {
  const items = pano.categorias?.[catKey];
  if (!Array.isArray(items)) return;
  const subtotal = items.reduce((sum, i) => sum + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);
  const el = document.getElementById(`subtot-${panoId}-${catKey}`);
  if (el) el.textContent = subtotal > 0 ? `Vendido: $${_fmt(subtotal)}` : '';
}

function _actualizarGrupoTotal(panoId, catKey, pano) {
  const grupo = GRUPOS_PAGE.find(g => g.keys.includes(catKey));
  if (!grupo) return;
  const el = document.getElementById(`gtot-${grupo.id}-${panoId}`);
  if (!el) return;
  const total = grupo.keys.reduce((sum, key) => {
    const items = pano.categorias?.[key];
    if (!Array.isArray(items)) return sum;
    return sum + items.reduce((s, i) => s + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);
  }, 0);
  const valEl = el.querySelector('.gtot-valor');
  if (valEl) valEl.textContent = '$' + _fmt(total);
}

function _actualizarProgresoCard(tr, pano) {
  const { vendidos, total } = _contarItems(pano);
  const prog = document.getElementById(`prog-${pano.id}`);
  if (prog && total > 0) prog.textContent = `${vendidos}/${total} vendidos`;
}

function _actualizarResumen(panoId, pano) {
  const elBody = document.getElementById(`resumen-${panoId}`);
  if (elBody) elBody.innerHTML = _buildResumenContent(pano);
  const elHeader = document.getElementById(`pano-hfin-${panoId}`);
  if (elHeader) elHeader.innerHTML = _buildHeaderFinanciero(pano);
}

// =========================================================
// RESUMEN FINANCIERO
// =========================================================

function _buildHeaderFinanciero(pano) {
  const r = window.Calculos.calcularResumenPano(pano);
  if (r.ventaTotal === 0) return '';
  const t = r.tiers[r.tierAplicable];
  return `
    <span class="pano-header-venta">$${_fmt(r.ventaTotal)} vendido</span>
    <span class="badge badge-gold">${t.pctLabel} ganancia</span>
    <span class="pano-header-luna">→ Luna $${_fmt(Math.max(0, t.pagaLunaDePlata))}</span>`;
}

function _buildResumenContent(pano) {
  const r = window.Calculos.calcularResumenPano(pano);
  const { ventaJoyasPlata, ventaAccesorios, ventaAcero, ventaRelojes, ventaJoyasPerso, ventaMaryKay,
          ventaTotal, montoTotal, porcentajeVenta, tiers, tierAplicable } = r;

  if (montoTotal === 0) return '';

  let html = '<div class="resumen-secciones">';

  // Joyas de plata — porcentaje variable según monto vendido
  if (ventaJoyasPlata > 0) {
    html += `
      <div class="resumen-bloque">
        <div class="resumen-bloque-header">
          <span>VENTA TOTAL JOYAS PLATA</span>
          <strong class="resumen-monto">$${_fmt(ventaJoyasPlata)}</strong>
        </div>
        <div class="resumen-tiers">
          ${tiers.map((t, i) => `
            <div class="resumen-tier ${i === tierAplicable ? 'resumen-tier-activo' : ''}">
              <span class="resumen-tier-lbl">SI LA VENTA TOTAL FUE ${t.label} → GANANCIA EN PLATA ${t.pctLabel}</span>
              <div class="resumen-tier-vals">
                <span>Tu ganancia: <strong>$${_fmt(t.gananciaJoyasPlata)}</strong></span>
                <span>Luna de Plata: <strong>$${_fmt(ventaJoyasPlata - t.gananciaJoyasPlata)}</strong></span>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // Categorías con porcentaje fijo
  const fixedCats = [
    { venta: ventaAccesorios, label: 'VENTA TOTAL ACCESORIOS, GOLD FIELD Y FABRICACIÓN', pct: 0.20 },
    { venta: ventaAcero,      label: 'VENTA TOTAL ACERO IONIZADO',                       pct: 0.25 },
    { venta: ventaRelojes,    label: 'TOTAL VENTA RELOJES, ABRIDORES CH Y ORO',          pct: 0.20 },
    { venta: ventaJoyasPerso, label: 'TOTAL VENTA JOYAS PERSONALIZADAS',                 pct: 0.20 },
    { venta: ventaMaryKay,    label: 'TOTAL VENTA PRODUCTOS MARY KAY',                   pct: 0.20 },
  ].filter(c => c.venta > 0);

  fixedCats.forEach(({ venta, label, pct }) => {
    const pctRev  = Math.round(pct * 100) + '%';
    const pctLuna = Math.round((1 - pct) * 100) + '%';
    html += `
      <div class="resumen-bloque">
        <div class="resumen-bloque-header">
          <span>${label}</span>
          <strong class="resumen-monto">$${_fmt(venta)}</strong>
        </div>
        <div class="resumen-fijo-row">
          <span>Tu ganancia (${pctRev}): <strong>$${_fmt(venta * pct)}</strong></span>
          <span>Luna de Plata (${pctLuna}): <strong>$${_fmt(venta * (1 - pct))}</strong></span>
        </div>
      </div>`;
  });

  html += '</div>';

  // Footer global
  html += `
    <div class="resumen-footer">
      <div class="resumen-footer-montos">
        <div class="resumen-footer-row">
          <span>MONTO TOTAL DEL PAÑO</span>
          <strong>$${_fmt(montoTotal)}</strong>
        </div>
        <div class="resumen-footer-row">
          <span>PORCENTAJE DE VENTA</span>
          <strong>${porcentajeVenta.toFixed(2)}%</strong>
        </div>
        <div class="resumen-footer-row resumen-footer-venta-total">
          <span>VENTA TOTAL</span>
          <strong>$${_fmt(ventaTotal)}</strong>
        </div>
      </div>
      ${ventaTotal > 0 ? `
      <div class="resumen-footer-tiers">
        ${tiers.map((t, i) => `
          <div class="resumen-footer-tier ${i === tierAplicable ? 'resumen-tier-activo' : ''}">
            <span class="resumen-ft-label">SI TU VENTA FUE ${t.label}:</span>
            <div class="resumen-ft-vals">
              <span>Tu ganancia: <strong>$${_fmt(t.gananciaTotal)}</strong></span>
              <span>Pagás a Luna de Plata: <strong>$${_fmt(Math.max(0, t.pagaLunaDePlata))}</strong></span>
              <span class="badge ${i === tierAplicable ? 'badge-success' : 'badge-neutral'} resumen-tier-pct">${t.pctLabel}</span>
            </div>
          </div>`).join('')}
      </div>` : ''}
    </div>`;

  return html;
}

// =========================================================
// STATS
// =========================================================

function actualizarStats() {
  const todos = window.Storage.obtenerTodosLosPanos().filter(p => !p.cerrado);
  let activos = 0, porVencer = 0, vencidos = 0;

  todos.forEach(p => {
    const { estado } = window.Calculos.calcularEstadoVencimiento(p.fechaEntrega, p.diasAdicionales);
    if (estado === 'activo') activos++;
    else if (estado === 'por-vencer') porVencer++;
    else vencidos++;
  });

  _setHTML('stat-activos',    activos);
  _setHTML('stat-por-vencer', porVencer);
  _setHTML('stat-vencidos',   vencidos);
}

function actualizarContador(n) {
  _setHTML('panos-count', n);
}

// =========================================================
// EVENTOS
// =========================================================

function vincularEventos() {
  // Filtros por estado
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filtroEstado = chip.dataset.filtro;
      renderizar();
    });
  });

  // Búsqueda sección principal
  document.getElementById('busqueda-panos')?.addEventListener('input', e => {
    filtroBusqueda = e.target.value.trim();
    filtroRevId = null; // editar el texto a mano cancela el deep-link exacto
    renderizar();
  });

  // Filtros historial
  document.getElementById('hist-filtro-anio')?.addEventListener('change', e => {
    filtroHistAnio = e.target.value;
    renderizarHistorial();
  });
  document.getElementById('hist-filtro-mes')?.addEventListener('change', e => {
    filtroHistMes = e.target.value;
    renderizarHistorial();
  });
  document.getElementById('hist-busqueda')?.addEventListener('input', e => {
    filtroHistPersona = e.target.value.trim();
    filtroHistRevId = null; // editar el texto a mano cancela el deep-link exacto
    renderizarHistorial();
  });

  // Delegación en ambos contenedores (principal + historial)
  [document.getElementById('panos-grupos'), document.getElementById('historial-grupos')]
    .filter(Boolean)
    .forEach(contenedor => contenedor.addEventListener('click', e => {
    // Toggle acordeón
    const header = e.target.closest('.pano-card-header');
    if (header && !e.target.closest('button') && !e.target.closest('a')) {
      header.closest('.pano-card')?.classList.toggle('expanded');
      return;
    }

    // Eliminar paño
    if (e.target.closest('.btn-eliminar-pano')) {
      const btn  = e.target.closest('.btn-eliminar-pano');
      const pano = window.Storage.obtenerPanoPorId(btn.dataset.id);
      if (!pano) return;
      if (!confirm(`¿Eliminar ${window.Calculos.formatearNumeroPano(pano.numero)}? Esta acción no se puede deshacer.`)) return;
      window.Storage.eliminarPano(btn.dataset.id);
      renderizar();
      window.UI.mostrarToast('Paño eliminado', 'danger');
      return;
    }

    // Adelanto sobre paño activo
    if (e.target.closest('.btn-adelanto-pano')) {
      const btn = e.target.closest('.btn-adelanto-pano');
      abrirModalAdelanto(btn.dataset.id);
      return;
    }

    // Eliminar adelanto
    if (e.target.closest('.btn-del-adelanto')) {
      const btn = e.target.closest('.btn-del-adelanto');
      if (!confirm('¿Eliminar este adelanto?')) return;
      window.Storage.eliminarAdelanto(btn.dataset.panoId, btn.dataset.adelantoId);
      renderizar();
      return;
    }

    // Editar paño
    if (e.target.closest('.btn-editar-pano')) {
      const btn = e.target.closest('.btn-editar-pano');
      abrirModalEditarPano(btn.dataset.id);
      return;
    }

    // Imprimir paño
    if (e.target.closest('.btn-imprimir-pano')) {
      const btn = e.target.closest('.btn-imprimir-pano');
      _abrirImpresionPano(btn.dataset.id);
      return;
    }

    // Cerrar paño
    if (e.target.closest('.btn-cerrar-pano')) {
      const btn = e.target.closest('.btn-cerrar-pano');
      const pano = window.Storage.obtenerPanoPorId(btn.dataset.id);
      if (!pano) return;
      if (!confirm(`¿Cerrar ${window.Calculos.formatearNumeroPano(pano.numero)}? Una vez cerrado, podrá ser liquidado.`)) return;
      window.Storage.cerrarPano(btn.dataset.id);
      window.Storage.asegurarLiquidacionV2ParaPano(btn.dataset.id);

      renderizar();
      window.UI.mostrarToast('Paño cerrado. Liquidación creada.', 'success');
      return;
    }

    // Marcar vendido
    if (e.target.closest('.btn-vender')) {
      confirmarVenta(e.target.closest('.btn-vender'));
      return;
    }

    // Revertir venta (volver a "no vendido")
    if (e.target.closest('.btn-revertir-venta')) {
      revertirVenta(e.target.closest('.btn-revertir-venta'));
      return;
    }
  }));
}

// =========================================================
// IMPRESIÓN DE PAÑO
// =========================================================

function _infoAutorTexto(item) {
  if (item.modificadoPor && item.fechaModificacion) {
    return `✎ ${item.modificadoPor} · ${_fechaCortaISO(item.fechaModificacion)}`;
  }
  if (item.agregadoPor && item.fechaAgregado) {
    return `+ ${item.agregadoPor} · ${_fechaCortaISO(item.fechaAgregado)}`;
  }
  return '—';
}

function _abrirImpresionPano(panoId) {
  const pano = window.Storage.obtenerPanoPorId(panoId);
  if (!pano) return;
  const rev = window.Storage.obtenerRevendedoraPorId(pano.revendedoraId);
  const { formatearFecha, formatearNumeroPano, calcularResumenPano, calcularFechaVencimientoEfectiva } = window.Calculos;
  const fechaVencimiento = calcularFechaVencimientoEfectiva(pano.fechaEntrega, pano.diasAdicionales);

  const categoriasHtml = CATS_PAGE.map(({ key, label }) => {
    const items = pano.categorias?.[key];
    if (!Array.isArray(items) || items.length === 0) return '';
    return `
      <div class="cat-block">
        <div class="cat-titulo">${_esc(label)}</div>
        <table>
          <thead><tr><th>Ord.</th><th>Producto</th><th>Descripción</th><th>Precio</th><th>Vendido</th><th>Agregado/modificado por</th></tr></thead>
          <tbody>
            ${items.map((i, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${_esc(i.producto)}${i.pedidoEspecial ? ' <span class="tag">Pedido</span>' : ''}</td>
                <td>${_esc(i.descripcion || '—')}</td>
                <td>${i.precioVenta != null ? '$' + _fmt(i.precioVenta) : '—'}</td>
                <td>${i.vendido ? 'Sí' : 'No'}</td>
                <td>${_esc(_infoAutorTexto(i))}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }).join('');

  const r = calcularResumenPano(pano);
  const t = r.tiers[r.tierAplicable];

  const resumenHtml = r.ventaTotal > 0 ? `
    <div class="resumen">
      <div class="resumen-row"><span>Monto total del paño</span><strong>$${_fmt(r.montoTotal)}</strong></div>
      <div class="resumen-row"><span>Venta total</span><strong>$${_fmt(r.ventaTotal)}</strong></div>
      <div class="resumen-row"><span>Porcentaje de venta</span><strong>${r.porcentajeVenta.toFixed(2)}%</strong></div>
      <div class="resumen-row destacado"><span>Ganancia revendedora (${t.pctLabel})</span><strong>$${_fmt(t.gananciaTotal)}</strong></div>
      <div class="resumen-row destacado"><span>A pagar a Luna de Plata</span><strong>$${_fmt(Math.max(0, t.pagaLunaDePlata))}</strong></div>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${_esc(formatearNumeroPano(pano.numero))} — ${_esc(rev ? rev.nombre : '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; padding: 20px 26px; color: #1a1a1a; font-size: 12px; }
  .cabecera { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e0e0e0; padding-bottom: 12px; margin-bottom: 16px; }
  .cabecera h1 { font-size: 18px; }
  .cabecera .marca-img { display: block; height: 34px; width: auto; }
  .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
  .info-item label { display: block; font-size: 8.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #888; margin-bottom: 2px; }
  .info-item div { font-size: 12px; font-weight: 600; }
  .cat-block { margin-bottom: 14px; }
  .cat-titulo { font-size: 9.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #b8860b; margin-bottom: 5px; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10.5px; }
  th, td { text-align: left; padding: 3px 5px; border-bottom: 1px solid #eee; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  th { font-size: 8.5px; text-transform: uppercase; letter-spacing: .3px; color: #888; }
  th:nth-child(1), td:nth-child(1) { width: 5%; text-align: center; }
  th:nth-child(2), td:nth-child(2) { width: 25%; }
  th:nth-child(3), td:nth-child(3) { width: 22%; }
  th:nth-child(4), td:nth-child(4) { width: 13%; text-align: right; }
  th:nth-child(5), td:nth-child(5) { width: 10%; text-align: center; }
  th:nth-child(6), td:nth-child(6) { width: 25%; text-align: right; white-space: normal; }
  .tag { font-size: 8.5px; background: #eee; border-radius: 4px; padding: 1px 4px; margin-left: 4px; }
  .resumen { margin-top: 18px; border-top: 2px solid #1a1a1a; padding-top: 12px; }
  .resumen-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
  .resumen-row.destacado { font-size: 12.5px; font-weight: 700; }
  .acciones { margin-top: 20px; display: flex; gap: 10px; }
  .btn { padding: 9px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: Arial, sans-serif; }
  .btn-print { background: #1a1a1a; color: #fff; flex: 1; }
  .btn-print:hover { background: #333; }
  .btn-close { background: #f0f0f0; color: #555; }
  .btn-close:hover { background: #e0e0e0; }
  @page { margin: 14px; }
  @media print {
    body { padding: 0; }
    .acciones { display: none; }
  }
</style>
</head>
<body>
<div class="cabecera">
  <h1>${_esc(formatearNumeroPano(pano.numero))}</h1>
  <img src="img/logo-dark.png" alt="Luna de Plata" class="marca-img">
</div>
<div class="info-grid">
  <div class="info-item"><label>Revendedora</label><div>${_esc(rev ? rev.nombre : '—')}</div></div>
  <div class="info-item"><label>Fecha de entrega</label><div>${_esc(formatearFecha(pano.fechaEntrega))}</div></div>
  <div class="info-item"><label>Fecha de vencimiento</label><div>${_esc(formatearFecha(fechaVencimiento))}</div></div>
  <div class="info-item"><label>Armado por</label><div>${_esc(pano.preparadoPor || '—')}</div></div>
</div>
${categoriasHtml || '<p>Sin artículos cargados en este paño.</p>'}
${resumenHtml}
<div class="acciones">
  <button class="btn btn-print" onclick="window.print()">Imprimir</button>
  <button class="btn btn-close" onclick="window.close()">Cerrar</button>
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=820,height=900,resizable=yes,scrollbars=yes');
  if (!win) { alert('El navegador bloqueó la ventana emergente. Permitila para imprimir.'); return; }
  win.document.write(html);
  win.document.close();
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

function _fmt(n) {
  return new Intl.NumberFormat('es-AR').format(Math.round(n));
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HTML del botón/badge de "Vendido" (con su botón de revertir si corresponde)
 * más la info de autor. Única fuente de verdad: la usan tanto el render
 * completo de la card como confirmarVenta/revertirVenta al actualizar en vivo.
 */
function _renderItemAccionesHtml(item) {
  const botonHtml = item.vendido
    ? `<span class="item-vendido-wrap">
         <span class="badge badge-success">Vendido</span>
         <button class="btn btn-ghost btn-icon btn-sm btn-revertir-venta" title="Marcar como no vendido">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
         </button>
       </span>`
    : '<button class="btn btn-gold btn-sm btn-vender">Vendido</button>';
  return `${botonHtml}${_infoAutorItem(item)}`;
}

/**
 * Texto chico que va al lado del botón/badge de "Vendido" con quién tocó
 * este ítem por última vez y cuándo (modificación tiene prioridad sobre alta).
 */
function _infoAutorItem(item) {
  if (item.modificadoPor && item.fechaModificacion) {
    return `<div class="item-info-autor" title="Modificado por ${_esc(item.modificadoPor)} el ${_fechaCortaISO(item.fechaModificacion, true)}">✎ ${_esc(item.modificadoPor)} · ${_fechaCortaISO(item.fechaModificacion)}</div>`;
  }
  if (item.agregadoPor && item.fechaAgregado) {
    return `<div class="item-info-autor" title="Agregado por ${_esc(item.agregadoPor)} el ${_fechaCortaISO(item.fechaAgregado, true)}">+ ${_esc(item.agregadoPor)} · ${_fechaCortaISO(item.fechaAgregado)}</div>`;
  }
  return '';
}

function _fechaCortaISO(iso, conAnio = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', conAnio
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { day: '2-digit', month: '2-digit' });
}

function _iniciales(nombre) {
  if (!nombre) return '?';
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function _setHTML(id, valor) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = valor ?? '—';
}

function _emptyState(titulo, descripcion) {
  return `
    <div class="empty-state">
      <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
      </svg>
      <p class="empty-state-title">${titulo}</p>
      <p class="empty-state-desc">${descripcion}</p>
    </div>`;
}

window.PanosPage = {
  inicializar,
  abrirModalNuevoPano,
  abrirModalEditarPano,
  cerrarModalPano,
  guardarPano,
  agregarItem,
  abrirModalAdelanto,
  guardarAdelanto,
  filtrarHistorialPorRevendedora,
};

// =========================================================
// MODAL — CREAR/EDITAR PAÑO
// =========================================================

let _modalEditId = null;
let _modalRevId  = null;

const CATS_FORM = [
  'anillos', 'aros', 'cadenasConjuntos', 'dijes', 'pulseras',
  'accesoriosGoldFabricacion', 'anillosAcero', 'arosAcero',
  'cadenasAcero', 'dijesAcero', 'pulserasAcero', 'relojes', 'joyasPersonalizadas', 'maryKay',
  'precioFijoArreglos',
];

const DEFAULTS_NUEVO_PANO = {
  anillos:                  10,
  aros:                     30,
  cadenasConjuntos:          5,
  dijes:                     5,
  accesoriosGoldFabricacion: 20,
  anillosAcero:             10,
  arosAcero:                20,
  cadenasAcero:              9,
  pulserasAcero:            10,
};

function abrirModalNuevoPano(preseleccionarRevId = null) {
  const modal = document.getElementById('modal-pano-page');
  const form  = document.getElementById('form-pano-page');
  const titulo = document.getElementById('modal-pano-page-titulo');
  const subtitulo = document.getElementById('modal-pano-page-subtitulo');

  if (!modal || !form) return;

  _modalEditId = null;
  _modalRevId  = null;

  form.reset();
  if (titulo)    titulo.textContent    = 'Nuevo Paño';
  if (subtitulo) subtitulo.textContent = '';

  // Ocultar campo modificación (solo aplica al editar)
  const wrapModNuevo = document.getElementById('pano-page-modificacion-wrap');
  if (wrapModNuevo) wrapModNuevo.style.display = 'none';

  _poblarSelectRevendedoras(preseleccionarRevId);

  // Si viene una revendedora preseleccionada, actualizar el subtítulo y el número
  if (preseleccionarRevId) {
    const rev = window.Storage.obtenerRevendedoraPorId(preseleccionarRevId);
    if (rev) {
      if (subtitulo) subtitulo.textContent = rev.nombre;
      document.getElementById('pano-page-revendedora').disabled = true;
      _onCambiaRevendedora();
    }
  }

  _inicializarCategorias();
  Object.entries(DEFAULTS_NUEVO_PANO).forEach(([key, count]) => {
    const cont = document.getElementById(`pano-page-cat-${key}`);
    if (cont) for (let i = 0; i < count; i++) _agregarFilaItem(cont, {});
  });
  _limpiarErrores();

  modal.classList.add('open');
  if (!preseleccionarRevId) {
    setTimeout(() => document.getElementById('pano-page-revendedora')?.focus(), 100);
  } else {
    setTimeout(() => document.getElementById('pano-page-fechaEntrega')?.focus(), 100);
  }
}

function abrirModalEditarPano(panoId) {
  const pano = window.Storage.obtenerPanoPorId(panoId);
  if (!pano) return;

  const rev = window.Storage.obtenerRevendedoraPorId(pano.revendedoraId);
  const modal = document.getElementById('modal-pano-page');
  const form  = document.getElementById('form-pano-page');
  const titulo = document.getElementById('modal-pano-page-titulo');
  const subtitulo = document.getElementById('modal-pano-page-subtitulo');

  if (!modal || !form) return;

  _modalEditId = panoId;
  _modalRevId  = pano.revendedoraId;

  form.reset();
  if (titulo)    titulo.textContent    = window.Calculos.formatearNumeroPano(pano.numero);
  if (subtitulo) subtitulo.textContent = rev ? rev.nombre : '—';

  _poblarSelectRevendedoras(pano.revendedoraId);
  document.getElementById('pano-page-revendedora').disabled = true; // No cambiar revendedora al editar

  _inicializarCategorias();
  document.getElementById('pano-page-fechaEntrega').value   = pano.fechaEntrega   || '';
  document.getElementById('pano-page-diasAdicionales').value = pano.diasAdicionales || '';
  const elPrepPage = document.getElementById('pano-page-preparadoPor');
  if (elPrepPage) elPrepPage.value = pano.preparadoPor || '';

  // Mostrar campo "Modificado por" y limpiarlo
  const wrapMod = document.getElementById('pano-page-modificacion-wrap');
  const elMod   = document.getElementById('pano-page-modificadoPor');
  if (wrapMod) wrapMod.style.display = '';
  if (elMod)   elMod.value = '';

  // Poblar categorías
  CATS_FORM.forEach(key => {
    if (pano.categorias?.[key]) {
      _poblarCategoria(key, pano.categorias[key]);
    }
  });

  document.getElementById('pano-page-fechaEntrega').dispatchEvent(new Event('change'));
  _limpiarErrores();

  modal.classList.add('open');
}

function cerrarModalPano() {
  const modal = document.getElementById('modal-pano-page');
  if (modal) modal.classList.remove('open');
  document.getElementById('pano-page-revendedora').disabled = false;
  const wrapMod = document.getElementById('pano-page-modificacion-wrap');
  if (wrapMod) wrapMod.style.display = 'none';
}

function guardarPano() {
  const form = document.getElementById('form-pano-page');
  if (!form) return;

  const revId = document.getElementById('pano-page-revendedora')?.value || '';
  if (!revId && !_modalEditId) {
    alert('Selecciona una revendedora');
    return;
  }

  const fechaEntrega = document.getElementById('pano-page-fechaEntrega')?.value || '';
  if (!fechaEntrega) {
    alert('Ingresa la fecha de entrega');
    return;
  }

  const diasAd      = document.getElementById('pano-page-diasAdicionales')?.value || '';
  const preparadoPor = document.getElementById('pano-page-preparadoPor')?.value.trim() || '';

  // Validar "Modificado por" al editar
  if (_modalEditId) {
    const modificadoPor = document.getElementById('pano-page-modificadoPor')?.value.trim() || '';
    const errEl = document.getElementById('pano-page-modificadoPor-error');
    if (!modificadoPor) {
      if (errEl) errEl.style.display = '';
      document.getElementById('pano-page-modificadoPor')?.focus();
      return;
    }
    if (errEl) errEl.style.display = 'none';
  }

  const modificadoPor = document.getElementById('pano-page-modificadoPor')?.value.trim() || '';

  // Recolectar categorías
  const categorias = {};
  CATS_FORM.forEach(key => {
    categorias[key] = _recolectarCategoria(key);
  });

  const datos = {
    revendedoraId: _modalEditId ? _modalRevId : revId,
    fechaEntrega,
    diasAdicionales: diasAd ? parseInt(diasAd) : 0,
    preparadoPor,
    categorias,
  };

  const nuevaFecha = new Date().toISOString();

  if (_modalEditId) {
    const panoAnterior = window.Storage.obtenerPanoPorId(_modalEditId);
    _aplicarAtribucionItems(panoAnterior, datos, modificadoPor, nuevaFecha);
    const cambios = _calcularDiff(panoAnterior, datos);

    const nuevaMod = {
      fecha:       nuevaFecha,
      por:         modificadoPor,
      cambios,
    };

    // Preservar historial de modificaciones anteriores
    const historial = Array.isArray(panoAnterior?.historialModificaciones)
      ? panoAnterior.historialModificaciones
      : [];

    datos.fechaModificacion        = nuevaMod.fecha;
    datos.modificadoPor            = modificadoPor;
    datos.historialModificaciones  = [...historial, nuevaMod];

    window.Storage.actualizarPano(_modalEditId, datos);
    window.UI.mostrarToast('Paño actualizado', 'success');
  } else {
    // Nuevo: marcar quién agregó cada ítem (quien preparó el paño)
    _aplicarAtribucionItems(null, datos, preparadoPor, nuevaFecha);
    window.Storage.guardarPano(datos);
    window.UI.mostrarToast('Paño creado', 'success');
  }

  cerrarModalPano();
  renderizar();
  actualizarStats();
}

function agregarItem(key) {
  const cont = document.getElementById(`pano-page-cat-${key}`);
  if (!cont) return;
  _agregarFilaItem(cont, { producto: '', descripcion: '' });
  const filas = cont.querySelectorAll('.cat-item-row');
  const ultima = filas[filas.length - 1];
  if (ultima) {
    const input = ultima.querySelector('.cat-item-producto');
    if (input) setTimeout(() => input.focus(), 50);
  }
}

// =========================================================
// UTILIDADES MODAL
// =========================================================

function _poblarSelectRevendedoras(preseleccionar = null) {
  const sel = document.getElementById('pano-page-revendedora');
  if (!sel) return;
  const revendedoras = window.Storage.obtenerRevendedoras().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  sel.innerHTML = '<option value="">— Seleccionar —</option>'
    + revendedoras.map(r => `<option value="${r.id}">${_esc(r.nombre)}</option>`).join('');
  if (preseleccionar) sel.value = preseleccionar;

  // Evento change para actualizar números de paño
  sel.addEventListener('change', _onCambiaRevendedora);
}

function _onCambiaRevendedora() {
  const revId = document.getElementById('pano-page-revendedora')?.value;
  if (!revId && !_modalEditId) {
    document.getElementById('pano-page-numero-preview').textContent = 'Paño —';
    return;
  }
  if (_modalEditId) return; // Si estamos editando, no cambiar

  const panos = window.Storage.obtenerPanosDeRevendedora(revId);
  const numero = window.Storage.calcularNumeroPano(panos);
  document.getElementById('pano-page-numero-preview').textContent = window.Calculos.formatearNumeroPano(numero);
}

function _inicializarCategorias() {
  CATS_FORM.forEach(key => {
    const cont = document.getElementById(`pano-page-cat-${key}`);
    if (cont) cont.innerHTML = '';
  });
}

function _poblarCategoria(key, items) {
  const cont = document.getElementById(`pano-page-cat-${key}`);
  if (!cont) return;
  if (Array.isArray(items)) {
    items.forEach(item => _agregarFilaItem(cont, item));
  }
}

function _agregarFilaItem(cont, item = {}) {
  // Extraer catKey del id del contenedor: "pano-page-cat-anillos" → "anillos"
  const catKey = (cont.id || '').replace('pano-page-cat-', '');

  const row = document.createElement('div');
  row.className = 'cat-item-row';
  row.innerHTML = `
    <input type="hidden" class="cat-item-id" value="${_esc(item.id || '')}">
    <div class="cat-item-autocomplete-wrap">
      <input type="text" class="form-input cat-item-producto" placeholder="Código / Nombre" value="${_esc(item.producto || '')}" autocomplete="off">
    </div>
    <input type="text" class="form-input cat-item-desc" placeholder="Descripción" value="${_esc(item.descripcion || '')}">
    <input type="text" inputmode="numeric" class="form-input cat-item-precio input-miles" placeholder="Precio *" value="${item.precioVenta != null ? item.precioVenta : ''}">
    <input type="number" class="form-input cat-item-cantidad" min="1" max="99" value="1" title="Cantidad: escribí un número y presioná Enter para duplicar esta fila">
    <input type="checkbox" class="cat-item-pedido" ${item.pedidoEspecial ? 'checked' : ''}
      title="Pedido especial: la revendedora ya lo tiene vendido de palabra y lo pidió para el paño">
    <button type="button" class="btn btn-danger-ghost btn-icon cat-item-del">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;
  row.querySelector('.cat-item-del').addEventListener('click', () => row.remove());
  window.FormatoNumero.attachInputMiles(row.querySelector('.cat-item-precio'));

  window.NomenclaturaAC?.attach(row.querySelector('.cat-item-producto'), catKey);
  window.NomenclaturaAC?.attachCantidad(row.querySelector('.cat-item-cantidad'), row, cont, _agregarFilaItem);

  cont.appendChild(row);
}


function _recolectarCategoria(key) {
  const cont = document.getElementById(`pano-page-cat-${key}`);
  if (!cont) return [];
  const items = [];
  cont.querySelectorAll('.cat-item-row').forEach(row => {
    const producto = row.querySelector('.cat-item-producto')?.value.trim() || '';
    if (!producto) return;
    const precioStr = row.querySelector('.cat-item-precio')?.value.trim() || '';
    const precioVenta = precioStr !== '' ? window.FormatoNumero.desformatearMiles(precioStr) : null;
    const pedidoEspecial = row.querySelector('.cat-item-pedido')?.checked || false;
    items.push({
      id: row.querySelector('.cat-item-id')?.value.trim() || window.Storage.generarId(),
      producto,
      descripcion: row.querySelector('.cat-item-desc')?.value.trim() || '',
      precioVenta,
      vendido: false,
      fechaVenta: null,
      pedidoEspecial,
    });
  });
  return items;
}

function _limpiarErrores() {
  document.querySelectorAll('.form-error').forEach(el => el.style.display = 'none');
}

// =========================================================
// ATRIBUCIÓN POR ÍTEM (quién agregó / modificó cada producto)
// =========================================================

/**
 * Completa (in place) cada ítem de datosNuevo.categorias con quién lo agregó
 * y/o modificó por última vez, comparando contra panoViejo (o null si es un
 * paño recién creado). También preserva vendido/fechaVenta, que el
 * formulario de edición no conoce y si no se restauran quedan pisados.
 */
function _aplicarAtribucionItems(panoViejo, datosNuevo, autor, fechaIso) {
  CATS_FORM.forEach(key => {
    const viejos = Array.isArray(panoViejo?.categorias?.[key]) ? panoViejo.categorias[key] : [];
    const nuevos = Array.isArray(datosNuevo?.categorias?.[key]) ? datosNuevo.categorias[key] : [];
    const viejosMap = Object.fromEntries(viejos.map(i => [i.id, i]));

    nuevos.forEach(item => {
      const viejo = viejosMap[item.id];

      if (!viejo) {
        // Ítem nuevo: todavía no puede estar vendido, se marca quién lo agregó.
        item.agregadoPor   = autor || null;
        item.fechaAgregado = fechaIso;
        return;
      }

      // El formulario no conoce el estado de venta ni el alta original: se preservan.
      item.vendido        = viejo.vendido || false;
      item.fechaVenta      = viejo.fechaVenta || null;
      item.agregadoPor     = viejo.agregadoPor || null;
      item.fechaAgregado   = viejo.fechaAgregado || null;

      const huboCambio =
        (viejo.producto || '')          !== (item.producto || '')      ||
        (viejo.descripcion || '')       !== (item.descripcion || '')   ||
        String(viejo.precioVenta ?? '') !== String(item.precioVenta ?? '') ||
        (viejo.pedidoEspecial || false) !== (item.pedidoEspecial || false);

      if (huboCambio) {
        item.modificadoPor     = autor || null;
        item.fechaModificacion = fechaIso;
      } else {
        item.modificadoPor     = viejo.modificadoPor || null;
        item.fechaModificacion = viejo.fechaModificacion || null;
      }
    });
  });
}

// =========================================================
// DIFF DE MODIFICACIONES
// =========================================================

const CATS_LABELS = Object.fromEntries(CATS_PAGE.map(c => [c.key, c.label]));

function _calcularDiff(panoViejo, datosNuevo) {
  const cambios = [];

  // Cambios en campos principales
  if ((panoViejo.fechaEntrega || '') !== (datosNuevo.fechaEntrega || '')) {
    cambios.push({
      tipo: 'campo',
      campo: 'Fecha de entrega',
      de:   window.Calculos.formatearFecha(panoViejo.fechaEntrega) || '—',
      a:    window.Calculos.formatearFecha(datosNuevo.fechaEntrega) || '—',
    });
  }
  if ((panoViejo.diasAdicionales || 0) !== (datosNuevo.diasAdicionales || 0)) {
    cambios.push({
      tipo: 'campo',
      campo: 'Días adicionales',
      de:   String(panoViejo.diasAdicionales || 0),
      a:    String(datosNuevo.diasAdicionales || 0),
    });
  }
  if ((panoViejo.preparadoPor || '') !== (datosNuevo.preparadoPor || '')) {
    cambios.push({
      tipo: 'campo',
      campo: 'Preparado por',
      de:   panoViejo.preparadoPor || '—',
      a:    datosNuevo.preparadoPor || '—',
    });
  }

  // Cambios en ítems por categoría
  CATS_FORM.forEach(key => {
    const viejos = Array.isArray(panoViejo?.categorias?.[key]) ? panoViejo.categorias[key] : [];
    const nuevos  = Array.isArray(datosNuevo?.categorias?.[key])  ? datosNuevo.categorias[key]  : [];
    const cat     = CATS_LABELS[key] || key;

    const viejosMap = Object.fromEntries(viejos.map(i => [i.id, i]));
    const nuevosMap  = Object.fromEntries(nuevos.map(i => [i.id, i]));

    // Agregados: en nuevos pero no en viejos (id nuevo o sin id match)
    nuevos.forEach(item => {
      if (!viejosMap[item.id]) {
        cambios.push({ tipo: 'agregado', cat, producto: item.producto, descripcion: item.descripcion, precio: item.precioVenta });
      }
    });

    // Eliminados: en viejos pero no en nuevos
    viejos.forEach(item => {
      if (!nuevosMap[item.id]) {
        cambios.push({ tipo: 'eliminado', cat, producto: item.producto, descripcion: item.descripcion, precio: item.precioVenta });
      }
    });

    // Modificados: en ambos pero con diferencia
    nuevos.forEach(item => {
      const viejo = viejosMap[item.id];
      if (!viejo) return;
      const subcambios = [];
      if ((viejo.producto || '') !== (item.producto || ''))
        subcambios.push(`nombre: "${viejo.producto}" → "${item.producto}"`);
      if ((viejo.descripcion || '') !== (item.descripcion || ''))
        subcambios.push(`descripción: "${viejo.descripcion || '—'}" → "${item.descripcion || '—'}"`);
      if (String(viejo.precioVenta ?? '') !== String(item.precioVenta ?? ''))
        subcambios.push(`precio: $${_fmt(viejo.precioVenta ?? 0)} → $${_fmt(item.precioVenta ?? 0)}`);
      if ((viejo.pedidoEspecial || false) !== (item.pedidoEspecial || false))
        subcambios.push(`pedido especial: ${viejo.pedidoEspecial ? 'sí' : 'no'} → ${item.pedidoEspecial ? 'sí' : 'no'}`);
      if (subcambios.length) {
        cambios.push({ tipo: 'modificado', cat, producto: item.producto, subcambios });
      }
    });
  });

  return cambios;
}

// Event listener para actualizar fechas en preview
document.addEventListener('DOMContentLoaded', () => {
  const elFecha = document.getElementById('pano-page-fechaEntrega');
  if (elFecha) {
    elFecha.addEventListener('change', _actualizarFechasPreview);
  }
  const form = document.getElementById('form-pano-page');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarPano();
    });
  }
});

function _actualizarFechasPreview() {
  const fecha = document.getElementById('pano-page-fechaEntrega')?.value;
  const diasAd = parseInt(document.getElementById('pano-page-diasAdicionales')?.value || 0);

  if (fecha) {
    const d = new Date(fecha);
    document.getElementById('pano-page-fechaEntrega-preview').textContent = window.Calculos.formatearFecha(fecha);

    const vencimiento = new Date(d);
    vencimiento.setDate(vencimiento.getDate() + 40 + diasAd);
    const vencStr = vencimiento.toISOString().split('T')[0];
    document.getElementById('pano-page-fechaVencimiento-preview').textContent = window.Calculos.formatearFecha(vencStr);
  }
}
