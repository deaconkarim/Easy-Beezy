// Renders and shuffles the visible tile order list.
// Only changes which images are used for each numeric value; it does NOT alter game values.
function initTileOrder() {
  var baseOrder = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

  var listEl = document.getElementById("tile-order-list");
  var shuffleBtn = document.getElementById("tile-order-shuffle");
  var labelEl = document.getElementById("tile-order-label");
  var restoreBtn = document.getElementById("tile-order-restore");

  if (!listEl || !shuffleBtn || !labelEl || !restoreBtn) return;

  var defaultNames = {
    2: "Enmebaragesi",
    4: "Titan",
    8: "Sniper",
    16: "Cali",
    32: "Axel",
    64: "Diesel",
    128: "Jaxson",
    256: "Adrianna",
    512: "Ty",
    1024: "Joey",
    2048: "BG",
    4096: "Beezy"
  };

  function getTileName(imgValue, value) {
    var nameMap = window.tileNames || defaultNames;
    return nameMap[imgValue] || nameMap[value] || ("Tile " + value);
  }

  function applyImageMap(order) {
    // Map numeric value -> image value (order index maps to canonical base order)
    var map = {};
    var activeBase = window.tileOrderStart ? baseOrder.filter(function (v) { return v >= window.tileOrderStart; }) : baseOrder;
    activeBase.forEach(function (value, idx) {
      map[value] = order[idx];
    });
    window.tileImageMap = map;
  }

  function render(order) {
    // Keep numeric order fixed; only images swap; hide text label
    labelEl.textContent = "";

    applyImageMap(order);

    listEl.innerHTML = "";
    var activeBase = window.tileOrderStart ? baseOrder.filter(function (v) { return v >= window.tileOrderStart; }) : baseOrder;
    var activeOrder = window.tileOrderStart ? order.filter(function (v) { return v >= window.tileOrderStart; }) : order;

    activeBase.forEach(function (value, idx) {
      var imgValue = activeOrder[idx];
      var item = document.createElement("li");
      item.className = "tile-order-chip tile-color-" + value;

      var img = document.createElement("img");
      img.src = "images/tiles/" + imgValue + ".png";
      var name = getTileName(imgValue, value);
      img.alt = name;

      img.onerror = function () {
        img.remove();
      };

      item.appendChild(img);
      var label = document.createElement("span");
      label.className = "tile-order-name";
      label.textContent = name;
      item.appendChild(label);

      listEl.appendChild(item);
    });

    // Update currently rendered tiles to use the new mapping
    updateLiveTiles();
  }

  function updateLiveTiles() {
    var tiles = document.querySelectorAll(".tile");
    tiles.forEach(function (tileEl) {
      var value = null;
      tileEl.className.split(/\s+/).some(function (cls) {
        if (cls.indexOf("tile-") === 0 && cls.indexOf("tile-position-") !== 0) {
          var num = parseInt(cls.replace("tile-", ""), 10);
          if (!isNaN(num)) {
            value = num;
            return true;
          }
        }
        return false;
      });
      if (!value) return;

      var imgValue = (window.tileImageMap && window.tileImageMap[value]) || value;
      var name = getTileName(imgValue, value);
      var img = tileEl.querySelector(".tile-inner img");
      if (img) {
        img.src = "images/tiles/" + imgValue + ".png";
        img.alt = name;
      }
    });
  }

  function shuffledCopy(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  shuffleBtn.addEventListener("click", function () {
    var activeBase = window.tileOrderStart ? baseOrder.filter(function (v) { return v >= window.tileOrderStart; }) : baseOrder;
    render(shuffledCopy(activeBase));
  });

  restoreBtn.addEventListener("click", function () {
    var activeBase = window.tileOrderStart ? baseOrder.filter(function (v) { return v >= window.tileOrderStart; }) : baseOrder;
    render(activeBase);
  });

  // Initial render in sorted order
  var initialBase = window.tileOrderStart ? baseOrder.filter(function (v) { return v >= window.tileOrderStart; }) : baseOrder;
  render(initialBase);

  // Expose helpers for external mode selection
  window.setTileOrderClassic = function () {
    var activeBase = window.tileOrderStart ? baseOrder.filter(function (v) { return v >= window.tileOrderStart; }) : baseOrder;
    render(activeBase);
  };

  window.setTileOrderShuffle = function () {
    var activeBase = window.tileOrderStart ? baseOrder.filter(function (v) { return v >= window.tileOrderStart; }) : baseOrder;
    render(shuffledCopy(activeBase));
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTileOrder);
} else {
  initTileOrder();
}

