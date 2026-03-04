(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});

  DistalApp.initMobileNav = function initMobileNav() {
    const siteHeader = document.querySelector('.site-header');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelectorAll('.nav-links a');
    if (!siteHeader || !navToggle) return;

    function setMenuOpen(open) {
      siteHeader.classList.toggle('is-menu-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    navToggle.addEventListener('click', () => {
      const next = navToggle.getAttribute('aria-expanded') !== 'true';
      setMenuOpen(next);
    });

    navLinks.forEach((a) => a.addEventListener('click', () => setMenuOpen(false)));

    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth > 900) setMenuOpen(false);
      },
      { passive: true },
    );
  };
})();
