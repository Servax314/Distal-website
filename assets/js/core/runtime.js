(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});
  if (DistalApp.runtime) return;

  const prefersReducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;

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

  function addResizeFitter(fn) {
    if (typeof fn !== 'function') return;
    resizeFitters.add(fn);
  }

  function addResizeSettleFitter(fn) {
    if (typeof fn !== 'function') return;
    resizeSettleFitters.add(fn);
  }

  window.addEventListener('resize', handleWindowResize, { passive: true });

  DistalApp.runtime = {
    prefersReducedMotion,
    addResizeFitter,
    addResizeSettleFitter,
    requestFitterPass,
    runFitters,
    runSettleFitters,
    getCharWidthRatio,
  };
})();
