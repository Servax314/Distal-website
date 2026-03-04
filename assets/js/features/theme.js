(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});

  DistalApp.initTheme = function initTheme() {
    const themeLink = document.getElementById('theme-css');
    const themeSelect = document.getElementById('theme-select');
    if (!themeLink) return;

    const THEMES = [
      'retro',
      'modern',
      'terminal',
      'academic',
      'brutalist',
      'noir',
      'helios',
      'nord',
    ];

    function normalizeTheme(name) {
      if (!name) return null;
      const cleaned = String(name).trim().toLowerCase();
      return THEMES.includes(cleaned) ? cleaned : null;
    }

    function setTheme(themeName, { persist = true } = {}) {
      const t = normalizeTheme(themeName) || THEMES[0];
      const currentHref = themeLink.getAttribute('href') || '';
      const currentMatch = currentHref.match(/\/assets\/css\/([a-z0-9_-]+)\.css/i);
      const currentTheme = normalizeTheme(currentMatch?.[1]);
      if (currentTheme !== t) {
        themeLink.setAttribute('href', `/assets/css/${t}.css`);
      }

      if (themeSelect) themeSelect.value = t;

      if (persist) {
        try {
          localStorage.setItem('themeName', t);
        } catch (_) {}
      }
    }

    function themeFromQueryString() {
      try {
        const url = new URL(window.location.href);
        return normalizeTheme(url.searchParams.get('theme'));
      } catch {
        return null;
      }
    }

    const fromQS = themeFromQueryString();
    if (fromQS) {
      setTheme(fromQS);
    } else {
      const href = themeLink.getAttribute('href') || '';
      const match = href.match(/\/assets\/css\/([a-z0-9_-]+)\.css/i);
      const fromHref = normalizeTheme(match?.[1]);
      const bootTheme = fromHref || THEMES[0];
      if (themeSelect) themeSelect.value = bootTheme;
    }

    if (!themeSelect) return;

    if (themeSelect.options.length === 0) {
      for (const t of THEMES) {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        themeSelect.appendChild(opt);
      }
    }

    themeSelect.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  };
})();
