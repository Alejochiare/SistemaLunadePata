/**
 * autocomplete.js — Luna de Plata
 * Portal de autocomplete para nomenclaturas en formularios de paños.
 * Funciona en panos.html y revendedoras.html.
 */

(function () {

  let _portal      = null;
  let _inputActivo = null;
  let _sugerencias = [];
  let _indice      = -1;

  function _getPortal() {
    if (!_portal) {
      _portal = document.createElement('div');
      _portal.className = 'cat-autocomplete-portal';
      _portal.style.display = 'none';
      document.body.appendChild(_portal);
    }
    return _portal;
  }

  function _posicionar(input) {
    const rect = input.getBoundingClientRect();
    const p    = _getPortal();
    const margen     = 8;
    const espacioAbajo = window.innerHeight - rect.bottom - margen;
    const espacioArriba = rect.top - margen;

    // Si no entra abajo pero sí arriba (o hay más lugar arriba), abrir hacia arriba.
    const abrirArriba = espacioAbajo < 180 && espacioArriba > espacioAbajo;

    const disponible = abrirArriba ? espacioArriba : espacioAbajo;

    // El portal es `position: fixed`, así que se posiciona relativo al viewport:
    // getBoundingClientRect() ya da esas coordenadas, sin sumar el scroll de la página.
    if (abrirArriba) {
      p.style.top    = '';
      p.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
      p.style.bottom = '';
      p.style.top    = `${rect.bottom + 4}px`;
    }
    p.style.left  = `${rect.left}px`;
    p.style.width = `${Math.max(rect.width, 280)}px`;

    // El header (~28px) y el footer (~30px) restan espacio a la lista scrolleable.
    const inner = p.querySelector('.cat-autocomplete-portal-inner');
    if (inner) inner.style.maxHeight = `${Math.max(80, Math.min(232, disponible - 58))}px`;
  }

  function mostrar(input, catKey, texto) {
    if (!window.Nomenclaturas) return;
    const sugs = window.Nomenclaturas.buscar(catKey, texto);
    _sugerencias = sugs;
    _indice      = -1;
    _inputActivo = input;

    const p = _getPortal();
    if (!sugs.length) { ocultar(); return; }

    p.innerHTML = `
      <div class="cat-ac-header">
        Nomenclaturas · ${sugs.length} resultado${sugs.length !== 1 ? 's' : ''}
      </div>
      <div class="cat-autocomplete-portal-inner">
        ${sugs.map((n, i) => `
          <div class="cat-ac-item" data-i="${i}">
            ${n.codigo ? `<span class="cat-ac-codigo">${_esc(n.codigo)}</span>` : ''}
            <span class="cat-ac-desc">${_esc(n.descripcion)}</span>
          </div>`).join('')}
      </div>
      <div class="cat-ac-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
        <span><kbd>Enter</kbd> seleccionar</span>
        <span><kbd>Esc</kbd> cerrar</span>
      </div>`;

    p.querySelectorAll('.cat-ac-item').forEach((el, i) => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        seleccionar(sugs[i]);
      });
    });

    _posicionar(input);
    p.style.display = 'block';
  }

  function seleccionar(n) {
    if (_inputActivo) {
      _inputActivo.value = window.Nomenclaturas.formatear(n);
      _inputActivo.dispatchEvent(new Event('input', { bubbles: true }));
      _inputActivo.focus();
    }
    ocultar();
  }

  function ocultar() {
    _getPortal().style.display = 'none';
    _sugerencias = [];
    _indice      = -1;
  }

  function moverIndice(dir) {
    const items = _getPortal().querySelectorAll('.cat-ac-item');
    if (!items.length) return;
    items[_indice]?.classList.remove('cat-ac-item-activo');
    _indice = (_indice + dir + items.length) % items.length;
    items[_indice]?.classList.add('cat-ac-item-activo');
    items[_indice]?.scrollIntoView({ block: 'nearest' });
  }

  // Reposicionar al hacer scroll
  document.addEventListener('scroll', () => {
    if (_inputActivo && _getPortal().style.display !== 'none') {
      _posicionar(_inputActivo);
    }
  }, true);

  // Cerrar al hacer click fuera
  document.addEventListener('mousedown', e => {
    if (!_portal) return;
    if (!_portal.contains(e.target) && e.target !== _inputActivo) ocultar();
  });

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Engancha el autocomplete a un input, usando la categoría del contenedor.
   * @param {HTMLInputElement} input  - el campo .cat-item-producto
   * @param {string}           catKey - clave de Nomenclaturas (ej: 'anillos')
   */
  function attach(input, catKey) {
    if (!input || !catKey) return;
    if (!window.Nomenclaturas?.[catKey]?.length) return;

    input.addEventListener('input', () => {
      if (input.value.trim()) mostrar(input, catKey, input.value);
      else ocultar();
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) mostrar(input, catKey, input.value);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => { if (_inputActivo === input) ocultar(); }, 180);
    });

    input.addEventListener('keydown', e => {
      const p = _getPortal();
      if (p.style.display === 'none') return;
      if (e.key === 'ArrowDown')  { e.preventDefault(); moverIndice(+1); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); moverIndice(-1); return; }
      if (e.key === 'Escape')     { ocultar(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (_indice >= 0 && _sugerencias[_indice]) {
          e.preventDefault();
          seleccionar(_sugerencias[_indice]);
        } else if (e.key === 'Tab') {
          ocultar(); // Tab sin selección: cerrar y dejar que Tab avance normalmente
        }
      }
    });
  }

  /**
   * Engancha el campo de cantidad de una fila: al presionar Enter con un número > 1,
   * duplica la fila esa cantidad de veces (con los mismos datos) y resetea el campo a 1.
   * @param {HTMLInputElement} inputCantidad - el campo .cat-item-cantidad
   * @param {HTMLElement}      row           - la fila .cat-item-row actual
   * @param {HTMLElement}      cont          - el contenedor .cat-items-list
   * @param {Function}         crearFila     - (cont, item) => crea y agrega una fila igual a _agregarFilaItem
   */
  function attachCantidad(inputCantidad, row, cont, crearFila) {
    if (!inputCantidad || !row || !cont || typeof crearFila !== 'function') return;

    function duplicar() {
      const cantidad = Math.max(1, parseInt(inputCantidad.value) || 1);
      if (cantidad <= 1) return;

      const producto     = row.querySelector('.cat-item-producto')?.value || '';
      const descripcion  = row.querySelector('.cat-item-desc')?.value || '';
      const precioStr    = row.querySelector('.cat-item-precio')?.value || '';
      const pedido       = row.querySelector('.cat-item-pedido')?.checked || false;
      const precioVenta  = precioStr !== '' && window.FormatoNumero
        ? window.FormatoNumero.desformatearMiles(precioStr)
        : (precioStr || null);

      let referencia = row;
      for (let i = 1; i < cantidad; i++) {
        crearFila(cont, { producto, descripcion, precioVenta, pedidoEspecial: pedido });
        const nueva = cont.lastElementChild;
        if (nueva && nueva !== referencia) {
          referencia.after(nueva); // mover justo debajo de la fila de referencia
          referencia = nueva;
        }
      }

      inputCantidad.value = '1';
      window.UI?.mostrarToast?.(`${cantidad} ítems cargados`, 'success');
    }

    inputCantidad.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); duplicar(); }
    });
    inputCantidad.addEventListener('blur', duplicar);
  }

  window.NomenclaturaAC = { attach, attachCantidad };

})();
