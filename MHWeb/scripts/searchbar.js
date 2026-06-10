// ── searchbar.js ─────────────────────────────────────────
// Carga search-index.json y muestra un dropdown bajo la
// searchbar con resultados en tiempo real.
// Ignora tildes, mayúsculas y coincidencias parciales.
// ─────────────────────────────────────────────────────────

(function () {

  // ── Normalizar texto (quita tildes y pasa a minúsculas) ─
  function normalize(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // ── Calcular ruta relativa al JSON desde la página actual
  function getIndexPath() {
    const path = window.location.pathname;
    const base = path.includes('/MHWeb/')
      ? path.split('/MHWeb/')[0] + '/MHWeb/'
      : '/';
    return base + 'data/search-index.json';
  }

  // ── Calcular ruta relativa a una URL del índice ──────────
  function resolveUrl(indexUrl) {
    const path = window.location.pathname;
    const base = path.includes('/MHWeb/')
      ? path.split('/MHWeb/')[0] + '/MHWeb/'
      : '/';
    return base + indexUrl;
  }

  // ── Iconos por categoría ─────────────────────────────────
  const ICONS = {
    'Monstruo':  '🐉',
    'Arma':      '⚔',
    'Categoría': '📋',
    'Página':    '📄',
    'Cuenta':    '👤',
  };

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector('.topbar__search input');
    if (!input) return;

    const wrapper = input.closest('.topbar__search');
    wrapper.style.position = 'relative';

    // Crear dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.setAttribute('role', 'listbox');
    wrapper.appendChild(dropdown);

    let index = [];
    let activeIdx = -1;
    
    const path = getIndexPath();
    console.log('Buscando JSON en:', path);
    // Cargar JSON
    fetch(getIndexPath())
      .then(r => r.json())
      .then(data => { index = data; })
      .catch(() => console.warn('search-index.json no encontrado'));

    // ── Mostrar resultados ────────────────────────────────
    function showResults(query) {
      const q = normalize(query.trim());
      dropdown.innerHTML = '';
      activeIdx = -1;

      if (!q) { closeDropdown(); return; }

      const results = index.filter(item =>
        normalize(item.title).includes(q) ||
        normalize(item.category).includes(q)
      ).slice(0, 8);

      if (!results.length) {
        dropdown.innerHTML = `<div class="search-dropdown__empty">Sin resultados</div>`;
        openDropdown();
        return;
      }

      results.forEach((item, i) => {
        const el = document.createElement('a');
        el.className = 'search-dropdown__item';
        el.href = resolveUrl(item.url);
        el.setAttribute('role', 'option');
        el.innerHTML = `
          <span class="search-dropdown__icon">${ICONS[item.category] || '📄'}</span>
          <span class="search-dropdown__info">
            <span class="search-dropdown__title">${highlight(item.title, q)}</span>
            <span class="search-dropdown__cat">${item.category}</span>
          </span>
        `;
        el.addEventListener('mousedown', e => e.preventDefault()); // evita blur antes de click
        dropdown.appendChild(el);
      });

      openDropdown();
    }

    // ── Resaltar coincidencia ─────────────────────────────
    function highlight(title, q) {
      const norm = normalize(title);
      const idx  = norm.indexOf(q);
      if (idx === -1) return title;
      return (
        title.slice(0, idx) +
        `<mark>${title.slice(idx, idx + q.length)}</mark>` +
        title.slice(idx + q.length)
      );
    }

    function openDropdown()  { dropdown.classList.add('search-dropdown--open'); }
    function closeDropdown() { dropdown.classList.remove('search-dropdown--open'); activeIdx = -1; }

    // ── Navegación con teclado ────────────────────────────
    function updateActive(items) {
      items.forEach((el, i) => el.classList.toggle('search-dropdown__item--active', i === activeIdx));
      if (activeIdx >= 0) items[activeIdx].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('keydown', e => {
      const items = [...dropdown.querySelectorAll('.search-dropdown__item')];
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % items.length;
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = (activeIdx - 1 + items.length) % items.length;
        updateActive(items);
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        items[activeIdx].click();
      } else if (e.key === 'Escape') {
        closeDropdown();
        input.blur();
      }
    });

    // ── Eventos ───────────────────────────────────────────
    input.addEventListener('input',  () => showResults(input.value));
    input.addEventListener('focus',  () => { if (input.value) showResults(input.value); });
    input.addEventListener('blur',   () => setTimeout(closeDropdown, 150));

    // Cerrar al hacer click fuera
    document.addEventListener('click', e => {
      if (!wrapper.contains(e.target)) closeDropdown();
    });
  });

})();
