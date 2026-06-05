const tabs = document.querySelectorAll('.rewards-tab');
    const rows = document.querySelectorAll('.rewards-row');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('rewards-tab--active'));
        tab.classList.add('rewards-tab--active');
        const rank = tab.dataset.rank;
        rows.forEach(row => {
          row.classList.toggle('rewards-row--hidden', row.dataset.rank !== rank);
        });
      });
    });