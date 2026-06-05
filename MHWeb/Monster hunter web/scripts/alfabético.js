document.addEventListener('DOMContentLoaded', () => {
  const monsterGrid = document.querySelector('.monster-grid');
  if (!monsterGrid) return;

  const monsterCards = Array.from(monsterGrid.querySelectorAll('.monster-card'));
  monsterCards.sort((a, b) => {
    const nameA = a.querySelector('.monster-card__name')?.textContent.trim().toLowerCase() ?? '';
    const nameB = b.querySelector('.monster-card__name')?.textContent.trim().toLowerCase() ?? '';
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

  monsterCards.forEach(card => monsterGrid.appendChild(card))
});;