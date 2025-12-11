// Lightweight how-to overlay. Persists dismissal in localStorage.
(function () {
  var overlay = document.querySelector(".howto-overlay");
  if (!overlay) return;

  var startBtn = document.getElementById("howto-start");
  var skipBtn = document.getElementById("howto-skip");
  var triggers = document.querySelectorAll("[data-open-howto]");
  var STORAGE_KEY = "beezy_howto_dismissed";

  function hide() {
    overlay.classList.add("hidden");
    document.body.classList.remove("howto-open");
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
  }

  function show() {
    overlay.classList.remove("hidden");
    document.body.classList.add("howto-open");
  }

  if (startBtn) startBtn.addEventListener("click", hide);
  if (skipBtn) skipBtn.addEventListener("click", hide);

  Array.prototype.forEach.call(triggers, function (button) {
    button.addEventListener("click", function () {
      show();
    });
  });

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      hide();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      hide();
    }
  });

  var alreadyDismissed = false;
  try {
    alreadyDismissed = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {}

  if (!alreadyDismissed) {
    show();
  }
})();

