/**
 * formato-numero.js — Luna de Plata
 * Formateo en vivo de montos con separador de miles ("." estilo argentino)
 * para inputs de precios y pagos.
 */

/**
 * "250000" / 250000 → "250.000". Preserva un signo "-" inicial.
 */
function formatearMiles(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const str      = String(valor);
  const negativo = str.trim().startsWith('-');
  const digitos  = str.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (digitos === '') return negativo ? '-' : '';
  const formateado = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return negativo ? '-' + formateado : formateado;
}

/**
 * "250.000" → 250000. "-1.500" → -1500. Vacío/inválido → 0.
 */
function desformatearMiles(texto) {
  if (texto === null || texto === undefined) return 0;
  const str      = String(texto);
  const negativo = str.trim().startsWith('-');
  const digitos  = str.replace(/\D/g, '');
  if (digitos === '') return 0;
  const num = parseInt(digitos, 10);
  return negativo ? -num : num;
}

/**
 * Convierte un input en un campo con formateo de miles en vivo:
 * va agregando los "." mientras se escribe y mantiene el cursor en su lugar.
 */
function attachInputMiles(input) {
  if (!input || input.dataset.milesAttached === '1') return;
  input.dataset.milesAttached = '1';
  input.setAttribute('inputmode', 'numeric');
  if (input.type === 'number') input.type = 'text';

  if (input.value !== '') input.value = formatearMiles(input.value);

  input.addEventListener('input', () => {
    const cursorPos = input.selectionStart ?? input.value.length;
    const digitosAntesDelCursor = input.value.slice(0, cursorPos).replace(/\D/g, '').length;

    input.value = formatearMiles(input.value);

    let pos = 0;
    let digitos = 0;
    while (pos < input.value.length && digitos < digitosAntesDelCursor) {
      if (/\d/.test(input.value[pos])) digitos++;
      pos++;
    }
    input.setSelectionRange(pos, pos);
  });
}

/**
 * Aplica attachInputMiles a varios inputs (selector CSS, NodeList o array).
 */
function attachInputsMiles(selectorOrLista) {
  const elementos = typeof selectorOrLista === 'string'
    ? document.querySelectorAll(selectorOrLista)
    : selectorOrLista;
  elementos.forEach(el => attachInputMiles(el));
}

window.FormatoNumero = {
  formatearMiles,
  desformatearMiles,
  attachInputMiles,
  attachInputsMiles,
};
