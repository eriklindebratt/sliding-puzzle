var SlidingPuzzle = function(options) {
  console.log(options);
  var _this = this;

  this.settings = {
    containerElSelector: ".js-puzzle",
    partCounts: {
      columns: 3,
      rows: 3
    },
    randomImageAPIURI: "http://api.giphy.com/v1/gifs/translate?api_key=dc6zaTOxFJmzC&s=falling"
  };

  /**
   * Optional extension of settings
   */
  if (options && "settings" in options && typeof(options.settings) === "object") {
    for (var propName in options.settings) {
      if (!options.settings.hasOwnProperty(propName))
        continue;

      this.settings[propName] = options.settings[propName];
    }
  }

  this.initialize();
};

SlidingPuzzle.prototype.initialize = function() {
  this.containerEl = document.querySelector(this.settings.containerElSelector);
  if (!this.containerEl)
    throw Error("Couldn't find container element based on CSS selector `"+this.settings.containerElSelector+"`");

  this.isReady = false;
  this.pieceEls = [];
  this.correctPiecePositions = [];  // should hold the piece positions for the correct solution
  this.currentPiecePositions = [];  // should hold the current piece positions
  this.missingPartPosition = {
    x: null,
    y: null
  };

  this.containerEl.innerHTML = "";

  this.loadRandomImage();
};

SlidingPuzzle.prototype.loadRandomImage = function() {
  var _this = this;

  var xhr = new XMLHttpRequest();
  xhr.addEventListener("load", function() {
    var
      responseData = JSON.parse(xhr.response),
      getImageURI = function() {
        return responseData.data.images.original.url;
      };
    console.log("load - responseData - ", responseData);

    var imageURI = getImageURI();
    if (!imageURI)
      throw Error("Couldn't find image URI in API response");

    _this.image = new Image();
    _this.image.addEventListener("load", function() {
      _this.onImageLoaded.call(_this);
    });
    _this.image.src = imageURI;
  });
  xhr.addEventListener("error", function() {
    throw Error("Error while loading random image from API");
  });
  xhr.open("GET", _this.settings.randomImageAPIURI, true);
  xhr.send();
};

SlidingPuzzle.prototype.onImageLoaded = function() {
  var _this = this;

  _this.settings.canvasImageSizeDiff = _this.containerEl.clientWidth / _this.image.width;  // used to scale the image to fit the size of the canvas

  //_this.containerEl.width = _this.image.width;
  //_this.containerEl.height = _this.image.height;
  _this.containerEl.style.width = _this.image.width+"px";
  _this.containerEl.style.height = _this.image.height+"px";

  _this.settings.partSize = {
    width: Math.floor(_this.containerEl.clientWidth / _this.settings.partCounts.columns),
    height: Math.floor(_this.containerEl.clientHeight / _this.settings.partCounts.rows)
  };
  _this.missingPartPosition = {
    x: Math.max(0, Math.round(Math.random() * _this.settings.partCounts.columns-1)),
    y: Math.max(0, Math.round(Math.random() * _this.settings.partCounts.rows-1))
  };

  _this.render.call(_this);

  _this.containerEl.addEventListener("click", function() {
    _this.onContainerClick.apply(_this, arguments);
  });
};

SlidingPuzzle.prototype.onContainerClick = function(e) {
  if (e.target.classList.contains("js-puzzle-piece")) {
    return this.onPieceClick(e.target);
  }
};

/**
 * @param DOMElement pieceEl
 */
SlidingPuzzle.prototype.onPieceClick = function(pieceEl) {
  /**
   * Only allow moving pieces if they're in the same column and row
   * and if they lie right next to the "missing piece" space
   */
  if (!((this.missingPartPosition.x === ~~pieceEl.dataset.columnIndex
         && Math.abs(this.missingPartPosition.y - ~~pieceEl.dataset.rowIndex) <= 1)
       || (this.missingPartPosition.y === ~~pieceEl.dataset.rowIndex
         && Math.abs(this.missingPartPosition.x - ~~pieceEl.dataset.columnIndex) <= 1))) {

      return;
  }

  this.setPiecePosition(
    pieceEl,
    this.missingPartPosition.x,
    this.missingPartPosition.y
  );
};

SlidingPuzzle.prototype.onPieceMove = function() {
  var _this = this;

  if (_this.isReady && _this.validate()) {
    setTimeout(function() {
      //alert("Great success!");
      _this.containerEl.innerHTML = "";
      _this.containerEl.appendChild(_this.image);
    }, 200);
  }
};

SlidingPuzzle.prototype.getPiecePosition = function(pieceEl) {
  return {
    x: ~~pieceEl.dataset.columnIndex,
    y: ~~pieceEl.dataset.rowIndex
  };
};

SlidingPuzzle.prototype.setPiecePosition = function(pieceEl, columnIndex, rowIndex) {
  var
    currentPiecePosition = this.getPiecePosition(pieceEl),
    newPiecePosition = {
      x: ~~columnIndex,
      y: ~~rowIndex
    };

  this.missingPartPosition = currentPiecePosition;

  // update list of current positions with the new one
  for (var i = 0; i < this.currentPiecePositions.length; i++) {
    if (JSON.stringify(this.currentPiecePositions[i]) === JSON.stringify(currentPiecePosition))
      this.currentPiecePositions[i] = newPiecePosition;
  }

  pieceEl.dataset.columnIndex = newPiecePosition.x;
  pieceEl.dataset.rowIndex = newPiecePosition.y;
  pieceEl.style.left = this.settings.partSize.width*newPiecePosition.x+"px";
  pieceEl.style.top = this.settings.partSize.height*newPiecePosition.y+"px";

  this.onPieceMove();
};

SlidingPuzzle.prototype.render = function() {
  // only allow rendering once we know which part is "the missing one"
  if (this.missingPartPosition.x == null || this.missingPartPosition.y == null)
    return;

  // draw each part
  for (var y = 0; y < this.settings.partCounts.rows; y++) {  // vertically
    for (var x = 0; x < this.settings.partCounts.columns; x++) {  // horizontally
      var
        imageClipPosition = {
          x: this.settings.partSize.width*x / this.settings.canvasImageSizeDiff,
          y: this.settings.partSize.height*y / this.settings.canvasImageSizeDiff
        },
        imagePartSize = {
          width: this.settings.partSize.width / this.settings.canvasImageSizeDiff,
          height: this.settings.partSize.height / this.settings.canvasImageSizeDiff
        },
        positionInCanvas = {
          x: x,
          y: y
        };

      // we've reached the position for the "missing part" - don't place a piece here
      if (x === this.missingPartPosition.x && y === this.missingPartPosition.y) {
        continue;
      }

      this.correctPiecePositions.push(positionInCanvas);
      this.currentPiecePositions.push(positionInCanvas);

      /**
       * Construct canvas element for piece
       */
      var
        pieceCanvasEl = document.createElement("canvas"),
        pieceCanvasContext = pieceCanvasEl.getContext("2d");

      pieceCanvasEl.className = "js-puzzle-piece puzzle-piece";
      pieceCanvasEl.dataset.columnIndex = positionInCanvas.x;
      pieceCanvasEl.dataset.rowIndex = positionInCanvas.y;
      pieceCanvasEl.width = this.settings.partSize.width;
      pieceCanvasEl.height = this.settings.partSize.height;
      pieceCanvasEl.style.left = positionInCanvas.x*this.settings.partSize.width+"px";
      pieceCanvasEl.style.top = positionInCanvas.y*this.settings.partSize.height+"px";

      this.containerEl.appendChild(pieceCanvasEl);
      this.pieceEls.push(pieceCanvasEl);

      /**
       * Draw canvas
       */
      pieceCanvasContext.drawImage(
        this.image,
        imageClipPosition.x,   // start X position to clip from, in the whole image
        imageClipPosition.y,   // start Y position to clip from, in the whole image
        imagePartSize.width,   // width of the clipped part from the whole image
        imagePartSize.height,  // width of the clipped part from the whole image
        0,                     // position in the canvas on which the part should be placed
        0,                     // position in the canvas on which the part should be placed
        this.settings.partSize.width,
        this.settings.partSize.height
      );
    }
  }

  var _this = this;
  setTimeout(function() {
    _this.onRenderComplete();
  }, 50);
};

SlidingPuzzle.prototype.onRenderComplete = function() {
  var _this = this;
  setTimeout(function() {
    _this.shuffle();
    _this.containerEl.classList.add("ready");
    _this.isReady = true;
  }, 2000);
};

SlidingPuzzle.prototype.shuffle = function() {
  for (var i = 0; i < 3; i++) {
    this.pieceEls.forEach(function(pieceEl) {
      pieceEl.click();
    });
  }
};

SlidingPuzzle.prototype.validate = function() {
  return JSON.stringify(this.currentPiecePositions) === JSON.stringify(this.correctPiecePositions);
};

