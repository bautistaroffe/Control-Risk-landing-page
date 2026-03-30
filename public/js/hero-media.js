(function () {
  var video = document.querySelector("[data-hero-video]");
  if (!video) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.pause();
    video.removeAttribute("autoplay");
  }
})();
