document.addEventListener('DOMContentLoaded', () => {

  const sidebar    = document.getElementById('sidebar');
  const toggles    = document.querySelectorAll('.sidebar__item-toggle');
  const BREAKPOINT = 820;

  // ── Crear overlay ───────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // ── Helpers ─────────────────────────────────────────
  const isMobile = () => window.innerWidth <= BREAKPOINT;

  function expandSidebar() {
    sidebar.classList.add('sidebar--expanded');
    overlay.classList.add('sidebar-overlay--visible');
    document.body.style.overflow = 'hidden';
  }

  function collapseSidebar() {
    sidebar.classList.remove('sidebar--expanded');
    overlay.classList.remove('sidebar-overlay--visible');
    document.body.style.overflow = '';
    document.querySelectorAll('.sidebar__item--open')
      .forEach(el => el.classList.remove('sidebar__item--open'));
  }

  // ── Click overlay → cerrar sidebar ──────────────────
  overlay.addEventListener('click', collapseSidebar);

  // ── Click en cada toggle ─────────────────────────────
  toggles.forEach(toggle => {
    toggle.addEventListener('click', e => {
      e.preventDefault();
      const item = toggle.closest('.sidebar__item');

      if (isMobile()) {
        // Si la sidebar está colapsada, expandirla primero
        // y abrir el dropdown clickado directamente
        if (!sidebar.classList.contains('sidebar--expanded')) {
          expandSidebar();
          item.classList.add('sidebar__item--open');
          return;
        }
      }

      // ── Lógica dropdown original ─────────────────────
      // Cierra todos los demás items abiertos
      document.querySelectorAll('.sidebar__item--open').forEach(openItem => {
        if (openItem !== item) openItem.classList.remove('sidebar__item--open');
      });
      // Toggle del item clickado
      item.classList.toggle('sidebar__item--open');
    });
  });

  // ── Resize: limpiar si sale de móvil ────────────────
  window.addEventListener('resize', () => {
    if (!isMobile()) collapseSidebar();
  });

});
