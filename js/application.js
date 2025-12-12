// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  function runIntro(onDone) {
    var overlay = document.querySelector(".intro-overlay");
    if (!overlay) { if (typeof onDone === "function") onDone(); return; }

    function setFaceAndQuote(item) {
      var face = overlay.querySelector(".intro-face");
      var quote = overlay.querySelector(".intro-quote");
      if (face) face.style.backgroundImage = 'url("images/' + item.file + '")';
      if (quote) quote.textContent = item.text;
    }

    var items = [
      { file: "smile.png", text: "Let's go" },
      { file: "cool.png", text: "Fresh start!" },
      { file: "party.png", text: "Tiny celebration!" },
      { file: "star.png", text: "New level!" },
      { file: "tight.png", text: "Keep space open." },
      { file: "sad.png", text: "Tight corner!" },
      { file: "cool.png", text: "You nailed it!" },
      { file: "smile.png", text: "Beezy approves!" }
    ];

    var idx = 0;
    setFaceAndQuote(items[idx]);

    overlay.classList.remove("hidden");
    overlay.classList.add("visible");

    var done = false;
    var intervalId = setInterval(function () {
      idx = (idx + 1) % items.length;
      setFaceAndQuote(items[idx]);
    }, 650);

    function finish() {
      if (done) return;
      done = true;
      clearInterval(intervalId);

      overlay.classList.remove("visible");
      overlay.classList.add("hidden");

      // remove listeners
      window.removeEventListener("keydown", onKey);
      overlay.removeEventListener("click", finish);
      overlay.removeEventListener("touchstart", finish);

      // Wait for fade-out to begin, then continue.
      setTimeout(function () {
        if (typeof onDone === "function") onDone();
      }, 230);
    }

    function onKey(e) {
      // ignore modifier-only keys
      if (!e) return finish();
      if (e.key === "Shift" || e.key === "Alt" || e.key === "Control" || e.key === "Meta") return;
      finish();
    }

    overlay.addEventListener("click", finish);
    overlay.addEventListener("touchstart", finish, { passive: true });
    window.addEventListener("keydown", onKey);

    // Auto-dismiss shortly after first paint
    setTimeout(finish, 2600);
  }

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

    // Clear current board visuals immediately
    if (window.gameManager && window.gameManager.actuator) {
      var act = window.gameManager.actuator;
      if (act.clearContainer && act.tileContainer) {
        act.clearContainer(act.tileContainer);
      }
      if (act.clearMessage) act.clearMessage();
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

  // Show intro first, then mode chooser (no restart)
  runIntro(function () {
    window.showModeOverlay();
  });
});
