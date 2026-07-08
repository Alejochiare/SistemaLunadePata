/**
 * auth.js — Luna de Plata
 * Sistema de autenticación y control de acceso por roles.
 * Requiere window.Storage (storage.js) cargado antes.
 */

window.Auth = {

  inicializar() {
    const users = window.Storage.obtenerUsuarios();
    if (!users.find(u => u.role === 'admin')) {
      window.Storage.guardarUsuario({
        role:          'admin',
        username:      'admin',
        password:      'admin123',
        nombre:        'Administrador',
        revendedoraId: null,
      });
    }
    window.Storage.inicializarSucursales();
  },

  login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Ingresá usuario y contraseña' };
    }
    const users = window.Storage.obtenerUsuarios();
    const user  = users.find(u => u.username === username.trim() && u.password === password);
    if (!user) {
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    }
    let nombre = user.nombre || user.username;
    if (user.role === 'revendedora' && user.revendedoraId) {
      const rev = window.Storage.obtenerRevendedoraPorId(user.revendedoraId);
      if (rev) nombre = rev.nombre;
    }
    if (user.role === 'sucursal' && user.sucursalId) {
      const suc = window.Storage.obtenerSucursalPorId(user.sucursalId);
      window.Storage.guardarSesion({
        userId:         user.id,
        role:           'sucursal',
        sucursalId:     user.sucursalId,
        sucursalNombre: suc ? suc.nombre : user.nombre,
        nombre:         suc ? suc.nombre : user.nombre,
      });
      return { success: true, role: 'sucursal' };
    }
    window.Storage.guardarSesion({
      userId:        user.id,
      role:          user.role,
      revendedoraId: user.revendedoraId || null,
      nombre,
    });
    return { success: true, role: user.role };
  },

  logout() {
    window.Storage.eliminarSesion();
    window.location.href = 'login.html';
  },

  obtenerSesion() {
    return window.Storage.obtenerSesion();
  },

  inyectarSidebar() {
    const sesion = this.obtenerSesion();
    if (!sesion) return;
    const footer = document.querySelector('.sidebar-footer');
    if (!footer) return;
    const roleLabel = sesion.role === 'admin' ? 'Administrador' : sesion.role === 'sucursal' ? 'Sucursal' : 'Revendedora';
    footer.innerHTML = `
      <div class="sidebar-user">
        <div class="sidebar-user-name">${_authEsc(sesion.nombre)}</div>
        <div class="sidebar-user-role">${roleLabel}</div>
      </div>
      <button class="sidebar-logout-btn" id="btn-auth-logout">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Cerrar sesión
      </button>`;
    document.getElementById('btn-auth-logout')
      ?.addEventListener('click', () => window.Auth.logout());
  },
};

function _authEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
