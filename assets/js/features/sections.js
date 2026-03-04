(() => {
  const DistalApp = (window.DistalApp = window.DistalApp || {});

  DistalApp.initSections = function initSections() {
    document
      .querySelectorAll('.section')
      .forEach((sectionEl) => sectionEl.classList.add('is-visible'));
  };
})();
