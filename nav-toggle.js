// ============================================
// Mobile nav toggle — shared across every page
// ============================================
const toggle = document.getElementById('navToggle');
const navList = document.getElementById('navList');

if (toggle && navList) {
  toggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('navOpen');
    toggle.setAttribute('aria-expanded', isOpen);
  });
}
