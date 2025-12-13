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
  this.earlyBurst       = 0;
  this.lastReaction     = null;
  this.introText        = (document.querySelector(".game-intro") && document.querySelector(".game-intro").textContent.trim()) || "Join the babies!";

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
        self.winCelebrate();
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
    4096: "Beezy"
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
    this.earlyBurst = Math.max(this.earlyBurst, 4); // ensure several early reactions
  }

  var self = this;
  function pickVariant(pool) {
    if (!pool || !pool.length) return null;
    var attempt = 0;
    while (attempt < 5) {
      var choice = pool[Math.floor(Math.random() * pool.length)];
      var sig = choice.face + "|" + choice.text;
      if (!self.lastReaction || self.lastReaction !== sig) {
        return choice;
      }
      attempt += 1;
    }
    return pool[0];
  }

  if (metadata.over) {
    var losePick = pickVariant([
      { face: "sad", text: "Trapped!" },
      { face: "tight", text: "Beezy is bummed." },
      { face: "cool", text: "Try again?" }
    ]);
    faceKey = losePick.face; text = losePick.text;
  } else if (metadata.won || maxTile >= 4096) {
    var winPick = pickVariant([
      { face: "star", text: "Legend Beezy!" },
      { face: "party", text: "Beezy is ecstatic!" },
      { face: "cool", text: "You nailed it!" }
    ]);
    faceKey = winPick.face; text = winPick.text;
  } else if (newMax && maxTile >= 1024) {
    var nm = pickVariant([
      { face: "star", text: "New level!" },
      { face: "cool", text: "Level up!" },
      { face: "party", text: "That popped!" }
    ]);
    faceKey = nm.face; text = nm.text;
  } else if (hugeMerge) {
    var hm = pickVariant([
      { face: "party", text: "Massive merge!" },
      { face: "star", text: "Beezy fireworks!" },
      { face: "cool", text: "Crushed it!" }
    ]);
    faceKey = hm.face; text = hm.text;
  } else if (comeback) {
    var cb = pickVariant([
      { face: "cool", text: "Clutched space!" },
      { face: "party", text: "Beezy loves comebacks!" },
      { face: "star", text: "From the brink!" }
    ]);
    faceKey = cb.face; text = cb.text;
  } else if (danger) {
    var dn = pickVariant([
      { face: "tight", text: "Tight corner!" },
      { face: "tight", text: "One move left?" },
      { face: "cool", text: "Find an opening!" }
    ]);
    faceKey = dn.face; text = dn.text;
  } else if (bigMerge) {
    var bm = pickVariant([
      { face: "party", text: "What a comeback!" },
      { face: "smile", text: "Beezy approves!" },
      { face: "cool", text: "Strong merge!" }
    ]);
    faceKey = bm.face; text = bm.text;
  } else if (maxTile >= 1024) {
    var orl = pickVariant([
      { face: "cool", text: "On a roll!" },
      { face: "smile", text: "Keep building!" },
      { face: "star", text: "Momentum!" }
    ]);
    faceKey = orl.face; text = orl.text;
  } else if (scoreDelta > 0) {
    // Early-game richer rotation
    var earlyPhrases = [
      { face: "smile", text: "Beezy likes that!" },
      { face: "cool", text: "Fresh start!" },
      { face: "star", text: "Bright spark!" },
      { face: "party", text: "Tiny celebration!" },
      { face: "tight", text: "Keep space open." },
      { face: "smile", text: "Off to a good start!" }
    ];
    var phrases = [
      { face: "smile", text: "Smooth slide!" },
      { face: "cool", text: "Keep that flow." },
      { face: "smile", text: "Clean merge!" },
      { face: "tight", text: "Watch your space." },
      { face: "party", text: "Little win!" },
      { face: "cool", text: "Still steady." },
      { face: "smile", text: "Beezy\u2019s amused." },
      { face: "tight", text: "Stay mindful." }
    ];
    var pool = (this.earlyBurst > 0 ? earlyPhrases : phrases);
    var chance = (this.earlyBurst > 0 ? 0.9 : 0.45);
    if (Math.random() < chance) {
      var pick = pickVariant(pool);
      faceKey = pick.face;
      text = pick.text;
      if (this.earlyBurst > 0) this.earlyBurst -= 1;
    } else {
      return; // keep current reaction to avoid spamming
    }
  } else if (!this.firstMergeDone) {
    // Before first merge, keep intro text and do not overwrite
    return;
  } else if (lowSpace) {
    var ls = pickVariant([
      { face: "tight", text: "Space is tight." },
      { face: "tight", text: "Careful now." },
      { face: "cool", text: "Think ahead." }
    ]);
    faceKey = ls.face; text = ls.text;
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
  this.lastReaction = faceKey + "|" + text;
};

HTMLActuator.prototype.setReactionFace = function (key) {
  if (!this.reactionFace) return;
  var map = {
    smile: "smile.png",
    cool: "cool.png",
    star: "star.png",
    sad: "sad.png",
    party: "party.png",
    tight: "tight.png"
  };
  var file = map[key] || map.smile;
  this.reactionFace.style.backgroundImage = 'url("images/' + file + '")';
  this.reactionFace.style.backgroundPosition = "center";
  this.reactionFace.style.backgroundSize = "contain";
};

HTMLActuator.prototype.winCelebrate = function () {
  if (!this.boardContainer) return;
  var self = this;
  this.boardContainer.classList.add("win-celebrate");
  this.spawnConfetti(4096);
  setTimeout(function () { self.spawnConfetti(4096); }, 200);

  // Force a celebratory reaction
  this.setReactionFace("party");
  if (this.reactionText) {
    this.reactionText.textContent = "Beezy is ecstatic!";
  }

  clearTimeout(this.winTimer);
  this.winTimer = setTimeout(function () {
    self.boardContainer.classList.remove("win-celebrate");
  }, 1600);
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
  this.mergeToast.text.textContent = "You got: " + label;

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
