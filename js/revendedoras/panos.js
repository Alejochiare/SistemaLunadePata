/**
 * panos.js — Luna de Plata
 * Renderizado de paños en el modal de vista de revendedora.
 */

const CATS_DEFS = [
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

const GRUPOS_PANO = [
  { id: 'plata',      label: 'VENTA TOTAL JOYAS PLATA',                          keys: ['anillos', 'aros', 'cadenasConjuntos', 'dijes', 'pulseras'] },
  { id: 'accesorios', label: 'VENTA TOTAL ACCESORIOS, GOLD FIELD Y FABRICACIÓN',  keys: ['accesoriosGoldFabricacion'] },
  { id: 'acero',      label: 'VENTA TOTAL ACERO IONIZADO',                        keys: ['anillosAcero', 'arosAcero', 'cadenasAcero', 'dijesAcero', 'pulserasAcero'] },
  { id: 'relojes',    label: 'TOTAL VENTA RELOJES, ABRIDORES CH Y ORO',           keys: ['relojes'] },
  { id: 'joyasPerso', label: 'TOTAL VENTA JOYAS PERSONALIZADAS',                  keys: ['joyasPersonalizadas'] },
  { id: 'maryKay',    label: 'TOTAL VENTA PRODUCTOS MARY KAY',                    keys: ['maryKay'] },
  { id: 'precioFijo', label: 'TOTAL VENTA PRECIO FIJO/ARREGLOS/GRABADOS',         keys: ['precioFijoArreglos'] },
];

// =========================================================
// RENDER DE LISTA DE PAÑOS
// =========================================================

function renderizarPanos(revendedoraId) {
  const contenedor = document.getElementById('panos-lista');
  if (!contenedor) return;

  const panos = window.Storage.obtenerPanosDeRevendedora(revendedoraId)
    .sort((a, b) => a.numero - b.numero);

  if (panos.length === 0) {
    contenedor.innerHTML = `
      <div class="panos-empty">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 9h6M9 12h6M9 15h4"/>
        </svg>
        <p>No hay paños asignados todavía.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = panos.map((pano, idx) => {
    const estado = window.Calculos.calcularEstadoVencimiento(pano.fechaEntrega, pano.diasAdicionales);
    return renderizarFilaPano(pano, estado, idx === 0);
  }).join('');

  // Acordeón
  contenedor.querySelectorAll('.pano-row-header').forEach(header => {
    header.addEventListener('click', () => {
      const row = header.closest('.pano-row');
      const estaExpandido = row.classList.contains('expanded');
      contenedor.querySelectorAll('.pano-row').forEach(r => r.classList.remove('expanded'));
      if (!estaExpandido) row.classList.add('expanded');
    });
  });

  // Botones editar / eliminar
  contenedor.querySelectorAll('[data-action="editar-pano"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pano = window.Storage.obtenerPanoPorId(btn.dataset.id);
      if (!pano) return;
      const rev = window.Storage.obtenerRevendedoraPorId(pano.revendedoraId);
      window.Formularios.cerrarModalVerRevendedora();
      window.Formularios.abrirModalEditarPano(pano, rev ? rev.nombre : '');
    });
  });

  contenedor.querySelectorAll('[data-action="eliminar-pano"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pano = window.Storage.obtenerPanoPorId(btn.dataset.id);
      if (!pano) return;
      if (!confirm(`¿Eliminar ${window.Calculos.formatearNumeroPano(pano.numero)}? Esta acción no se puede deshacer.`)) return;
      window.Storage.eliminarPano(btn.dataset.id);
      renderizarPanos(revendedoraId);
      window.Revendedoras.actualizarEstadisticas();
      window.UI.mostrarToast('Paño eliminado', 'danger');
    });
  });

  // Botón cerrar paño
  contenedor.querySelectorAll('[data-action="cerrar-pano"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pano = window.Storage.obtenerPanoPorId(btn.dataset.id);
      if (!pano) return;
      if (!confirm(`¿Cerrar ${window.Calculos.formatearNumeroPano(pano.numero)}? Una vez cerrado, podrá ser liquidado.`)) return;
      window.Storage.cerrarPano(btn.dataset.id);
      window.Storage.asegurarLiquidacionV2ParaPano(btn.dataset.id);

      renderizarPanos(revendedoraId);
      window.Revendedoras.actualizarEstadisticas();
      window.UI.mostrarToast('Paño cerrado. Liquidación creada.', 'success');
    });
  });

  // Delegar clic en botones "Vendido" / "Desmarcar"
  contenedor.addEventListener('click', e => {
    const btnVender = e.target.closest('.btn-vender-modal');
    if (btnVender) return confirmarVentaModal(btnVender, revendedoraId, true);
    const btnDesmarcar = e.target.closest('.btn-desmarcar-modal');
    if (btnDesmarcar) return confirmarVentaModal(btnDesmarcar, revendedoraId, false);
  });
}

// =========================================================
// ACCIÓN VENDIDO (un clic, precio ya estaba fijado)
// =========================================================

function confirmarVentaModal(btn, revendedoraId, vendido = true) {
  const tr = btn.closest('.items-fila');
  if (!tr) return;

  const panoId = tr.dataset.panoId;
  const catKey = tr.dataset.cat;
  const itemId = tr.dataset.itemId;

  window.Storage.actualizarItemPano(panoId, catKey, itemId, {
    vendido,
    fechaVenta: vendido ? new Date().toISOString().split('T')[0] : null,
  });

  tr.classList.toggle('item-vendido', vendido);
  const tdAcciones = tr.querySelector('.item-acciones');
  if (tdAcciones) tdAcciones.innerHTML = _accionesItem(vendido);

  const panoActual = window.Storage.obtenerPanoPorId(panoId);
  if (panoActual) {
    _actualizarSubtotal(panoId, catKey, panoActual);
    _actualizarGrupoTotal(panoId, catKey, panoActual);
    _actualizarProgreso(tr, panoActual);
    _actualizarResumen(panoId, panoActual);
  }
}

function _accionesItem(vendido) {
  if (vendido) {
    return `<span class="badge badge-success">Vendido</span>
      <button class="btn btn-ghost btn-icon btn-sm btn-desmarcar-modal" title="Desmarcar venta">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
  }
  return '<button class="btn btn-gold btn-sm btn-vender-modal">Vendido</button>';
}

function _actualizarSubtotal(panoId, catKey, pano) {
  const items = pano.categorias?.[catKey];
  if (!Array.isArray(items)) return;
  const subtotal = items.reduce((sum, i) => sum + (i.vendido ? Number(i.precioVenta) || 0 : 0), 0);
  const el = document.getElementById(`subtot-${panoId}-${catKey}`);
  if (el) el.textContent = subtotal > 0 ? `Vendido: $${_fmt(subtotal)}` : '';
}

function _actualizarGrupoTotal(panoId, catKey, pano) {
  const grupo = GRUPOS_PANO.find(g => g.keys.includes(catKey));
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

function _actualizarProgreso(tr, pano) {
  const { vendidos, total } = _contarItems(pano);
  const panoRow = tr.closest('.pano-row');
  if (panoRow && total > 0) {
    const badge = panoRow.querySelector('.pano-items-progress');
    if (badge) badge.textContent = `${vendidos}/${total} vendidos`;
  }
}

function _actualizarResumen(panoId, pano) {
  const elBody = document.getElementById(`resumen-${panoId}`);
  if (elBody) elBody.innerHTML = _buildResumenContent(pano);
  const elHeader = document.getElementById(`pano-hfin-${panoId}`);
  if (elHeader) elHeader.innerHTML = _buildHeaderFinanciero(pano);
}

function _buildHeaderFinanciero(pano) {
  const r = window.Calculos.calcularResumenPano(pano);
  if (r.ventaTotal === 0) return '';
  const t = r.tiers[r.tierAplicable];
  return `
    <span class="pano-header-venta">$${_fmt(r.ventaTotal)} vendido</span>
    <span class="badge badge-gold">${t.pctLabel} ganancia</span>
    <span class="pano-header-luna">→ Luna $${_fmt(Math.max(0, t.pagaLunaDePlata))}</span>`;
}

// =========================================================
// RENDER DE UNA FILA DE PAÑO
// =========================================================

function renderizarFilaPano(pano, estado, expandido = false) {
  const { formatearFecha, formatearNumeroPano } = window.Calculos;
  const { estado: estadoTipo, diasTranscurridos } = estado;

  let badgeEstado = 'Activo', claseBadge = 'badge-success';
  if (estadoTipo === 'vencido')     { badgeEstado = 'Vencido';    claseBadge = 'badge-danger'; }
  else if (estadoTipo === 'por-vencer') { badgeEstado = 'Por vencer'; claseBadge = 'badge-warning'; }

  const { vendidos, total } = _contarItems(pano);
  const progressBadge = total > 0
    ? `<span class="pano-items-progress">${vendidos}/${total} vendidos</span>`
    : '';

  const fin = _buildHeaderFinanciero(pano);

  return `
    <div class="pano-row ${expandido ? 'expanded' : ''}">
      <div class="pano-row-header">
        <span class="pano-numero">${formatearNumeroPano(pano.numero)}</span>
        <span class="pano-fecha">${formatearFecha(pano.fechaEntrega)}</span>
        <span class="badge ${claseBadge}">${badgeEstado}</span>
        ${pano.cerrado ? '<span class="badge badge-gold">Cerrado</span>' : ''}
        <span class="pano-dias">${diasTranscurridos}d</span>
        ${progressBadge}
        <span id="pano-hfin-${pano.id}" style="display:contents">${fin}</span>
        <svg class="pano-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="pano-row-body">
        <div class="pano-info-row">
          <div class="pano-info-item">
            <span class="pano-info-label">Fecha de entrega</span>
            <span class="pano-info-value">${formatearFecha(pano.fechaEntrega)}</span>
          </div>
          <div class="pano-info-item">
            <span class="pano-info-label">Vencimiento</span>
            <span class="pano-info-value">${formatearFecha(pano.fechaVencimiento)}</span>
          </div>
          <div class="pano-info-item">
            <span class="pano-info-label">Días transcurridos</span>
            <span class="pano-info-value">${diasTranscurridos} días</span>
          </div>
          ${pano.preparadoPor ? `
          <div class="pano-info-item">
            <span class="pano-info-label">Preparado por</span>
            <span class="pano-info-value">${_esc(pano.preparadoPor)}</span>
          </div>` : ''}
        </div>

        <div class="pano-categorias">
          ${_renderCategoriasPano(pano)}
        </div>

        <div class="pano-actions">
          <button class="btn btn-ghost btn-sm" data-action="editar-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          ${!pano.cerrado ? `
          <button class="btn btn-gold btn-sm" data-action="cerrar-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Cerrar paño
          </button>
          ` : `
          <span class="badge badge-gold">Cerrado</span>
          `}
          <button class="btn btn-danger-ghost btn-sm" data-action="eliminar-pano" data-id="${pano.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>`;
}

// =========================================================
// RENDER CATEGORÍAS
// =========================================================

function _renderCategoriasPano(pano) {
  const categorias = pano.categorias || {};

  const tieneItems = CATS_DEFS.some(({ key }) => {
    const v = categorias[key];
    return v && (Array.isArray(v) ? v.length > 0 : v.trim());
  });
  if (!tieneItems) {
    return '<div style="color:var(--color-text-muted);font-size:13px;">Sin artículos cargados en este paño</div>';
  }

  let html = '';

  GRUPOS_PANO.forEach(grupo => {
    const catsConItems = grupo.keys
      .map(key => CATS_DEFS.find(c => c.key === key))
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
                  ${_accionesItem(item.vendido)}
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
// RESUMEN FINANCIERO
// =========================================================

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

window.Panos = {
  renderizarPanos,
  renderizarFilaPano,
};
