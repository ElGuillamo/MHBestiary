const topbar = document.getElementById('topbar');
let lastScroll = 0, ticking = false;
function handleScroll() {
    const cur = window.scrollY;
    const h   = topbar.offsetHeight;
    if (cur <= h) {
    topbar.classList.remove('topbar--hidden', 'topbar--sticky');
    } else if (cur > lastScroll) {
    topbar.classList.add('topbar--hidden', 'topbar--sticky');
    } else {
    topbar.classList.remove('topbar--hidden');
    topbar.classList.add('topbar--sticky');
    }
    lastScroll = cur <= 0 ? 0 : cur;
    ticking = false;
}
window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(handleScroll); ticking = true; }
}, { passive: true });
