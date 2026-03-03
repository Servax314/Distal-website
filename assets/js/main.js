

(() => {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const resizeFitters = new Set();
  const resizeSettleFitters = new Set();
  let fitRafId = 0;
  let resizeSettleTimer = 0;
  const RESIZE_SETTLE_MS = 140;
  const textMeasureCanvas = document.createElement('canvas');
  const textMeasureCtx = textMeasureCanvas.getContext('2d');

  function getCharWidthRatio(el) {
    if (!textMeasureCtx) return 0.72;
    const cs = getComputedStyle(el);
    const family = cs.fontFamily || 'monospace';
    textMeasureCtx.font = `1px ${family}`;
    const measured = textMeasureCtx.measureText('M').width;
    return Math.max(0.55, Math.min(1.1, measured || 0.72));
  }

  function runFitters() {
    resizeFitters.forEach((fn) => fn());
  }

  function runSettleFitters() {
    resizeSettleFitters.forEach((fn) => fn());
  }

  function requestFitterPass() {
    if (fitRafId) return;
    fitRafId = requestAnimationFrame(() => {
      fitRafId = 0;
      runFitters();
    });
  }

  function handleWindowResize() {
    requestFitterPass();
    if (resizeSettleTimer) clearTimeout(resizeSettleTimer);
    resizeSettleTimer = window.setTimeout(() => {
      runSettleFitters();
    }, RESIZE_SETTLE_MS);
  }

  window.addEventListener('resize', handleWindowResize, { passive: true });

// ----------------------------
// Theme selection (dropdown)
// ----------------------------
const themeLink = document.getElementById('theme-css');
const themeSelect = document.getElementById('theme-select');

// Define your available themes here (must match /assets/css/<name>.css)
const THEMES = [
  'retro',
  'modern',
  'terminal',
  'academic',
  'brutalist',
  'noir',
  'helios',
  'nord'
];

function normalizeTheme(name) {
  if (!name) return null;
  const cleaned = String(name).trim().toLowerCase();
  return THEMES.includes(cleaned) ? cleaned : null;
}

function setTheme(themeName, { persist = true } = {}) {
  if (!themeLink) return;

  const t = normalizeTheme(themeName) || THEMES[0];
  const currentHref = themeLink.getAttribute('href') || '';
  const currentMatch = currentHref.match(/\/assets\/css\/([a-z0-9_-]+)\.css/i);
  const currentTheme = normalizeTheme(currentMatch?.[1]);
  if (currentTheme !== t) {
    themeLink.setAttribute('href', `/assets/css/${t}.css`);
  }

  if (themeSelect) themeSelect.value = t;

  if (persist) {
    try { localStorage.setItem('themeName', t); } catch (_) {}
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

// Initial theme selection priority:
// 1) ?theme=xxx
// 2) current <link href> if it matches
// 3) fallback THEMES[0]
//
// Note: we intentionally do NOT auto-apply localStorage on boot.
// Late theme swaps after first paint can cause full-page rescale jumps.
(() => {
  const fromQS = themeFromQueryString();
  if (fromQS) {
    setTheme(fromQS);
    return;
  }

  const href = themeLink?.getAttribute('href') || '';
  const match = href.match(/\/assets\/css\/([a-z0-9_-]+)\.css/i);
  const fromHref = normalizeTheme(match?.[1]);
  const bootTheme = fromHref || THEMES[0];
  if (themeSelect) themeSelect.value = bootTheme;
})();

if (themeSelect) {
  // Populate options automatically (optional)
  // If you prefer hardcoded HTML options, you can delete this block.
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
}

  // ----------------------------
  // Mobile nav menu toggle
  // ----------------------------
  const siteHeader = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelectorAll('.nav-links a');
  if (siteHeader && navToggle) {
    function setMenuOpen(open) {
      siteHeader.classList.toggle('is-menu-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    navToggle.addEventListener('click', () => {
      const next = navToggle.getAttribute('aria-expanded') !== 'true';
      setMenuOpen(next);
    });
    navLinks.forEach((a) => a.addEventListener('click', () => setMenuOpen(false)));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    }, { passive: true });
  }

  // ----------------------------
  // Scroll progress indicator
  // ----------------------------
  const progress = document.getElementById('progress');
  function updateProgress() {
    if (!progress) return;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = height > 0 ? (window.scrollY / height) : 0;
    progress.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // Keep sections static to avoid scroll-time layout mutations.
  document.querySelectorAll('.section').forEach((s) => s.classList.add('is-visible'));

  // ----------------------------
  // Static ASCII diagrams loaded from .txt files
  // ----------------------------
  const asciiStaticEls = document.querySelectorAll('[data-ascii-src]');
  if (asciiStaticEls.length) {
    const staticState = new WeakMap();
    const canvasState = new WeakMap();

    function textMetrics(txt) {
      const lines = txt.replace(/\r/g, '').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const rows = Math.max(1, lines.length);
      let cols = 1;
      for (const line of lines) cols = Math.max(cols, line.length);
      return { rows, cols };
    }

    function fitStaticAscii(el) {
      const state = staticState.get(el);
      if (!state) return;
      const code = state.code;
      if (!code) return;

      const cs = getComputedStyle(el);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const innerW = Math.max(1, el.clientWidth - padX);
      const innerH = Math.max(1, el.clientHeight - padY);
      const contentW = Math.max(1, state.baseW || 1);
      const contentH = Math.max(1, state.baseH || 1);
      const scale = Math.max(0.001, Math.min(innerW / contentW, innerH / contentH) * 0.98);
      code.style.transformOrigin = 'center center';
      code.style.transform = `scale(${scale})`;
    }

    function renderAsciiToCanvas(el, txt, color) {
      const lines = txt.replace(/\r/g, '').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const rows = Math.max(1, lines.length);
      let cols = 1;
      for (const line of lines) cols = Math.max(cols, line.length);

      const lineHeightRatio = 1.22;
      const maxDim = 4096;
      const monoFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace';
      const cs = getComputedStyle(el);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const innerW = Math.max(1, el.clientWidth - padX);
      const innerH = Math.max(1, el.clientHeight - padY);
      const charRatio = getCharWidthRatio(el);

      // Choose a display box bounded by current container size.
      const aspect = Math.max(0.01, (cols * charRatio) / Math.max(1, rows));
      let displayW = innerW * 0.98;
      let displayH = innerH * 0.98;
      if (!Number.isFinite(displayH) || displayH <= 1) {
        displayH = displayW / aspect;
      }
      if (displayW / displayH > aspect) {
        displayW = displayH * aspect;
      } else {
        displayH = displayW / aspect;
      }
      displayW = Math.max(1, Math.floor(displayW));
      displayH = Math.max(1, Math.floor(displayH));

      // Font chosen to fit within the bounded display box.
      let fontPx = Math.max(
        0.5,
        Math.min(displayW / Math.max(1, cols * charRatio), displayH / Math.max(1, rows * lineHeightRatio)) * 0.96,
      );

      // Keep backing-store dimensions within safe limits; otherwise browsers can crop/clamp.
      const requestedDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const maxBackingDim = 4096;
      const dpr = Math.max(
        1,
        Math.min(requestedDpr, maxBackingDim / Math.max(1, displayW), maxBackingDim / Math.max(1, displayH)),
      );
      const canvas = document.createElement('canvas');
      canvas.className = 'c-ascii-canvas';
      canvas.width = Math.max(1, Math.ceil(displayW * dpr));
      canvas.height = Math.max(1, Math.ceil(displayH * dpr));
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayW, displayH);
      ctx.fillStyle = color;
      ctx.font = `${fontPx}px ${monoFamily}`;
      ctx.textBaseline = 'top';

      // Measure width conservatively: max(actual measured, monospace-char-count estimate).
      function measureContentWidth() {
        const monoCharW = Math.max(0.0001, ctx.measureText('M').width);
        let maxW = 1;
        for (let i = 0; i < rows; i += 1) {
          const line = lines[i] || '';
          const measured = ctx.measureText(line).width;
          const estimated = line.length * monoCharW;
          const w = Math.max(measured, estimated);
          if (w > maxW) maxW = w;
        }
        return maxW;
      }

      let lineH = fontPx * lineHeightRatio;
      let contentW = measureContentWidth();
      let contentH = rows * lineH;
      let guard = 0;
      while ((contentW > displayW || contentH > displayH) && guard < 5) {
        const fit = Math.max(
          0.1,
          Math.min(displayW / Math.max(1, contentW), displayH / Math.max(1, contentH)) * 0.98,
        );
        fontPx = Math.max(0.5, fontPx * fit);
        ctx.font = `${fontPx}px ${monoFamily}`;
        lineH = fontPx * lineHeightRatio;
        contentW = measureContentWidth();
        contentH = rows * lineH;
        guard += 1;
      }

      const ox = Math.max(0, (displayW - contentW) / 2);
      const oy = Math.max(0, (displayH - contentH) / 2);
      for (let i = 0; i < rows; i += 1) {
        const line = lines[i] || '';
        ctx.fillText(line, ox, oy + i * lineH);
      }
      return canvas;
    }

    function remeasureStaticAscii(el) {
      const state = staticState.get(el);
      if (!state) return;
      const code = state.code;
      if (!code) return;
      code.style.fontSize = '1px';
      code.style.lineHeight = '1';
      code.style.transform = 'scale(1)';
      state.baseW = Math.max(1, code.scrollWidth);
      state.baseH = Math.max(1, code.scrollHeight);
      fitStaticAscii(el);
    }

    function redrawCanvasAscii(el) {
      const state = canvasState.get(el);
      if (!state) return;
      const color = getComputedStyle(el).color || '#fff';
      const canvas = renderAsciiToCanvas(el, state.txt, color);
      if (canvas) el.replaceChildren(canvas);
    }

    const loadStaticAscii = async (el) => {
      if (el.dataset.asciiLoaded === 'true') return;
      const src = el.dataset.asciiSrc;
      if (!src) return;

      try {
        const r = await fetch(src, { cache: 'no-store' });
        if (!r.ok) throw new Error(`Failed to load ${src} (${r.status})`);
        const txt = await r.text();
        const renderMode = (el.dataset.asciiRender || '').toLowerCase();
        const code = el.querySelector('code');

        if (renderMode === 'canvas') {
          const m = textMetrics(txt);
          const visualCols = Math.max(1, m.cols * 0.62);
          el.style.aspectRatio = `${visualCols} / ${Math.max(1, m.rows)}`;
          canvasState.set(el, { txt });
          redrawCanvasAscii(el);
          // One extra pass after layout settles prevents stale geometry crop.
          requestAnimationFrame(() => requestAnimationFrame(() => redrawCanvasAscii(el)));
          resizeFitters.add(() => redrawCanvasAscii(el));
          el.dataset.asciiLoaded = 'true';
          return;
        }

        if (code) code.textContent = txt;
        else el.textContent = txt;

        const m = textMetrics(txt);
        staticState.set(el, { ...m, code });
        // Character cells are taller than they are wide; use a ratio closer to visual reality.
        const visualCols = Math.max(1, m.cols * 0.62);
        el.style.aspectRatio = `${visualCols} / ${Math.max(1, m.rows)}`;
        remeasureStaticAscii(el);
        resizeFitters.add(() => fitStaticAscii(el));
        el.dataset.asciiLoaded = 'true';
      } catch (err) {
        const msg = `ASCII diagram error: ${err?.message || err}`;
        const code = el.querySelector('code');
        if (code) code.textContent = msg;
        else el.textContent = msg;
      }
    };

    if ('IntersectionObserver' in window) {
      const ioStatic = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          loadStaticAscii(e.target);
          ioStatic.unobserve(e.target);
        }
      }, { rootMargin: '300px 0px', threshold: 0.01 });
      asciiStaticEls.forEach((el) => ioStatic.observe(el));
    } else {
      asciiStaticEls.forEach((el) => { loadStaticAscii(el); });
    }
  }

  // ----------------------------
  // Inline ASCII blocks in HTML (matrix / diagrams)
  // ----------------------------
  const inlineAsciiPres = document.querySelectorAll('.c-ascii-graph pre:not([data-ascii-src])');
  if (inlineAsciiPres.length) {
    function inlineMetrics(txt) {
      const lines = txt.replace(/\r/g, '').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const rows = Math.max(1, lines.length);
      let cols = 1;
      for (const line of lines) cols = Math.max(cols, line.length);
      return { rows, cols };
    }

    function fitInlineAscii(preEl) {
      const code = preEl.querySelector('code');
      if (!code) return;
      const m = inlineMetrics(code.textContent || '');
      const cs = getComputedStyle(preEl);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const innerW = Math.max(1, preEl.clientWidth - padX);
      if (!preEl.dataset.baseFontPx) {
        preEl.dataset.baseFontPx = `${parseFloat(cs.fontSize) || 14}`;
      }
      const baseFontPx = parseFloat(preEl.dataset.baseFontPx) || 14;
      const charWidthRatio = 0.72;
      const fitPx = (innerW / Math.max(1, m.cols * charWidthRatio)) * 0.94;
      const target = Math.max(2, Math.min(baseFontPx, fitPx));
      preEl.style.fontSize = `${target}px`;
    }

    inlineAsciiPres.forEach((preEl) => {
      fitInlineAscii(preEl);
      resizeFitters.add(() => fitInlineAscii(preEl));
    });
  }

  // ----------------------------
  // ASCII players (loads many .txt files)
  // ----------------------------
  const asciiEls = document.querySelectorAll('[data-ascii-player]');
  if (!asciiEls.length) return;

  function initAsciiPlayer(asciiEl) {
    const cfg = {
      framePath: asciiEl.dataset.framePath || '/assets/animation/ascii/',
      prefix: asciiEl.dataset.prefix || 'frame_',
      ext: asciiEl.dataset.ext || '.txt',
      pad: Number(asciiEl.dataset.pad || 4),
      start: Number(asciiEl.dataset.start || 1),
      total: Number(asciiEl.dataset.total || 1),
      fps: Number(asciiEl.dataset.fps || 30),
      preload: (asciiEl.dataset.preload || 'true') === 'true',
      cropTrim: (asciiEl.dataset.cropTrim || 'false') === 'true',
    };

    const frameName = (i) =>
      `${cfg.prefix}${String(i).padStart(cfg.pad, '0')}${cfg.ext}`;

    // Concurrency-limited preload so hundreds of frames don't stall everything
    async function preloadFrames(concurrency = 8) {
      const frames = new Array(cfg.total);
      let next = 0;

      async function worker() {
        while (next < cfg.total) {
          const idx = next++;
          const frameIndex = cfg.start + idx;
          const url = cfg.framePath + frameName(frameIndex);

          const r = await fetch(url, { cache: 'force-cache' });
          if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`);
          frames[idx] = await r.text();
        }
      }

      const workers = Array.from({ length: Math.min(concurrency, cfg.total) }, worker);
      await Promise.all(workers);
      return frames;
    }

    let frames = [];
    let framePtr = 0;
    let running = true;
    let lastT = 0;
    const frameMs = 1000 / Math.max(1, cfg.fps);
    let speedMultiplier = 1;

    function renderFrame() {
      const txt = frames[framePtr] ?? '…';
      // If <pre> contains <code>, update the code; else update pre text
      const code = asciiEl.querySelector('code');
      if (code) code.textContent = txt;
      else asciiEl.textContent = txt;
    }

    function frameMetrics(txt) {
      const lines = txt.replace(/\r/g, '').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const rows = Math.max(1, lines.length);
      let cols = 1;
      for (const line of lines) cols = Math.max(cols, line.length);
      return { rows, cols };
    }

    function frameBounds(txt) {
      const lines = txt.replace(/\r/g, '').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      let top = Infinity;
      let bottom = -1;
      let left = Infinity;
      let right = -1;

      for (let r = 0; r < lines.length; r += 1) {
        const line = lines[r] || '';
        const first = line.search(/\S/);
        if (first === -1) continue;
        const last = line.length - 1 - [...line].reverse().join('').search(/\S/);
        top = Math.min(top, r);
        bottom = Math.max(bottom, r);
        left = Math.min(left, first);
        right = Math.max(right, last);
      }

      if (!Number.isFinite(top) || bottom < top || right < left) return null;
      return { top, bottom, left, right };
    }

    function cropFrame(txt, box) {
      const lines = txt.replace(/\r/g, '').split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const out = [];
      for (let r = box.top; r <= box.bottom; r += 1) {
        const line = lines[r] || '';
        out.push(line.slice(box.left, box.right + 1));
      }
      return out.join('\n');
    }

    function trimFrames(framesIn) {
      let box = null;
      for (const f of framesIn) {
        const b = frameBounds(f);
        if (!b) continue;
        if (!box) box = { ...b };
        else {
          box.top = Math.min(box.top, b.top);
          box.bottom = Math.max(box.bottom, b.bottom);
          box.left = Math.min(box.left, b.left);
          box.right = Math.max(box.right, b.right);
        }
      }
      if (!box) return framesIn;
      return framesIn.map((f) => cropFrame(f, box));
    }

    let maxRows = 1;
    let maxCols = 1;
    let lastBoxW = 0;
    let lastBoxH = 0;

    function fitAsciiToBox() {
      if (!frames.length) return;
      const cs = getComputedStyle(asciiEl);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const innerW = Math.max(1, asciiEl.clientWidth - padX);
      const innerH = Math.max(1, asciiEl.clientHeight - padY);
      const squareSize = Math.max(1, Math.min(innerW, innerH));

      const fontSizePx = parseFloat(cs.fontSize) || 16;
      const lineHeightRaw = parseFloat(cs.lineHeight);
      const lineHeightRatio = Number.isFinite(lineHeightRaw) ? (lineHeightRaw / fontSizePx) : 1.4;
      const charWidthRatio = 0.72; // Conservative monospace glyph width/height ratio

      const byWidth = squareSize / (maxCols * charWidthRatio);
      const byHeight = squareSize / (maxRows * lineHeightRatio);
      const target = Math.max(2.2, Math.min(byWidth, byHeight) * 0.92);
      asciiEl.style.fontSize = `${target}px`;
    }

    function ensureAsciiBoxFit() {
      const w = asciiEl.clientWidth;
      const h = asciiEl.clientHeight;
      if (w !== lastBoxW || h !== lastBoxH) {
        lastBoxW = w;
        lastBoxH = h;
        fitAsciiToBox();
      }
    }

    function tick(t) {
      if (!running) return;
      ensureAsciiBoxFit();
      if (!lastT) lastT = t;
      const effectiveFrameMs = frameMs / Math.max(0.05, speedMultiplier);

      if (t - lastT >= effectiveFrameMs) {
        renderFrame();
        framePtr = (framePtr + 1) % Math.max(1, frames.length);
        lastT = t;
      }
      requestAnimationFrame(tick);
    }

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      running = document.visibilityState === 'visible';
      if (running) {
        lastT = 0;
        requestAnimationFrame(tick);
      }
    });

    // Slow down on hover instead of pausing
    asciiEl.addEventListener('mouseenter', () => { speedMultiplier = 0.6; });
    asciiEl.addEventListener('mouseleave', () => { speedMultiplier = 1; });

    // Boot
    (async () => {
      try {
        if (cfg.preload) {
          frames = await preloadFrames(8);
          if (cfg.cropTrim) {
            frames = trimFrames(frames);
          }
          for (const f of frames) {
            const m = frameMetrics(f);
            maxRows = Math.max(maxRows, m.rows);
            maxCols = Math.max(maxCols, m.cols);
          }
          fitAsciiToBox();
          resizeFitters.add(fitAsciiToBox);
          framePtr = 0;
          renderFrame();
          if (!prefersReducedMotion) requestAnimationFrame(tick);
        } else {
          // Not recommended for many frames; still supported if you want it
          frames = [];
          asciiEl.textContent = 'Preload disabled.';
        }

        if (prefersReducedMotion) {
          // Reduced motion: show first frame only
          running = false;
        }
      } catch (err) {
        const msg = `ASCII player error: ${err?.message || err}`;
        const code = asciiEl.querySelector('code');
        if (code) code.textContent = msg;
        else asciiEl.textContent = msg;
      }
    })();
  }

  asciiEls.forEach(initAsciiPlayer);
})();
