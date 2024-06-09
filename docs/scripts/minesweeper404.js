/**
 * Minesweeper 404 Game by Kirill Mamaev - kirill@mamaev.net
 */

/**
 * Initialise the game on page load.
 */
if (document.readyState === 'complete') {
  initialise();
} else {
  window.addEventListener('load', initialise);
}

/**
 * Initialise the game.
 */
function initialise() {
  new Minesweeper404();
}

/**
 * Minesweeper 404 game.
 */
class Minesweeper404 {
  constructor() {
    this.resetPageStyles();

    const [canvasElement, canvasContext] = this.createCanvasElement(
      'Your browser does not support the HTML5 canvas element.',
    );

    this.addResizeEventListeners(canvasElement, () => {
      this.draw(canvasElement, canvasContext);
    });

    this.draw404(canvasElement, canvasContext);
  }

  /**
   * Draw 404 message on canvas.
   * @param {HTMLCanvasElement} canvasElement Canvas element.
   * @param {CanvasRenderingContext2D} canvasContext Canvas context.
   */
  draw404(canvasElement, canvasContext) {
    canvasContext.font = '8rem Arial';
    canvasContext.fillStyle = 'white';
    canvasContext.textAlign = 'center';
    canvasContext.textBaseline = 'middle';
    canvasContext.fillText('404', canvasElement.width / 2, canvasElement.height / 2);
  }

  /**
   * Reset page styles.
   */
  resetPageStyles() {
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    document.body.style.overflow = 'hidden';
    document.body.style.display = 'block';
    document.body.style.backgroundColor = 'black';
  }

  /**
   * Create canvas element.
   * @returns {Array} Canvas element and its context.
   * @returns {HTMLCanvasElement} Canvas element.
   * @returns {CanvasRenderingContext2D} Canvas context.
   */
  createCanvasElement(canvasBackupText, containerElement = document.body, renderer = window) {
    const canvasBackupTextElement = document.createTextNode(canvasBackupText);
    const canvasElement = document.createElement('canvas');
    canvasElement.style.display = 'block';
    canvasElement.style.zIndex = 1;
    containerElement.appendChild(canvasElement);
    canvasElement.appendChild(canvasBackupTextElement);
    canvasElement.width = renderer.innerWidth;
    canvasElement.height = renderer.innerHeight;
    const canvasContext = canvasElement.getContext('2d');
    return [canvasElement, canvasContext];
  }

  /**
   * Add resize event listener.
   * @param {HTMLCanvasElement} canvasElement Canvas element.
   * @param {Window} renderer Renderer.
   */
  addResizeEventListeners(canvasElement, fnRefreshCanvas, renderer = window) {
    renderer.addEventListener(
      'resize',
      () => {
        canvasElement.width = renderer.innerWidth;
        canvasElement.height = renderer.innerHeight;
        fnRefreshCanvas();
      },
      false,
    );
  }
}
