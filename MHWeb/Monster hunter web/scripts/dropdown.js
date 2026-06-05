document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggles = document.querySelectorAll('.sidebar__item-toggle');

  sidebarToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const item = toggle.closest('.sidebar__item');
      const wasOpen = item.classList.contains('sidebar__item--open');
      const openItems = document.querySelectorAll('.sidebar__item--open');

      openItems.forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('sidebar__item--open');
        }
      });

      if (wasOpen) {
        item.classList.remove('sidebar__item--open');
      } else {
        item.classList.add('sidebar__item--open');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!sidebar || sidebar.contains(e.target)) return;

    const openItems = document.querySelectorAll('.sidebar__item--open');
    openItems.forEach(openItem => openItem.classList.remove('sidebar__item--open'));
  });
});
