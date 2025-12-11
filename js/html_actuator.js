function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.mergeToast       = this.ensureMergeToast();
  this.seenMergeValues  = this.loadSeenMergeValues();
  this.progressFill     = document.querySelector(".progress-fill");
  this.progressValue    = document.querySelector(".progress-value");
  this.progressGoal     = window.progressGoal || 4096;
  this.boardContainer   = document.querySelector(".game-container");
  this.reactionEl       = document.querySelector(".beezy-reaction");
  this.reactionFace     = document.querySelector(".beezy-reaction-face");
  this.reactionText     = document.querySelector(".beezy-reaction-text");
  this.lastEmptyCells   = null;
  this.lastMaxTile      = 0;
  this.firstMergeDone   = false;
  this.introText        = (document.querySelector(".game-intro") && document.querySelector(".game-intro").textContent.trim()) || "Join the babies to make Beezy Happy!";

  // Set initial face/text
  if (this.reactionFace) this.setReactionFace("smile");
  if (this.reactionText) this.reactionText.textContent = this.introText;

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

    var prevScore = self.score;
    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);
    var scoreDelta = metadata.score - prevScore;
    var maxTile = self.getMaxTile(grid);
    var emptyCells = self.getEmptyCells(grid);
    self.updateProgress(maxTile);
    self.updateReaction(maxTile, emptyCells, scoreDelta, metadata);

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
    this.triggerDelight();
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.getMaxTile = function (grid) {
  var max = 0;
  grid.cells.forEach(function (column) {
    column.forEach(function (cell) {
      if (cell && cell.value > max) max = cell.value;
    });
  });
  return max;
};

HTMLActuator.prototype.updateProgress = function (maxTile) {
  if (!this.progressFill || !this.progressValue) return;
  var goal = this.progressGoal || 4096;
  var pct = 0;
  if (maxTile >= 2) {
    var steps = Math.log2(goal) - 1;
    pct = Math.min(1, Math.max(0, (Math.log2(maxTile) - 1) / steps));
  }
  this.progressFill.style.width = Math.round(pct * 100) + "%";
  // Map tile to display name using current image mapping
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
  var imgKey = (window.tileImageMap && window.tileImageMap[maxTile]) || maxTile;
  var nameMap = window.tileNames || defaultNames;
  var label = nameMap[imgKey] || nameMap[maxTile] || ("Tile " + maxTile);
  this.progressValue.textContent = "Top Level: " + label;
};

HTMLActuator.prototype.getEmptyCells = function (grid) {
  var count = 0;
  grid.cells.forEach(function (column) {
    column.forEach(function (cell) {
      if (!cell) count += 1;
    });
  });
  return count;
};

HTMLActuator.prototype.updateReaction = function (maxTile, emptyCells, scoreDelta, metadata) {
  if (!this.reactionEl) return;
  var text = null;
  var faceKey = null;
  var lastEmpty = this.lastEmptyCells;
  var lastMax = this.lastMaxTile || 0;
  var newMax = maxTile > lastMax;

  var hugeMerge = scoreDelta >= 512;
  var bigMerge = scoreDelta >= 256;
  var comeback = (lastEmpty !== null && lastEmpty <= 1 && emptyCells >= 4 && scoreDelta > 0);
  var danger = emptyCells <= 1;
  var lowSpace = emptyCells <= 2;

  // Mark first merge
  if (scoreDelta > 0) {
    this.firstMergeDone = true;
  }

  if (metadata.over) {
    faceKey = "sad";
    text = "Trapped!";
  } else if (metadata.won || maxTile >= 4096) {
    faceKey = "star";
    text = "Legend Beezy!";
  } else if (newMax && maxTile >= 1024) {
    faceKey = "star";
    text = "New level!";
  } else if (hugeMerge) {
    faceKey = "party";
    text = "Massive merge!";
  } else if (comeback) {
    faceKey = "cool";
    text = "Clutched space!";
  } else if (emptyCells <= 1) {
    faceKey = "tight";
    text = "Tight corner!";
  } else if (bigMerge) {
    faceKey = "party";
    text = "What a comeback!";
  } else if (maxTile >= 1024) {
    faceKey = "cool";
    text = "On a roll!";
  } else if (scoreDelta > 0) {
    var phrases = [
      { face: "smile", text: "Smooth slide!" },
      { face: "cool", text: "Keep that flow." },
      { face: "smile", text: "Clean merge!" },
      { face: "tight", text: "Watch your space." },
      { face: "party", text: "Little win!" }
    ];
    if (Math.random() < 0.35) {
      var pick = phrases[Math.floor(Math.random() * phrases.length)];
      faceKey = pick.face;
      text = pick.text;
    } else {
      return; // keep current reaction to avoid spamming
    }
  } else if (!this.firstMergeDone) {
    // Before first merge, keep intro text and do not overwrite
    return;
  } else if (lowSpace) {
    faceKey = "tight";
    text = "Space is tight.";
  }

  if (text === null || faceKey === null) {
    this.lastEmptyCells = emptyCells;
    this.lastMaxTile = maxTile;
    return;
  }

  this.setReactionFace(faceKey);
  if (this.reactionText) {
    this.reactionText.textContent = text;
  }

  this.lastEmptyCells = emptyCells;
  this.lastMaxTile = maxTile;
};

HTMLActuator.prototype.setReactionFace = function (key) {
  if (!this.reactionFace) return;
  var positions = {
    smile: "0% 0%",
    cool: "50% 0%",
    star: "100% 0%",
    sad: "0% 100%",
    party: "50% 100%",
    tight: "100% 100%"
  };
  var pos = positions[key] || positions.smile;
  this.reactionFace.style.backgroundPosition = pos;
};

HTMLActuator.prototype.triggerDelight = function () {
  if (!this.boardContainer) return;
  this.boardContainer.classList.add("delight");
  clearTimeout(this.delightTimer);
  var self = this;
  this.delightTimer = setTimeout(function () {
    self.boardContainer.classList.remove("delight");
  }, 600);
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
  // Reset first-merge state so intro message can appear next game
  this.firstMergeDone = false;
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
