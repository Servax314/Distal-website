(() => {
  const DistalApp = window.DistalApp;
  if (!DistalApp) return;

  const boot = [
    DistalApp.initTheme,
    DistalApp.initMobileNav,
    DistalApp.initScrollProgress,
    DistalApp.initSections,
    DistalApp.initAsciiStatic,
    DistalApp.initAsciiInline,
    DistalApp.initAsciiPlayers,
  ];

  for (const initFn of boot) {
    if (typeof initFn !== 'function') continue;
    try {
      initFn();
    } catch (err) {
      console.error('Boot error:', err);
    }
  }
})();
