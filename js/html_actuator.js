function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.mergeToast       = this.ensureMergeToast();
  this.seenMergeValues  = this.loadSeenMergeValues();

  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  // Super tiles (above Beezy's Babies)
  if (tile.value > 4096) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  
  // Use image instead of text
  var img = document.createElement("img");
  // Allow remapping of images without changing numeric value
  var imgValue = (window.tileImageMap && window.tileImageMap[tile.value]) || tile.value;
  img.src = "images/tiles/" + imgValue + ".png";
  img.alt = tile.value;
  img.classList.add("tile-image");
  
  // Fallback to text if image fails to load
  img.onerror = function() {
    inner.textContent = tile.value;
    if (inner.contains(img)) {
      inner.removeChild(img);
    }
  };
  
  inner.appendChild(img);

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });

    // Show celebration for the resulting merged tile (first time per value)
    this.showMergeToast(tile.value, imgValue);
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.loadSeenMergeValues = function () {
  // Session-only tracking so mobile users see alerts every session
  return new Set();
};

HTMLActuator.prototype.saveSeenMergeValues = function () {
  // no-op (session only)
};

HTMLActuator.prototype.resetMergeSeenTiles = function () {
  this.seenMergeValues = new Set();
};

HTMLActuator.prototype.ensureMergeToast = function () {
  var existing = document.querySelector(".merge-toast");
  if (existing) return {
    root: existing,
    card: existing.querySelector(".merge-toast__card"),
    img: existing.querySelector(".merge-toast__img"),
    text: existing.querySelector(".merge-toast__text")
  };

  var root = document.createElement("div");
  root.className = "merge-toast hidden";

  var card = document.createElement("div");
  card.className = "merge-toast__card";

  var img = document.createElement("img");
  img.className = "merge-toast__img";
  img.alt = "";

  var text = document.createElement("div");
  text.className = "merge-toast__text";

  card.appendChild(img);
  card.appendChild(text);
  root.appendChild(card);
  document.body.appendChild(root);

  return { root: root, card: card, img: img, text: text };
};

HTMLActuator.prototype.showMergeToast = function (value, imgValue) {
  if (!this.mergeToast) return;

  // Only show once per tile value
  if (this.seenMergeValues.has(value)) return;
  this.seenMergeValues.add(value);
  this.saveSeenMergeValues();

  // Name tiles by the image key first (so shuffles / remaps still show the right name)
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
    4096: "Beezy's Babies"
  };

  var nameMap = (window.tileNames) || defaultNames;
  var nameKey = imgValue; // prioritize the image mapping key
  var label = nameMap[nameKey] || nameMap[value] || ("Tile " + value);

  this.mergeToast.img.src = "images/tiles/" + imgValue + ".png";
  this.mergeToast.img.alt = label;
  this.mergeToast.text.textContent = "You created: " + label;

  this.mergeToast.root.classList.remove("hidden");
  this.mergeToast.root.classList.add("visible");

  clearTimeout(this.mergeToast.hideTimer);
  var self = this;
  this.mergeToast.hideTimer = setTimeout(function () {
    self.mergeToast.root.classList.remove("visible");
    self.mergeToast.root.classList.add("hidden");
  }, 1500);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
