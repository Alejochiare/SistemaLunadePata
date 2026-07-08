/**
 * estadisticas-page.js — Luna de Plata
 * Módulo de estadísticas administrativas con KPIs, ranking, categorías y evolución mensual.
 * Requiere: window.Storage (storage.js) cargado antes.
 */

(function () {
  'use strict';

  // ─── Constantes ────────────────────────────────────────────────────────────

  const CATS = [
    { key: 'anillos',                   label: 'Anillos' },
    { key: 'aros',                      label: 'Aros' },
    { key: 'cadenasConjuntos',          label: 'Cadenas y Conjuntos' },
    { key: 'dijes',                     label: 'Dijes' },
    { key: 'pulseras',                  label: 'Pulseras' },
    { key: 'accesoriosGoldFabricacion', label: 'Accesorios / Gold Field' },
    { key: 'anillosAcero',              label: 'Anillos Acero' },
    { key: 'arosAcero',                 label: 'Aros Acero' },
    { key: 'cadenasAcero',              label: 'Cadenas Acero' },
    { key: 'dijesAcero',                label: 'Dijes Acero' },
    { key: 'pulserasAcero',             label: 'Pulseras Acero' },
    { key: 'relojes',                   label: 'Relojes / Abridores' },
    { key: 'joyasPersonalizadas',       label: 'Joyas Personalizadas' },
    { key: 'maryKay',                   label: 'Mary Kay' },
    { key: 'precioFijoArreglos',        label: 'Precio Fijo/Arreglos/Grabados' },
  ];

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // ─── Formato ────────────────────────────────────────────────────────────────

  const fmt = new Intl.NumberFormat('es-AR');

  function formatPeso(n) {
    return '$ ' + fmt.format(Math.round(n));
  }

  function formatNum(n) {
    return fmt.format(Math.round(n));
  }

  // ─── Estado de filtros ──────────────────────────────────────────────────────

  let filtroAnio = '';
  let filtroMes  = '';

  // ─── Helpers de datos ──────────────────────────────────────────────────────

  /**
   * Devuelve true si el paño pasa los filtros activos de año y mes.
   */
  function panoPasaFiltro(pano) {
    if (!pano.fechaEntrega) return false;
    if (filtroAnio && pano.fechaEntrega.slice(0, 4) !== filtroAnio) return false;
    if (filtroMes  && pano.fechaEntrega.slice(5, 7) !== filtroMes)  return false;
    return true;
  }

  /**
   * Itera sobre todos los items vendidos de un paño y llama callback(item, catKey).
   */
  function iterarItemsVendidos(pano, callback) {
    const cats = pano.categorias || {};
    CATS.forEach(({ key }) => {
      const items = cats[key];
      if (!Array.isArray(items)) return;
      items.forEach(item => {
        if (item.vendido) callback(item, key);
      });
    });
  }

  // ─── Inicialización de filtros ──────────────────────────────────────────────

  function poblarFiltros() {
    const panos = window.Storage.obtenerTodosLosPanos();
    const anios = new Set();

    panos.forEach(p => {
      if (p.fechaEntrega) anios.add(p.fechaEntrega.slice(0, 4));
    });

    const selectAnio = document.getElementById('est-filtro-anio');
    const selectMes  = document.getElementById('est-filtro-mes');

    // Año
    selectAnio.innerHTML = '<option value="">Todos los años</option>';
    Array.from(anios)
      .sort((a, b) => b.localeCompare(a))
      .forEach(a => {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        selectAnio.appendChild(opt);
      });

    // Mes
    selectMes.innerHTML = '<option value="">Todos los meses</option>';
    MESES.forEach((nombre, i) => {
      const val = String(i + 1).padStart(2, '0');
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = nombre;
      selectMes.appendChild(opt);
    });

    selectAnio.addEventListener('change', () => {
      filtroAnio = selectAnio.value;
      renderTodo();
    });

    selectMes.addEventListener('change', () => {
      filtroMes = selectMes.value;
      renderTodo();
    });
  }

  // ─── Render principal ───────────────────────────────────────────────────────

  function renderTodo() {
    const panos        = window.Storage.obtenerTodosLosPanos();
    const liquidaciones = window.Storage.obtenerTodasLasLiquidacionesV2();
    const revendedoras  = window.Storage.obtenerRevendedoras();

    // Filtrar paños
    const panosFiltrados = panos.filter(panoPasaFiltro);

    // Indexar liquidaciones por panoId para búsquedas rápidas
    const liqPorPano = new Map();
    liquidaciones.forEach(l => liqPorPano.set(l.panoId, l));

    // Indexar revendedoras por id
    const revPorId = new Map();
    revendedoras.forEach(r => revPorId.set(r.id, r));

    renderKpis(panosFiltrados, liqPorPano);
    renderRanking(panosFiltrados, liqPorPano, revPorId);
    renderCategorias(panosFiltrados);
    renderEvolucion(panos, liqPorPano);
  }

  // ─── Sección 1: KPI cards ───────────────────────────────────────────────────

  function renderKpis(panosFiltrados, liqPorPano) {
    let totalVendido   = 0;
    let ganancialdp    = 0;
    let itemsVendidos  = 0;
    const panoCount    = panosFiltrados.length;

    panosFiltrados.forEach(pano => {
      iterarItemsVendidos(pano, (item) => {
        totalVendido  += Number(item.precioVenta) || 0;
        itemsVendidos += 1;
      });

      const liq = liqPorPano.get(pano.id);
      if (liq) ganancialdp += Number(liq.montoLunaDePlata) || 0;
    });

    const container = document.getElementById('est-kpis');
    container.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-lbl">Total vendido</div>
        <div class="kpi-val">${formatPeso(totalVendido)}</div>
        <div class="kpi-sub">suma de precios de venta</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Ganancia Luna de Plata</div>
        <div class="kpi-val">${formatPeso(ganancialdp)}</div>
        <div class="kpi-sub">según liquidaciones</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Items vendidos</div>
        <div class="kpi-val">${formatNum(itemsVendidos)}</div>
        <div class="kpi-sub">unidades totales</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Paños entregados</div>
        <div class="kpi-val">${formatNum(panoCount)}</div>
        <div class="kpi-sub">en el período seleccionado</div>
      </div>
    `;
  }

  // ─── Sección 2: Ranking de revendedoras ─────────────────────────────────────

  function renderRanking(panosFiltrados, liqPorPano, revPorId) {
    // Acumular por revendedora
    const acum = new Map(); // revendedoraId → { nombre, panos, vendido, ganancia, items }

    function ensureRev(id) {
      if (!acum.has(id)) {
        const rev = revPorId.get(id);
        acum.set(id, {
          nombre:   rev ? rev.nombre : '(sin nombre)',
          panos:    0,
          vendido:  0,
          ganancia: 0,
          items:    0,
        });
      }
      return acum.get(id);
    }

    panosFiltrados.forEach(pano => {
      const entry = ensureRev(pano.revendedoraId);
      entry.panos += 1;

      iterarItemsVendidos(pano, (item) => {
        entry.vendido += Number(item.precioVenta) || 0;
        entry.items   += 1;
      });

      const liq = liqPorPano.get(pano.id);
      if (liq) entry.ganancia += Number(liq.montoLunaDePlata) || 0;
    });

    const lista = Array.from(acum.values())
      .sort((a, b) => b.vendido - a.vendido)
      .slice(0, 10);

    const container = document.getElementById('est-ranking');

    if (lista.length === 0) {
      container.innerHTML = `
        <h3 class="est-section-title">Ranking de revendedoras</h3>
        <div class="empty-state"><div class="empty-state-title">Sin datos para el período</div></div>
      `;
      return;
    }

    const filas = lista.map((r, i) => {
      const pos = i + 1;
      let badgeClass = 'est-rank-num';
      if (pos === 1) badgeClass += ' est-rank-gold';
      else if (pos === 2) badgeClass += ' est-rank-silver';
      else if (pos === 3) badgeClass += ' est-rank-bronze';

      return `
        <tr>
          <td><span class="${badgeClass}">${pos}</span></td>
          <td>${_esc(r.nombre)}</td>
          <td class="est-td-num">${formatNum(r.panos)}</td>
          <td class="est-td-num">${formatPeso(r.vendido)}</td>
          <td class="est-td-num">${formatPeso(r.ganancia)}</td>
          <td class="est-td-num">${formatNum(r.items)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <h3 class="est-section-title">Ranking de revendedoras</h3>
      <div class="est-table-wrap">
        <table class="est-table">
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>Nombre</th>
              <th class="est-td-num">Paños</th>
              <th class="est-td-num">Vendido total</th>
              <th class="est-td-num">Ganancia L.d.P.</th>
              <th class="est-td-num">Items</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    `;
  }

  // ─── Sección 3: Lo más vendido por categoría ────────────────────────────────

  function renderCategorias(panosFiltrados) {
    // Acumular por categoría
    const acum = new Map(); // key → { label, count, total }

    CATS.forEach(({ key, label }) => {
      acum.set(key, { label, count: 0, total: 0 });
    });

    panosFiltrados.forEach(pano => {
      const cats = pano.categorias || {};
      CATS.forEach(({ key }) => {
        const items = cats[key];
        if (!Array.isArray(items)) return;
        items.forEach(item => {
          if (!item.vendido) return;
          const entry = acum.get(key);
          entry.count += 1;
          entry.total += Number(item.precioVenta) || 0;
        });
      });
    });

    // Filtrar categorías con ventas y ordenar por total DESC
    const lista = Array.from(acum.values())
      .filter(c => c.count > 0)
      .sort((a, b) => b.total - a.total);

    const container = document.getElementById('est-categorias');

    if (lista.length === 0) {
      container.innerHTML = `
        <h3 class="est-section-title">Lo más vendido por categoría</h3>
        <div class="empty-state"><div class="empty-state-title">Sin ventas en el período</div></div>
      `;
      return;
    }

    const maxTotal = lista[0].total || 1;

    const barras = lista.map(c => {
      const pct = Math.round((c.total / maxTotal) * 100);
      return `
        <div class="est-bar-wrap">
          <div class="est-bar-label">${_esc(c.label)}</div>
          <div class="est-bar-track">
            <div class="est-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="est-bar-meta">
            <span class="est-bar-count">${formatNum(c.count)} items</span>
            <span class="est-bar-value">${formatPeso(c.total)}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h3 class="est-section-title">Lo más vendido por categoría</h3>
      <div class="est-barras">${barras}</div>
    `;
  }

  // ─── Sección 4: Evolución mensual ───────────────────────────────────────────

  function renderEvolucion(todosPanos, liqPorPano) {
    const container = document.getElementById('est-evolucion');

    // Ocultar cuando hay filtro de mes activo
    if (filtroMes) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    // Acumular por "YYYY-MM"
    const acum = new Map(); // "YYYY-MM" → { anio, mes, panos, items, total }

    todosPanos.forEach(pano => {
      if (!pano.fechaEntrega) return;
      if (filtroAnio && pano.fechaEntrega.slice(0, 4) !== filtroAnio) return;

      const clave = pano.fechaEntrega.slice(0, 7); // "YYYY-MM"
      if (!acum.has(clave)) {
        acum.set(clave, {
          anio:  pano.fechaEntrega.slice(0, 4),
          mes:   pano.fechaEntrega.slice(5, 7),
          panos: 0,
          items: 0,
          total: 0,
        });
      }
      const entry = acum.get(clave);
      entry.panos += 1;

      iterarItemsVendidos(pano, (item) => {
        entry.items += 1;
        entry.total += Number(item.precioVenta) || 0;
      });
    });

    const lista = Array.from(acum.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // más reciente primero
      .map(([, v]) => v);

    if (lista.length === 0) {
      container.innerHTML = `
        <h3 class="est-section-title">Evolución mensual</h3>
        <div class="empty-state"><div class="empty-state-title">Sin datos para mostrar</div></div>
      `;
      return;
    }

    const filas = lista.map(r => {
      const mesNombre = MESES[parseInt(r.mes, 10) - 1] || r.mes;
      const periodo = filtroAnio ? mesNombre : `${mesNombre} ${r.anio}`;
      return `
        <tr>
          <td>${_esc(periodo)}</td>
          <td class="est-td-num">${formatNum(r.panos)}</td>
          <td class="est-td-num">${formatNum(r.items)}</td>
          <td class="est-td-num">${formatPeso(r.total)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <h3 class="est-section-title">Evolución mensual</h3>
      <div class="est-table-wrap">
        <table class="est-table">
          <thead>
            <tr>
              <th>Período</th>
              <th class="est-td-num">Paños</th>
              <th class="est-td-num">Items vendidos</th>
              <th class="est-td-num">Total vendido</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    `;
  }

  // ─── Utilidad de escape HTML ─────────────────────────────────────────────────

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  function inicializar() {
    poblarFiltros();
    renderTodo();
  }

  window.EstadisticasPage = { inicializar };

})();
