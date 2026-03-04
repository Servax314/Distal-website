(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});

  DistalApp.initAsciiStatic = function initAsciiStatic() {
    const runtime = DistalApp.runtime;
    if (!runtime) return;

    const asciiStaticEls = document.querySelectorAll('[data-ascii-src]');
    if (!asciiStaticEls.length) return;

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
      const monoFamily =
        getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace';
      const cs = getComputedStyle(el);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const innerW = Math.max(1, el.clientWidth - padX);
      const innerH = Math.max(1, el.clientHeight - padY);
      const charRatio = runtime.getCharWidthRatio(el);

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

      let fontPx = Math.max(
        0.5,
        Math.min(displayW / Math.max(1, cols * charRatio), displayH / Math.max(1, rows * lineHeightRatio)) *
          0.96,
      );

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
          requestAnimationFrame(() => requestAnimationFrame(() => redrawCanvasAscii(el)));
          runtime.addResizeFitter(() => redrawCanvasAscii(el));
          el.dataset.asciiLoaded = 'true';
          return;
        }

        if (code) code.textContent = txt;
        else el.textContent = txt;

        const m = textMetrics(txt);
        staticState.set(el, { ...m, code });
        const visualCols = Math.max(1, m.cols * 0.62);
        el.style.aspectRatio = `${visualCols} / ${Math.max(1, m.rows)}`;
        remeasureStaticAscii(el);
        runtime.addResizeFitter(() => fitStaticAscii(el));
        el.dataset.asciiLoaded = 'true';
      } catch (err) {
        const msg = `ASCII diagram error: ${err?.message || err}`;
        const code = el.querySelector('code');
        if (code) code.textContent = msg;
        else el.textContent = msg;
      }
    };

    if ('IntersectionObserver' in window) {
      const ioStatic = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            loadStaticAscii(entry.target);
            ioStatic.unobserve(entry.target);
          }
        },
        { rootMargin: '300px 0px', threshold: 0.01 },
      );
      asciiStaticEls.forEach((el) => ioStatic.observe(el));
    } else {
      asciiStaticEls.forEach((el) => {
        loadStaticAscii(el);
      });
    }
  };
})();
