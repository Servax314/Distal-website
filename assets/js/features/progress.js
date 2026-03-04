(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});

  DistalApp.initScrollProgress = function initScrollProgress() {
    const progress = document.getElementById('progress');
    if (!progress) return;

    function updateProgress() {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = height > 0 ? window.scrollY / height : 0;
      progress.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  };
})();
