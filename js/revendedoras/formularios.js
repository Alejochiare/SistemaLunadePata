/**
 * formularios.js — Luna de Plata
 * Manejo de formularios: validación, apertura/cierre de modales,
 * recolección de datos.
 */

// =========================================================
// MODAL REVENDEDORA
// =========================================================

/**
 * Abre el modal para crear una nueva revendedora.
 */
function abrirModalNuevaRevendedora() {
  const overlay = document.getElementById('modal-revendedora');
  const form    = document.getElementById('form-revendedora');
  const titulo  = document.getElementById('modal-rev-titulo');

  if (!overlay || !form) return;

  // Resetear el formulario y quitar id de edición
  form.reset();
  form.dataset.editId = '';
  if (titulo) titulo.textContent = 'Nueva Revendedora';

  // Poner fecha de inicio como hoy por defecto
  const hoy = new Date().toISOString().split('T')[0];
  const campoFechaInicio = document.getElementById('rev-fechaInicio');
  if (campoFechaInicio) campoFechaInicio.value = hoy;

  limpiarErrores(form);
  overlay.classList.add('open');
  // Foco en primer campo
  setTimeout(() => {
    const primerInput = form.querySelector('input');
    if (primerInput) primerInput.focus();
  }, 100);
}

/**
 * Abre el modal de revendedora con datos para editar.
 * @param {Object} revendedora
 */
function abrirModalEditarRevendedora(revendedora) {
  const overlay = document.getElementById('modal-revendedora');
  const form    = document.getElementById('form-revendedora');
  const titulo  = document.getElementById('modal-rev-titulo');

  if (!overlay || !form) return;

  form.reset();
  form.dataset.editId = revendedora.id;
  if (titulo) titulo.textContent = 'Editar Revendedora';

  // Rellenar campos
  const campos = ['nombre', 'fechaNacimiento', 'telefono', 'dni', 'mail', 'direccion', 'localidad', 'fechaInicio'];
  campos.forEach(campo => {
    const el = document.getElementById(`rev-${campo}`);
    if (el && revendedora[campo] !== undefined) {
      el.value = revendedora[campo] || '';
    }
  });

  // Prefill username (nunca prefill password)
  const usuario = window.Storage.obtenerUsuarioPorRevendedoraId(revendedora.id);
  const elUser = document.getElementById('rev-username');
  if (elUser) elUser.value = usuario ? usuario.username : '';
  const elPass = document.getElementById('rev-password');
  if (elPass) elPass.value = '';

  limpiarErrores(form);
  overlay.classList.add('open');
}

/**
 * Cierra el modal de revendedora.
 */
function cerrarModalRevendedora() {
  const overlay = document.getElementById('modal-revendedora');
  if (overlay) overlay.classList.remove('open');
}

/**
 * Recolecta y valida los datos del formulario de revendedora.
 * @returns {Object|null} datos validados o null si hay errores
 */
function recolectarDatosRevendedora() {
  const form = document.getElementById('form-revendedora');
  if (!form) return null;

  limpiarErrores(form);
  let valido = true;

  const datos = {
    nombre:          obtenerValorCampo('rev-nombre'),
    fechaNacimiento: obtenerValorCampo('rev-fechaNacimiento'),
    telefono:        obtenerValorCampo('rev-telefono'),
    dni:             obtenerValorCampo('rev-dni'),
    mail:            obtenerValorCampo('rev-mail'),
    direccion:       obtenerValorCampo('rev-direccion'),
    localidad:       obtenerValorCampo('rev-localidad'),
    fechaInicio:     obtenerValorCampo('rev-fechaInicio'),
    _credenciales: {
      username: obtenerValorCampo('rev-username'),
      password: obtenerValorCampo('rev-password'),
    },
  };

  // Validaciones requeridas
  const requeridos = ['nombre', 'telefono', 'fechaInicio'];
  requeridos.forEach(campo => {
    if (!datos[campo]) {
      mostrarError(`rev-${campo}`, 'Este campo es requerido');
      valido = false;
    }
  });

  // Validar email si se ingresó
  if (datos.mail && !validarEmail(datos.mail)) {
    mostrarError('rev-mail', 'Ingresá un email válido');
    valido = false;
  }

  return valido ? datos : null;
}

// =========================================================
// MODAL PAÑO — Categorías dinámicas
// =========================================================

const CATEGORIAS_PANO = [
  { key: 'anillos',                    label: 'SUB TOTAL ANILLOS' },
  { key: 'aros',                       label: 'SUB TOTAL AROS' },
  { key: 'cadenasConjuntos',           label: 'SUB TOTAL CADENAS Y CONJUNTOS' },
  { key: 'dijes',                      label: 'SUB TOTAL DIJES' },
  { key: 'pulseras',                   label: 'SUB TOTAL PULSERAS' },
  { key: 'accesoriosGoldFabricacion',  label: 'SUB TOTAL ACCESORIOS, GOLD FIELD Y FABRICACIÓN' },
  { key: 'anillosAcero',               label: 'SUB TOTAL ANILLO ACERO' },
  { key: 'arosAcero',                  label: 'SUB TOTAL AROS ACERO' },
  { key: 'cadenasAcero',               label: 'SUB TOTAL CADENA Y CONJUNTOS ACERO' },
  { key: 'dijesAcero',                label: 'SUB TOTAL DIJES ACERO' },
  { key: 'pulserasAcero',              label: 'SUB TOTAL PULSERA Y TOBILLERAS ACERO' },
  { key: 'relojes',                    label: 'SUB TOTAL RELOJES, ABRIDORES CH' },
  { key: 'joyasPersonalizadas',        label: 'SUB TOTAL JOYAS PERSONALIZADAS' },
  { key: 'maryKay',                    label: 'SUB TOTAL PRODUCTOS MARY KAY' },
  { key: 'precioFijoArreglos',         label: 'SUB TOTAL PRECIO FIJO/ARREGLOS/GRABADOS' },
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

/** Vacía todos los contenedores de categorías del modal. */
function inicializarListasCategorias() {
  CATEGORIAS_PANO.forEach(({ key }) => {
    const cont = document.getElementById(`pano-cat-${key}`);
    if (cont) cont.innerHTML = '';
  });
}

/**
 * Pobla un contenedor de categoría con sus items.
 * Soporta tanto el formato nuevo (array) como el legado (string).
 */
function poblarCategoria(key, valor) {
  const cont = document.getElementById(`pano-cat-${key}`);
  if (!cont) return;
  cont.innerHTML = '';

  if (Array.isArray(valor)) {
    valor.forEach(item => _agregarFilaItem(cont, item));
  } else if (typeof valor === 'string' && valor.trim()) {
    // Migración desde formato legado: cada línea se convierte en un item
    valor.split('\n').filter(l => l.trim()).forEach(linea => {
      _agregarFilaItem(cont, { producto: linea.trim(), descripcion: '' });
    });
  }
}

/**
 * Agrega una fila vacía al contenedor de la categoría (llamado desde el HTML).
 * @param {string} key
 */
function agregarItem(key) {
  const cont = document.getElementById(`pano-cat-${key}`);
  if (!cont) return;
  _agregarFilaItem(cont, { producto: '', descripcion: '' });
  // Foco en el nuevo input de producto
  const filas = cont.querySelectorAll('.cat-item-row');
  const ultima = filas[filas.length - 1];
  if (ultima) {
    const input = ultima.querySelector('.cat-item-producto');
    if (input) setTimeout(() => input.focus(), 50);
  }
}

/** Crea y agrega una fila de artículo al contenedor. */
function _agregarFilaItem(cont, item = {}) {
  const catKey = (cont.id || '').replace('pano-page-cat-', '').replace('rev-pano-cat-', '');

  const row = document.createElement('div');
  row.className = 'cat-item-row';
  row.innerHTML = `
    <input type="hidden" class="cat-item-id"         value="${_esc(item.id || '')}">
    <input type="hidden" class="cat-item-vendido"    value="${item.vendido ? 'true' : 'false'}">
    <input type="hidden" class="cat-item-fecha-venta" value="${_esc(item.fechaVenta || '')}">
    <div class="cat-item-autocomplete-wrap">
      <input type="text" class="form-input cat-item-producto"
        placeholder="Código / Nombre del artículo"
        value="${_esc(item.producto || '')}" autocomplete="off">
    </div>
    <input type="text" class="form-input cat-item-desc"
      placeholder="Descripción (ej: ESTRELLA)"
      value="${_esc(item.descripcion || '')}">
    <input type="text" inputmode="numeric" class="form-input cat-item-precio input-miles"
      placeholder="Precio *"
      value="${item.precioVenta != null ? item.precioVenta : ''}">
    <input type="number" class="form-input cat-item-cantidad" min="1" max="99" value="1" title="Cantidad: escribí un número y presioná Enter para duplicar esta fila">
    <input type="checkbox" class="cat-item-pedido" ${item.pedidoEspecial ? 'checked' : ''}
      title="Pedido especial: la revendedora ya lo tiene vendido de palabra y lo pidió para el paño">
    <button type="button" class="btn btn-danger-ghost btn-icon cat-item-del" title="Eliminar artículo">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;
  row.querySelector('.cat-item-del').addEventListener('click', () => row.remove());
  window.FormatoNumero.attachInputMiles(row.querySelector('.cat-item-precio'));
  window.NomenclaturaAC?.attach(row.querySelector('.cat-item-producto'), catKey);
  window.NomenclaturaAC?.attachCantidad(row.querySelector('.cat-item-cantidad'), row, cont, _agregarFilaItem);
  cont.appendChild(row);
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Recolecta los items de un contenedor de categoría como array. */
function _recolectarCategoria(key) {
  const cont = document.getElementById(`pano-cat-${key}`);
  if (!cont) return [];
  const items = [];
  cont.querySelectorAll('.cat-item-row').forEach(row => {
    const producto = row.querySelector('.cat-item-producto')?.value.trim() || '';
    if (!producto) return; // ignorar filas vacías

    const precioStr  = row.querySelector('.cat-item-precio')?.value.trim() || '';
    const precioVenta = precioStr !== '' ? window.FormatoNumero.desformatearMiles(precioStr) : null;

    // Preservar id y estado vendido si el item ya existía
    const existingId  = row.querySelector('.cat-item-id')?.value.trim() || '';
    const vendido     = row.querySelector('.cat-item-vendido')?.value === 'true';
    const fechaVenta  = row.querySelector('.cat-item-fecha-venta')?.value.trim() || null;
    const pedidoEspecial = row.querySelector('.cat-item-pedido')?.checked || false;

    items.push({
      id:          existingId || window.Storage.generarId(),
      producto,
      descripcion: row.querySelector('.cat-item-desc')?.value.trim() || '',
      precioVenta,
      vendido,
      fechaVenta:  fechaVenta || null,
      pedidoEspecial,
    });
  });
  return items;
}

// =========================================================
// MODAL PAÑO
// =========================================================

/**
 * abrirModalNuevoPano
 * Abre el modal para crear un nuevo paño.
 * @param {string} revendedoraId
 * @param {string} nombreRevendedora
 */
function abrirModalNuevoPano(revendedoraId, nombreRevendedora) {
  const overlay   = document.getElementById('modal-pano');
  const form      = document.getElementById('form-pano');
  const titulo    = document.getElementById('modal-pano-titulo');
  const subtitulo = document.getElementById('modal-pano-subtitulo');

  if (!overlay || !form) return;

  form.reset();
  inicializarListasCategorias();
  Object.entries(DEFAULTS_NUEVO_PANO).forEach(([key, count]) => {
    const cont = document.getElementById(`pano-cat-${key}`);
    if (cont) for (let i = 0; i < count; i++) _agregarFilaItem(cont, {});
  });
  form.dataset.revendedoraId = revendedoraId;
  form.dataset.editId = '';

  if (titulo)    titulo.textContent    = 'Asignar Paño';
  if (subtitulo) subtitulo.textContent = nombreRevendedora;

  const hoy = new Date().toISOString().split('T')[0];
  const campoFecha = document.getElementById('pano-fechaEntrega');
  if (campoFecha) {
    campoFecha.value = hoy;
    campoFecha.dispatchEvent(new Event('change'));
  }

  const campoPrep = document.getElementById('pano-preparadoPor');
  if (campoPrep) campoPrep.value = '';

  const panos     = window.Storage.obtenerPanosDeRevendedora(revendedoraId);
  const numeroPano = window.Storage.calcularNumeroPano(panos);
  const campoNumero = document.getElementById('pano-numero-preview');
  if (campoNumero) campoNumero.textContent = window.Calculos.formatearNumeroPano(numeroPano);

  limpiarErrores(form);
  overlay.classList.add('open');

  setTimeout(() => {
    form.querySelector('input[type="date"]')?.focus();
  }, 100);
}

/**
 * abrirModalEditarPano
 * Abre el modal de paño con datos existentes para editar.
 * @param {Object} pano
 * @param {string} nombreRevendedora
 */
function abrirModalEditarPano(pano, nombreRevendedora) {
  const overlay   = document.getElementById('modal-pano');
  const form      = document.getElementById('form-pano');
  const titulo    = document.getElementById('modal-pano-titulo');
  const subtitulo = document.getElementById('modal-pano-subtitulo');

  if (!overlay || !form) return;

  form.reset();
  inicializarListasCategorias();
  form.dataset.revendedoraId = pano.revendedoraId;
  form.dataset.editId = pano.id;

  if (titulo)    titulo.textContent    = window.Calculos.formatearNumeroPano(pano.numero);
  if (subtitulo) subtitulo.textContent = nombreRevendedora;

  const campoNumero = document.getElementById('pano-numero-preview');
  if (campoNumero) campoNumero.textContent = window.Calculos.formatearNumeroPano(pano.numero);

  const elFecha = document.getElementById('pano-fechaEntrega');
  if (elFecha) {
    elFecha.value = pano.fechaEntrega || '';
    elFecha.dispatchEvent(new Event('change'));
  }

  const elDiasAd = document.getElementById('pano-diasAdicionales');
  if (elDiasAd) elDiasAd.value = pano.diasAdicionales || '';

  const elPrep = document.getElementById('pano-preparadoPor');
  if (elPrep) elPrep.value = pano.preparadoPor || '';

  const categorias = pano.categorias || {};
  CATEGORIAS_PANO.forEach(({ key }) => {
    if (categorias[key] !== undefined) poblarCategoria(key, categorias[key]);
  });

  limpiarErrores(form);
  overlay.classList.add('open');
}

/**
 * cerrarModalPano
 */
function cerrarModalPano() {
  const overlay = document.getElementById('modal-pano');
  if (overlay) overlay.classList.remove('open');
}

/**
 * recolectarDatosPano
 */
function recolectarDatosPano() {
  const form = document.getElementById('form-pano');
  if (!form) return null;

  limpiarErrores(form);

  const fechaEntrega = obtenerValorCampo('pano-fechaEntrega');
  if (!fechaEntrega) {
    mostrarError('pano-fechaEntrega', 'Requerido');
    return null;
  }

  // Validar que todos los artículos tengan precio
  let hayItemsSinPrecio = false;
  CATEGORIAS_PANO.forEach(({ key }) => {
    const cont = document.getElementById(`pano-cat-${key}`);
    if (!cont) return;
    cont.querySelectorAll('.cat-item-row').forEach(row => {
      const producto = row.querySelector('.cat-item-producto')?.value.trim() || '';
      if (!producto) return;
      const precioInput = row.querySelector('.cat-item-precio');
      const precioStr   = precioInput?.value.trim() || '';
      const precio      = window.FormatoNumero.desformatearMiles(precioStr);
      if (!precioStr || precio < 0) {
        precioInput?.classList.add('input-error');
        hayItemsSinPrecio = true;
      }
    });
  });

  if (hayItemsSinPrecio) {
    window.UI?.mostrarToast('Todos los artículos deben tener un precio de venta.', 'danger');
    return null;
  }

  const categorias = {};
  CATEGORIAS_PANO.forEach(({ key }) => {
    const items = _recolectarCategoria(key);
    if (items.length > 0) categorias[key] = items;
  });

  const diasAdicionales = parseInt(obtenerValorCampo('pano-diasAdicionales'), 10) || 0;
  const preparadoPor    = obtenerValorCampo('pano-preparadoPor') || '';

  return {
    revendedoraId: form.dataset.revendedoraId,
    fechaEntrega,
    diasAdicionales,
    preparadoPor,
    categorias,
  };
}

/**
 * Actualiza el preview de fechas en el modal.
 * Se llama automáticamente cuando cambia la fecha de entrega.
 */
function actualizarPreviewFechas() {
  const fechaEntrega = obtenerValorCampo('pano-fechaEntrega');

  const elEntrega = document.getElementById('pano-fechaEntrega-preview');
  if (elEntrega) {
    elEntrega.textContent = fechaEntrega ? window.Calculos.formatearFecha(fechaEntrega) : '—';
  }

  if (fechaEntrega) {
    const diasAd = parseInt(document.getElementById('pano-diasAdicionales')?.value || '0', 10) || 0;
    const fechaVencimiento = window.Calculos.calcularFechaVencimientoEfectiva(fechaEntrega, diasAd);
    const elVencimiento = document.getElementById('pano-fechaVencimiento-preview');
    if (elVencimiento) {
      elVencimiento.textContent = window.Calculos.formatearFecha(fechaVencimiento);
    }
  }
}



// =========================================================
// MODAL VER REVENDEDORA
// =========================================================

/**
 * Cierra el modal de vista de revendedora.
 */
function cerrarModalVerRevendedora() {
  const overlay = document.getElementById('modal-ver-revendedora');
  if (overlay) overlay.classList.remove('open');
}

// =========================================================
// UTILIDADES DE FORMULARIO
// =========================================================

function obtenerValorCampo(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function obtenerValorNumerico(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  const num = parseFloat(el.value);
  return isNaN(num) ? null : num;
}

function obtenerValorNumericoOpcional(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return undefined;
  const num = parseFloat(el.value);
  return isNaN(num) ? undefined : num;
}

function mostrarError(id, mensaje) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('input-error');
  const hint = el.parentElement?.querySelector('.form-error');
  if (hint) {
    hint.textContent = mensaje;
    hint.style.display = 'block';
  }
}

function limpiarErrores(form) {
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  form.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Cierra cualquier modal al hacer click fuera de él.
 */
function inicializarCierrePorOverlay() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // ESC para cerrar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

// Exportar al scope global
window.Formularios = {
  abrirModalNuevaRevendedora,
  abrirModalEditarRevendedora,
  cerrarModalRevendedora,
  recolectarDatosRevendedora,

  abrirModalNuevoPano,
  abrirModalEditarPano,
  cerrarModalPano,
  recolectarDatosPano,
  agregarItem,

  cerrarModalVerRevendedora,

  actualizarPreviewFechas,
  inicializarCierrePorOverlay,
};

