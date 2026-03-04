(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});

  DistalApp.initAsciiPlayers = function initAsciiPlayers() {
    const runtime = DistalApp.runtime;
    if (!runtime) return;

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

      const frameName = (i) => `${cfg.prefix}${String(i).padStart(cfg.pad, '0')}${cfg.ext}`;

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

      function shouldAutoAspect() {
        if (asciiEl.closest('.c-cta-card')) return false;
        if (asciiEl.dataset.autoAspect === 'false') return false;
        return !asciiEl.dataset.aspectRatio;
      }

      function applyAspectRatio(lineHeightRatio) {
        if (asciiEl.dataset.aspectRatio) {
          asciiEl.style.aspectRatio = asciiEl.dataset.aspectRatio;
          return;
        }
        if (!shouldAutoAspect()) return;
        const charWidthRatio = 0.72;
        const widthUnits = Math.max(1, maxCols * charWidthRatio);
        const heightUnits = Math.max(1, maxRows * lineHeightRatio);
        asciiEl.style.aspectRatio = `${widthUnits} / ${heightUnits}`;
      }

      function fitAsciiToBox() {
        if (!frames.length) return;
        const cs = getComputedStyle(asciiEl);
        const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        let innerW = Math.max(1, asciiEl.clientWidth - padX);
        let innerH = Math.max(1, asciiEl.clientHeight - padY);

        const fontSizePx = parseFloat(cs.fontSize) || 16;
        const lineHeightRaw = parseFloat(cs.lineHeight);
        const lineHeightRatio = Number.isFinite(lineHeightRaw) ? lineHeightRaw / fontSizePx : 1.4;
        const charWidthRatio = 0.72;

        applyAspectRatio(lineHeightRatio);
        innerW = Math.max(1, asciiEl.clientWidth - padX);
        innerH = Math.max(1, asciiEl.clientHeight - padY);

        const byWidth = innerW / (maxCols * charWidthRatio);
        const byHeight = innerH / (maxRows * lineHeightRatio);
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

      document.addEventListener('visibilitychange', () => {
        running = document.visibilityState === 'visible';
        if (running) {
          lastT = 0;
          requestAnimationFrame(tick);
        }
      });

      asciiEl.addEventListener('mouseenter', () => {
        speedMultiplier = 0.6;
      });
      asciiEl.addEventListener('mouseleave', () => {
        speedMultiplier = 1;
      });

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
            runtime.addResizeFitter(fitAsciiToBox);
            framePtr = 0;
            renderFrame();
            if (!runtime.prefersReducedMotion) requestAnimationFrame(tick);
          } else {
            frames = [];
            asciiEl.textContent = 'Preload disabled.';
          }

          if (runtime.prefersReducedMotion) {
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
  };
})();
