// Registers the service worker and shows an install prompt for mobile users.
(function () {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(function (err) {
      console.warn("SW registration failed:", err);
    });
  }

  var deferredPrompt;
  var banner = null;
  var installBtn = null;
  var closeBtn = null;

  function createBanner() {
    if (banner) return;

    banner = document.createElement("div");
    banner.className = "install-banner";
    banner.innerHTML = `
      <div class="install-banner__content">
        <div class="install-banner__text">
          <strong>Add Beezy's Babies?</strong>
          <span>Install the app for quicker access and offline play.</span>
        </div>
        <div class="install-banner__actions">
          <button class="install-banner__button install-banner__button--primary">Install</button>
          <button class="install-banner__button install-banner__button--ghost">Not now</button>
        </div>
      </div>
    `;

    installBtn = banner.querySelector(".install-banner__button--primary");
    closeBtn = banner.querySelector(".install-banner__button--ghost");

    document.body.appendChild(banner);

    installBtn.addEventListener("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        hideBanner();
      });
    });

    closeBtn.addEventListener("click", hideBanner);
  }

  function hideBanner() {
    if (banner) {
      banner.remove();
      banner = null;
    }
    deferredPrompt = null;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    // Only show on touch devices as a light heuristic for mobile
    var isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      createBanner();
    }
  });

  window.addEventListener("appinstalled", hideBanner);
})();

