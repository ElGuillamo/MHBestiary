// ── Lightbox ─────────────────────────────────────────────
// Activa el lightbox en cualquier imagen con la clase .lb-trigger.
// Cierra al hacer clic fuera de la imagen o pulsando Escape.

(function () {
  const overlay = document.getElementById('lb-overlay');
  const lbImg   = document.getElementById('lb-img');

  if (!overlay || !lbImg) return;

  function open(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || '';
    overlay.classList.add('lb-overlay--active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('lb-overlay--active');
    document.body.style.overflow = '';
    // Limpia src después de la transición para evitar flash al reabrir
    setTimeout(() => { lbImg.src = ''; }, 300);
  }

  // Delegación de eventos: funciona aunque las imágenes se carguen tarde
  document.addEventListener('click', function (e) {
    const img = e.target.closest('.lb-trigger');
    if (img) {
      e.preventDefault();
      open(img.src, img.alt);
    }
  });

  // Clic en el fondo (overlay) cierra; clic en la imagen no cierra
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  // Escape también cierra
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('lb-overlay--active')) {
      close();
    }
  });
})();
