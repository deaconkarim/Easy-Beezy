// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  window.gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);

  // Mode chooser helpers
  var modeOverlay = document.querySelector(".mode-overlay");
  var btnClassic = document.getElementById("mode-classic");
  var btnShuffle = document.getElementById("mode-shuffle");

  function hideMode() {
    if (!modeOverlay) return;
    modeOverlay.classList.add("hidden");
    modeOverlay.classList.remove("visible");
  }

  window.showModeOverlay = function (onChoose) {
    if (!modeOverlay || !btnClassic || !btnShuffle) {
      if (typeof onChoose === "function") onChoose();
      return;
    }
    modeOverlay.classList.remove("hidden");
    modeOverlay.classList.add("visible");

    function handle(choice) {
      if (choice === "classic" && window.setTileOrderClassic) window.setTileOrderClassic();
      if (choice === "shuffle" && window.setTileOrderShuffle) window.setTileOrderShuffle();
      hideMode();
      if (typeof onChoose === "function") onChoose();
      // cleanup listeners
      btnClassic.removeEventListener("click", onClassic);
      btnShuffle.removeEventListener("click", onShuffle);
    }

    function onClassic() { handle("classic"); }
    function onShuffle() { handle("shuffle"); }

    btnClassic.addEventListener("click", onClassic);
    btnShuffle.addEventListener("click", onShuffle);
  };

  // Allow keyboard/restart hooks to request mode before restart
  window.requestModeRestart = function () {
    window.showModeOverlay(function () {
      if (window.gameManager && typeof window.gameManager.restart === "function") {
        window.gameManager.restart();
      }
    });
  };

  // Show mode chooser on first load (no restart)
  window.showModeOverlay();
});
