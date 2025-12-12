// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  // Default mode state
  window.startTileValue = null;
  window.tileOrderStart = null;
  window.gameManager = null;

  // Mode chooser helpers
  var modeOverlay = document.querySelector(".mode-overlay");
  var btnClassic = document.getElementById("mode-classic"); // now start-at-32 mode
  var btnShuffle = document.getElementById("mode-shuffle");
  var btnAll = document.getElementById("mode-all"); // old classic

  function hideMode() {
    if (!modeOverlay) return;
    modeOverlay.classList.add("hidden");
    modeOverlay.classList.remove("visible");
  }

  window.showModeOverlay = function (onChoose) {
    if (!modeOverlay || !btnClassic || !btnShuffle || !btnAll) {
      if (typeof onChoose === "function") onChoose();
      return;
    }
    modeOverlay.classList.remove("hidden");
    modeOverlay.classList.add("visible");

    function handle(choice) {
      if (choice === "classic") {
        window.startTileValue = 32;
        window.tileOrderStart = 32;
        if (window.setTileOrderClassic) window.setTileOrderClassic();
      }
      if (choice === "shuffle") {
        window.startTileValue = null;
        window.tileOrderStart = null;
        if (window.setTileOrderShuffle) window.setTileOrderShuffle();
      }
      if (choice === "all") {
        window.startTileValue = null;
        window.tileOrderStart = null;
        if (window.setTileOrderClassic) window.setTileOrderClassic();
      }
      hideMode();
      if (!window.gameManager) {
        window.gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
      } else {
        window.gameManager.restart();
      }
      if (typeof onChoose === "function") onChoose();
      // cleanup listeners
      btnClassic.removeEventListener("click", onClassic);
      btnShuffle.removeEventListener("click", onShuffle);
      btnAll.removeEventListener("click", onAll);
    }

    function onClassic() { handle("classic"); }
    function onShuffle() { handle("shuffle"); }
    function onAll() { handle("all"); }

    btnClassic.addEventListener("click", onClassic);
    btnShuffle.addEventListener("click", onShuffle);
    btnAll.addEventListener("click", onAll);
  };

  // Allow keyboard/restart hooks to request mode before restart
  window.requestModeRestart = function () {
    window.showModeOverlay();
  };

  // Show mode chooser on first load (no restart)
  window.showModeOverlay();
});
