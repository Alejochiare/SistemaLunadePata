/**
 * notificaciones.js — Luna de Plata
 * Envía emails automáticos a revendedoras 2 días antes del vencimiento del paño.
 * Usa EmailJS (https://www.emailjs.com) — no requiere backend.
 *
 * ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
 *  1. Crear cuenta gratuita en https://www.emailjs.com
 *  2. Conectar un servicio de email (Gmail, Outlook, etc.)
 *  3. Crear una plantilla de email con estas variables:
 *       {{to_email}}   → email de la revendedora
 *       {{to_name}}    → nombre de la revendedora
 *       {{pano_num}}   → número del paño (ej: "Paño 03")
 *       {{fecha_venc}} → fecha de vencimiento formateada
 *       {{dias_rest}}  → días restantes (2)
 *  4. Completar las constantes de abajo con tus datos de EmailJS
 * ────────────────────────────────────────────────────────────────────────────
 */

const EMAILJS_PUBLIC_KEY  = 'TU_PUBLIC_KEY';   // ← tu Public Key de EmailJS
const EMAILJS_SERVICE_ID  = 'TU_SERVICE_ID';   // ← ID del servicio (ej: 'service_abc123')
const EMAILJS_TEMPLATE_ID = 'TU_TEMPLATE_ID';  // ← ID de la plantilla (ej: 'template_xyz789')

const DIAS_AVISO_ANTICIPADO = 2;
const LS_KEY_NOTIF = 'ldp_notif_enviadas';

// ============================================================
// INICIALIZACIÓN
// ============================================================

function inicializar() {
  if (!_emailJsConfigurado()) return;
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  verificarVencimientosProximos();
}

// ============================================================
// LÓGICA PRINCIPAL
// ============================================================

/**
 * Recorre todos los paños abiertos y envía email si vencen en DIAS_AVISO_ANTICIPADO días
 * y aún no se envió la notificación para ese paño.
 */
function verificarVencimientosProximos() {
  const panos       = window.Storage.obtenerTodosLosPanos().filter(p => !p.cerrado);
  const revendedoras = window.Storage.obtenerRevendedoras();
  const enviadas    = _obtenerEnviadas();

  panos.forEach(pano => {
    const diasRestantes = _diasParaVencer(pano);
    if (diasRestantes !== DIAS_AVISO_ANTICIPADO) return;

    const claveNotif = `${pano.id}_${_fechaHoy()}`;
    if (enviadas.has(claveNotif)) return;

    const rev = revendedoras.find(r => r.id === pano.revendedoraId);
    if (!rev || !rev.mail) return;

    _enviarEmail(rev, pano, diasRestantes)
      .then(() => {
        enviadas.add(claveNotif);
        _guardarEnviadas(enviadas);
        console.log(`[Notif] Email enviado a ${rev.nombre} (${rev.mail}) — ${window.Calculos.formatearNumeroPano(pano.numero)}`);
      })
      .catch(err => {
        console.error('[Notif] Error al enviar email:', err);
      });
  });
}

// ============================================================
// ENVÍO
// ============================================================

function _enviarEmail(rev, pano, diasRestantes) {
  const fechaVenc = window.Calculos.formatearFecha(
    window.Calculos.calcularFechaVencimientoEfectiva(pano.fechaEntrega, pano.diasAdicionales)
  );
  const numPano = window.Calculos.formatearNumeroPano(pano.numero);

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email:   rev.mail,
    to_name:    rev.nombre,
    pano_num:   numPano,
    fecha_venc: fechaVenc,
    dias_rest:  diasRestantes,
  });
}

// ============================================================
// UTILIDADES
// ============================================================

function _diasParaVencer(pano) {
  const hoy  = new Date();
  const venc = new Date(
    window.Calculos.calcularFechaVencimientoEfectiva(pano.fechaEntrega, pano.diasAdicionales) + 'T00:00:00'
  );
  hoy.setHours(0, 0, 0, 0);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc - hoy) / (1000 * 60 * 60 * 24));
}

function _fechaHoy() {
  return new Date().toISOString().split('T')[0];
}

function _obtenerEnviadas() {
  try {
    const raw = localStorage.getItem(LS_KEY_NOTIF);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function _guardarEnviadas(set) {
  // Limpiar entradas viejas (más de 10 días) para no crecer indefinidamente
  const hoy = new Date();
  const filtradas = [...set].filter(clave => {
    const fecha = clave.split('_').pop();
    const diff  = (hoy - new Date(fecha + 'T00:00:00')) / (1000 * 60 * 60 * 24);
    return diff < 10;
  });
  localStorage.setItem(LS_KEY_NOTIF, JSON.stringify(filtradas));
}

function _emailJsConfigurado() {
  return (
    EMAILJS_PUBLIC_KEY  !== 'TU_PUBLIC_KEY'  &&
    EMAILJS_SERVICE_ID  !== 'TU_SERVICE_ID'  &&
    EMAILJS_TEMPLATE_ID !== 'TU_TEMPLATE_ID'
  );
}

window.Notificaciones = { inicializar, verificarVencimientosProximos };
