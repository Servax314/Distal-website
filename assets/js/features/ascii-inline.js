(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});

  DistalApp.initAsciiInline = function initAsciiInline() {
    const runtime = DistalApp.runtime;
    if (!runtime) return;

    const inlineAsciiPres = document.querySelectorAll('.c-ascii-graph pre:not([data-ascii-src])');
    if (!inlineAsciiPres.length) return;

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
      runtime.addResizeFitter(() => fitInlineAscii(preEl));
    });
  };
})();
