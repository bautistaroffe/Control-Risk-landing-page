(function () {
  const heroMedia = document.querySelector("[data-hero-media]");
  if (!heroMedia) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallViewport = window.matchMedia("(max-width: 767px)").matches;

  if (prefersReducedMotion || isSmallViewport) {
    return;
  }

  function loadHeroMedia() {
    heroMedia.classList.add("is-ready");
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadHeroMedia, { timeout: 1200 });
    return;
  }

  window.setTimeout(loadHeroMedia, 300);
})();
