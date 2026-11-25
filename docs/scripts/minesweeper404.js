/**
 * Minesweeper 404 Game by Kirill Mamaev - kirill@mamaev.net
 *
 * A fun Minesweeper variant that displays a 404 error pattern
 * This script handles the game logic, rendering, and interactions.
 *
 * License: MIT
 */

class Minesweeper404 {
  // Text constants
  #TEXT = {
    EN: {
      BUTTON: {
        PLAY_AGAIN: 'Play Again',
        RESTART: 'Restart',
      },
      MESSAGE: {
        CONGRATULATIONS: 'Congratulations! 🎉<br><br>The page is not found,<br>but the winner is! 😉',
        GAME_OVER: 'Game Over! 💥<br><br>The page is not found,<br>but the mine is! 😉',
      },
      HUD_ELEMENT: {
        MINES: 'Mines',
        FLAGS: 'Flags',
        TIME: 'Time',
        SECONDS: 's',
      },
      A11Y: {
        BOARD: 'Minesweeper board. Use the arrow keys to move, Enter or Space to open, and F to flag.',
        ROW: 'Row',
        COLUMN: 'column',
        HIDDEN: 'hidden',
        FLAGGED: 'flagged',
        EMPTY: 'empty',
        MINE: 'mine',
        PERMANENT: '404 tile',
      },
    },
  };

  // Numbers rendering colors map
  #NUMBER_COLORS = ['', '#4fc3f7', '#81c784', '#ffb74d', '#9d60deff', '#ef5350', '#26c6da', '#ffffff', '#f472e7ff'];

  // Direction vectors for adjacent cells
  #DIRECTIONS = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    // Intentionally skip [0, 0] to avoid self-reference.
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  // 404 Pattern digits
  #PATTERN_DIGITS = {
    4: ['X.X', 'X.X', 'XXX', '..X', '..X'],
    0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  };

  // Board layouts, picked from the viewport size and orientation.
  // Every layout must be at least 11 columns wide to fit the 404 pattern.
  #LAYOUTS = {
    LARGE_LANDSCAPE: { ROWS: 15, COLS: 25, MINES: 25, MARGIN: 60 },
    LARGE_PORTRAIT: { ROWS: 25, COLS: 15, MINES: 25, MARGIN: 60 },
    SMALL_LANDSCAPE: { ROWS: 9, COLS: 15, MINES: 10, MARGIN: 20 },
    SMALL_PORTRAIT: { ROWS: 16, COLS: 13, MINES: 14, MARGIN: 16 },
  };

  #SMALL_VIEWPORT = 600; // px, shorter side of the viewport
  #UNIT = 32; // Tile size in SVG units. The viewBox scales it to the screen.
  #MIN_TILE = 18; // px
  #BORDER = 2; // px, board border width
  #LONG_PRESS_MS = 500;
  #FLOOD_STEP_MS = 12;
  #SVG_NS = 'http://www.w3.org/2000/svg';

  #config;
  #state;
  #container;
  #hud;
  #hudElements;
  #svg;
  #board;
  #cursorRect;
  #liveRegion;
  #overlay = null;
  #cellGroups = [];
  #cursor = { r: 0, c: 0 };
  #press = null;
  #lastPointerType = 'mouse';
  #lastPointerButton = 0;
  #timerInterval = null;
  #resizeFrame = null;
  #pendingTimeouts = new Set();

  // Initialise on load
  static initialise() {
    new Minesweeper404();
  }

  constructor() {
    this.#resetPageStyles();
    this.#injectStyles();
    this.#buildShell();
    this.#bindEvents();
    this.#newGame();
  }

  #injectStyles() {
    if (document.getElementById('ms404-anim-styles')) return;
    const style = document.createElement('style');
    style.id = 'ms404-anim-styles';
    style.textContent = `
      @keyframes ms404-pop {0%{transform:scale(.4);opacity:0}60%{transform:scale(1.05);opacity:1}100%{transform:scale(1);opacity:1}}
      @keyframes ms404-flag {0%{transform:translateY(-6px);opacity:0}60%{transform:translateY(2px);opacity:1}100%{transform:translateY(0);opacity:1}}
      @keyframes ms404-explode {0%{transform:scale(.4) rotate(-30deg);opacity:0}70%{transform:scale(1.1) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0)} }
      @keyframes ms404-glow {0%{filter:drop-shadow(0 0 0 rgba(255,0,0,0))}50%{filter:drop-shadow(0 0 8px rgba(255,80,80,.6))}100%{filter:drop-shadow(0 0 0 rgba(255,0,0,0))}}
      @keyframes ms404-fade-in {from{opacity:0}to{opacity:1}}
      #ms404-container {-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
      #ms404-container button:hover {background:#3c3c3c}
      #ms404-container button:active {transform:translateY(1px)}
      #ms404-container button:focus-visible {outline:2px solid #4fc3f7;outline-offset:2px}
      #ms404-container .cell-anim-open {animation:ms404-pop .18s cubic-bezier(.34,1.56,.64,1)}
      #ms404-container .cell-anim-flag {animation:ms404-flag .25s ease-out}
      #ms404-container .cell-anim-explode {animation:ms404-explode .35s cubic-bezier(.19,1,.22,1)}
      #ms404-container .pulse-glow {animation:ms404-glow 1.8s ease-in-out infinite}
      #ms404-container .overlay-fade {animation:ms404-fade-in .3s ease}
      #ms404-container svg {touch-action:none;outline:none}
      #ms404-container svg.ms404-ended g {cursor:default !important}
      #ms404-container svg:not(.ms404-keyboard) .ms404-cursor,
      #ms404-container svg:not(:focus) .ms404-cursor {display:none}
      .ms404-sr-only {position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    `;
    document.head.appendChild(style);
  }

  #resetPageStyles() {
    Object.assign(document.body.style, {
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#0f0f0fff',
      fontFamily: 'Arial, sans-serif',
      color: '#fff',
      userSelect: 'none',
    });
  }

  // Page structure, built once
  #buildShell() {
    const text = this.#TEXT.EN;

    this.#container = document.createElement('div');
    this.#container.id = 'ms404-container';
    Object.assign(this.#container.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
    });
    document.body.appendChild(this.#container);

    // Heads-Up Display (fixed top center)
    this.#hud = document.createElement('div');
    Object.assign(this.#hud.style, {
      position: 'fixed',
      top: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '18px',
      alignItems: 'center',
      background: 'rgba(0,0,0,.35)',
      padding: '6px 14px',
      border: '1px solid #444',
      borderRadius: '10px',
      boxShadow: '0 4px 18px -6px rgba(0,0,0,.6)',
      fontSize: '14px',
      fontWeight: '600',
      backdropFilter: 'blur(6px)',
      zIndex: 10,
      letterSpacing: '1px',
      whiteSpace: 'nowrap',
    });
    this.#hud.innerHTML = `
      <span id="ms404-mines"></span>
      <span id="ms404-flags"></span>
      <span id="ms404-timer"></span>
      <button id="ms404-reset" type="button" style="background:#333;border:1px solid #555;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:13px">${text.BUTTON.RESTART}</button>
    `;
    this.#container.appendChild(this.#hud);

    this.#hudElements = {
      mines: this.#hud.querySelector('#ms404-mines'),
      flags: this.#hud.querySelector('#ms404-flags'),
      timer: this.#hud.querySelector('#ms404-timer'),
      reset: this.#hud.querySelector('#ms404-reset'),
    };

    // Board svg, focusable for keyboard play
    this.#svg = this.#el('svg', {
      tabindex: 0,
      role: 'application',
      'aria-label': text.A11Y.BOARD,
    });
    Object.assign(this.#svg.style, {
      position: 'absolute',
      background: '#111',
      border: `${this.#BORDER}px solid #444`,
      borderRadius: '16px',
      boxShadow: '0 0 60px -6px #111, 0 0 25px -4px rgba(54, 89, 177, 1)',
    });
    this.#container.appendChild(this.#svg);

    this.#board = this.#el('g');
    this.#svg.appendChild(this.#board);

    // Screen reader announcements
    this.#liveRegion = document.createElement('div');
    this.#liveRegion.className = 'ms404-sr-only';
    this.#liveRegion.setAttribute('aria-live', 'polite');
    this.#container.appendChild(this.#liveRegion);
  }

  #bindEvents() {
    window.addEventListener('resize', () => this.#scheduleResize());
    this.#hudElements.reset.addEventListener('click', () => this.#newGame());
    this.#svg.addEventListener('contextmenu', (e) => this.#handleContextMenu(e));
    this.#svg.addEventListener('pointerdown', (e) => this.#handlePointerDown(e));
    this.#svg.addEventListener('pointermove', (e) => this.#handlePointerMove(e));
    this.#svg.addEventListener('pointerup', (e) => this.#handlePointerUp(e));
    this.#svg.addEventListener('pointercancel', () => this.#cancelPress());
    this.#svg.addEventListener('pointerleave', () => this.#cancelPress());
    this.#svg.addEventListener('keydown', (e) => this.#handleKeyDown(e));
    this.#svg.addEventListener('focus', () => {
      try {
        if (this.#svg.matches(':focus-visible')) this.#svg.classList.add('ms404-keyboard');
      } catch {
        // Older browsers without :focus-visible: the cursor shows on the first key press.
      }
    });
  }

  // Game lifecycle
  #newGame() {
    this.#stopTimer();
    this.#clearPendingTimeouts();
    this.#cancelPress();
    this.#overlay?.remove();
    this.#overlay = null;
    this.#svg.classList.remove('ms404-ended');

    this.#config = this.#chooseLayout();
    this.#state = this.#createEmptyState();
    this.#generatePermanent404Pattern();
    this.#buildBoard();
    this.#moveCursor(0, 0);
    this.#updateHud();
    this.#updateTimer();
    this.#layout();
  }

  #chooseLayout() {
    const { innerWidth: w, innerHeight: h } = window;
    const small = Math.min(w, h) < this.#SMALL_VIEWPORT;
    const portrait = h > w;
    if (small) return portrait ? this.#LAYOUTS.SMALL_PORTRAIT : this.#LAYOUTS.SMALL_LANDSCAPE;
    return portrait ? this.#LAYOUTS.LARGE_PORTRAIT : this.#LAYOUTS.LARGE_LANDSCAPE;
  }

  // State helpers
  #createEmptyState() {
    const { ROWS, COLS } = this.#config;
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({ r, c, mine: false, open: false, flag: false, num: 0, permanent: false });
      }
      grid.push(row);
    }
    return {
      grid,
      mines: 0,
      minesPlaced: false,
      openCount: 0,
      flags: 0,
      exploded: false,
      won: false,
      startTime: null,
      permanentCount: 0,
      animUntil: 0,
    };
  }

  #generatePermanent404Pattern() {
    const { ROWS, COLS } = this.#config;
    const sequence = ['4', '0', '4'];
    const patternWidth = sequence.length * 3 + (sequence.length - 1);
    const patternHeight = 5;
    const startRow = Math.floor((ROWS - patternHeight) / 2);
    const startCol = Math.floor((COLS - patternWidth) / 2);

    sequence.forEach((digit, idx) => {
      const colOffset = startCol + idx * 4;
      this.#PATTERN_DIGITS[digit].forEach((rowPattern, dr) => {
        [...rowPattern].forEach((ch, dc) => {
          if (ch !== 'X') return;
          const cell = this.#state.grid[startRow + dr][colOffset + dc];
          cell.permanent = true;
          cell.open = true;
          this.#state.permanentCount++;
        });
      });
    });
  }

  // Places mines after the first click, keeping that cell and its neighbours clear
  #placeMines(safeR, safeC) {
    const { MINES } = this.#config;
    const candidates = this.#state.grid
      .flat()
      .filter((cell) => !cell.permanent && (Math.abs(cell.r - safeR) > 1 || Math.abs(cell.c - safeC) > 1));
    const count = Math.min(MINES, candidates.length);

    // Partial Fisher-Yates shuffle
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (candidates.length - i));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      candidates[i].mine = true;
    }
    this.#state.mines = count;
    this.#state.minesPlaced = true;
  }

  #calculateNumbers() {
    for (const cell of this.#state.grid.flat()) {
      if (cell.mine || cell.permanent) continue;
      cell.num = this.#neighbours(cell.r, cell.c).filter((n) => n.mine).length;
    }
  }

  #neighbours(r, c) {
    const { ROWS, COLS } = this.#config;
    const result = [];
    for (const [dr, dc] of this.#DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) result.push(this.#state.grid[nr][nc]);
    }
    return result;
  }

  // Layout: resizing only scales the svg, it never redraws the tiles
  #scheduleResize() {
    if (this.#resizeFrame) return;
    this.#resizeFrame = requestAnimationFrame(() => {
      this.#resizeFrame = null;
      // Switch layout on rotation, but only before the game has started
      const untouched = !this.#state.minesPlaced && this.#state.flags === 0;
      if (untouched && this.#chooseLayout() !== this.#config) {
        this.#newGame();
      } else {
        this.#layout();
      }
    });
  }

  #layout() {
    const { ROWS, COLS, MARGIN } = this.#config;
    const hudH = this.#hud.offsetHeight + 12;
    const availW = window.innerWidth - MARGIN * 2;
    const availH = window.innerHeight - hudH - MARGIN * 2;
    const tile = Math.max(this.#MIN_TILE, Math.floor(Math.min(availW / COLS, availH / ROWS)));
    const boardW = COLS * tile;
    const boardH = ROWS * tile;
    const left = Math.max(MARGIN, (window.innerWidth - boardW) / 2);
    const top = hudH + MARGIN + Math.max(0, (window.innerHeight - hudH - boardH - MARGIN * 2) / 2);
    this.#svg.setAttribute('width', boardW);
    this.#svg.setAttribute('height', boardH);
    this.#svg.style.left = `${left}px`;
    this.#svg.style.top = `${top}px`;
  }

  // Rendering
  #buildBoard() {
    const { ROWS, COLS } = this.#config;
    const U = this.#UNIT;
    this.#board.replaceChildren();
    this.#svg.setAttribute('viewBox', `0 0 ${COLS * U} ${ROWS * U}`);

    this.#cellGroups = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const group = this.#el('g', { transform: `translate(${c * U},${r * U})` });
        this.#board.appendChild(group);
        row.push(group);
      }
      this.#cellGroups.push(row);
    }
    this.#redrawAll();

    // Grid lines overlay (draw after cells)
    const gridGroup = this.#el('g', { stroke: '#2a2a2a', 'stroke-width': 1, 'pointer-events': 'none' });
    for (let c = 1; c < COLS; c++) {
      gridGroup.appendChild(this.#el('line', { x1: c * U, y1: 0, x2: c * U, y2: ROWS * U }));
    }
    for (let r = 1; r < ROWS; r++) {
      gridGroup.appendChild(this.#el('line', { x1: 0, y1: r * U, x2: COLS * U, y2: r * U }));
    }
    this.#board.appendChild(gridGroup);

    // Keyboard cursor, shown only while the board has keyboard focus
    this.#cursorRect = this.#el('rect', {
      class: 'ms404-cursor',
      width: U,
      height: U,
      rx: U * 0.125,
      fill: 'none',
      stroke: '#4fc3f7',
      'stroke-width': 3,
      'pointer-events': 'none',
    });
    this.#board.appendChild(this.#cursorRect);
  }

  #redrawAll() {
    for (const cell of this.#state.grid.flat()) this.#renderCell(cell.r, cell.c);
  }

  #renderCell(r, c) {
    const group = this.#cellGroups[r][c];
    const cell = this.#state.grid[r][c];
    const U = this.#UNIT;
    group.replaceChildren();
    group.style.cursor = cell.permanent || (cell.open && cell.num === 0) ? 'default' : 'pointer';

    if (cell.permanent) {
      this.#drawPermanentTile(group, U);
      return;
    }

    if (this.#state.exploded) {
      if (cell.mine && cell.open) {
        // The mine that was clicked
        this.#drawBlastTile(group, U);
        this.#drawMine(group, U);
        return;
      }
      if (cell.mine && !cell.flag) {
        this.#drawOpenTile(group, U);
        this.#drawMine(group, U);
        return;
      }
      if (!cell.mine && cell.flag) {
        // Wrong flag
        this.#drawFlag(group, U);
        this.#drawCross(group, U);
        return;
      }
    }

    if (!cell.open) {
      if (cell.flag) {
        this.#drawFlag(group, U);
      } else {
        this.#drawClosedTile(group, U);
      }
      return;
    }

    this.#drawOpenTile(group, U);
    if (cell.num > 0) this.#drawNumber(group, cell.num, U);
  }

  // Creates an SVG element with attributes
  #el(tag, attrs = {}) {
    const node = document.createElementNS(this.#SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  }

  #tileRect(size, fill, stroke, strokeWidth, className) {
    const rx = size * 0.125;
    return this.#el('rect', {
      x: 0,
      y: 0,
      width: size,
      height: size,
      rx,
      ry: rx,
      fill,
      stroke,
      'stroke-width': strokeWidth,
      class: className,
    });
  }

  #drawPermanentTile(group, size) {
    // 404 tile - bright blue styling
    group.appendChild(
      this.#el('rect', {
        x: 0,
        y: 0,
        width: size,
        height: size,
        rx: size * 0.125,
        ry: size * 0.125,
        fill: 'rgba(52, 107, 245, 0.8)',
        stroke: 'rgba(52, 107, 245, 1)',
        'stroke-width': size * 0.0625,
      }),
    );

    // Inner glow with blue highlight
    const inset = size * 0.1875;
    group.appendChild(
      this.#el('rect', {
        x: inset,
        y: inset,
        width: size - inset * 2,
        height: size - inset * 2,
        rx: size * 0.0625,
        ry: size * 0.0625,
        fill: 'none',
        stroke: 'rgba(100, 150, 255, 0.8)',
        'stroke-width': 2,
        opacity: 0.6,
        class: 'pulse-glow',
      }),
    );

    // Subtle inner shine
    const shineInset = size * 0.125;
    group.appendChild(
      this.#el('rect', {
        x: shineInset,
        y: shineInset,
        width: size - shineInset * 2,
        height: size * 0.15,
        rx: size * 0.0625,
        ry: size * 0.0625,
        fill: 'rgba(180, 200, 255, 0.3)',
      }),
    );
  }

  #drawClosedTile(group, size) {
    group.appendChild(this.#tileRect(size, '#2e2e2e', '#555', size * 0.0625, 'cell-anim-open'));
  }

  #drawOpenTile(group, size) {
    group.appendChild(this.#tileRect(size, '#1a1a1a', '#444', size * 0.03125, 'cell-anim-open'));
  }

  #drawBlastTile(group, size) {
    group.appendChild(this.#tileRect(size, '#4a0000', '#aa0000', size * 0.0625, 'cell-anim-explode'));
  }

  #drawFlag(group, size) {
    this.#drawClosedTile(group, size);

    // Flag pole
    group.appendChild(
      this.#el('rect', {
        x: size * 0.34375,
        y: size * 0.1875,
        width: size * 0.0625,
        height: size * 0.625,
        fill: '#c0c0c0',
        class: 'cell-anim-flag',
      }),
    );

    // Flag
    group.appendChild(
      this.#el('path', {
        d: `M${size * 0.375} ${size * 0.8125}V${size * 0.1875}l${size * 0.3125} ${size * 0.125}-${size * 0.3125} ${size * 0.125}`,
        fill: '#ff3b30',
        class: 'cell-anim-flag',
      }),
    );
  }

  #drawCross(group, size) {
    for (const [x1, y1, x2, y2] of [
      [0.2, 0.2, 0.8, 0.8],
      [0.8, 0.2, 0.2, 0.8],
    ]) {
      group.appendChild(
        this.#el('line', {
          x1: size * x1,
          y1: size * y1,
          x2: size * x2,
          y2: size * y2,
          stroke: '#ffd54f',
          'stroke-width': size * 0.08,
          'stroke-linecap': 'round',
          class: 'cell-anim-explode',
        }),
      );
    }
  }

  #drawMine(group, size) {
    const center = size / 2;
    const strokeWidth = size * 0.0625;

    // Mine body
    group.appendChild(
      this.#el('circle', {
        cx: center,
        cy: center,
        r: size * 0.25,
        fill: '#000',
        stroke: '#555',
        'stroke-width': strokeWidth,
        class: 'cell-anim-explode',
      }),
    );

    // Mine spikes
    const spikeCoords = [
      [0.5, 0.125, 0.5, 0.3125],
      [0.5, 0.6875, 0.5, 0.875],
      [0.125, 0.5, 0.3125, 0.5],
      [0.6875, 0.5, 0.875, 0.5],
      [0.21875, 0.21875, 0.34375, 0.34375],
      [0.65625, 0.65625, 0.78125, 0.78125],
      [0.65625, 0.21875, 0.78125, 0.34375],
      [0.21875, 0.65625, 0.34375, 0.78125],
    ];
    for (const [x1, y1, x2, y2] of spikeCoords) {
      group.appendChild(
        this.#el('line', {
          x1: size * x1,
          y1: size * y1,
          x2: size * x2,
          y2: size * y2,
          stroke: '#555',
          'stroke-width': strokeWidth,
          'stroke-linecap': 'round',
          class: 'cell-anim-explode',
        }),
      );
    }

    // Inner highlight
    group.appendChild(
      this.#el('circle', {
        cx: center,
        cy: center,
        r: size * 0.125,
        fill: '#444',
        stroke: '#888',
        'stroke-width': 1,
        class: 'cell-anim-explode',
      }),
    );
  }

  #drawNumber(group, num, size) {
    const text = this.#el('text', {
      x: size / 2,
      y: size * 0.685,
      'text-anchor': 'middle',
      'font-size': Math.round(size * 0.5625),
      'font-weight': 600,
      fill: this.#NUMBER_COLORS[num] || '#fff',
      class: 'cell-anim-open',
    });
    text.textContent = num;
    group.appendChild(text);
  }

  #moveCursor(r, c) {
    this.#cursor = { r, c };
    this.#cursorRect.setAttribute('x', c * this.#UNIT);
    this.#cursorRect.setAttribute('y', r * this.#UNIT);
  }

  // Input
  // Maps pointer coordinates to a cell, so it works whichever child element is under the pointer
  #cellFromEvent(e) {
    const { ROWS, COLS } = this.#config;
    const rect = this.#svg.getBoundingClientRect();
    const tileW = (rect.width - this.#BORDER * 2) / COLS;
    const tileH = (rect.height - this.#BORDER * 2) / ROWS;
    const c = Math.floor((e.clientX - rect.left - this.#BORDER) / tileW);
    const r = Math.floor((e.clientY - rect.top - this.#BORDER) / tileH);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  }

  #handlePointerDown(e) {
    this.#lastPointerType = e.pointerType;
    this.#lastPointerButton = e.button;
    this.#svg.classList.remove('ms404-keyboard');
    if (e.button !== 0) return;
    const pos = this.#cellFromEvent(e);
    if (!pos) return;

    this.#cancelPress();
    this.#moveCursor(pos.r, pos.c);
    const press = { id: e.pointerId, r: pos.r, c: pos.c, timer: null, longPressed: false };

    // Touch and pen: a long press places a flag
    if (e.pointerType !== 'mouse') {
      e.preventDefault();
      press.timer = setTimeout(() => {
        press.timer = null;
        press.longPressed = true;
        this.#toggleFlag(press.r, press.c);
      }, this.#LONG_PRESS_MS);
    }
    this.#press = press;
  }

  #handlePointerMove(e) {
    const press = this.#press;
    if (!press || e.pointerId !== press.id) return;
    const pos = this.#cellFromEvent(e);
    if (!pos || pos.r !== press.r || pos.c !== press.c) this.#cancelPress();
  }

  #handlePointerUp(e) {
    const press = this.#press;
    if (!press || e.pointerId !== press.id) return;
    this.#cancelPress();
    if (press.longPressed) return;
    // Only act when the press started and ended on the same cell
    const pos = this.#cellFromEvent(e);
    if (pos && pos.r === press.r && pos.c === press.c) this.#primaryAction(pos.r, pos.c);
  }

  #cancelPress() {
    if (this.#press?.timer) clearTimeout(this.#press.timer);
    this.#press = null;
  }

  #handleContextMenu(e) {
    e.preventDefault();
    // A touch or pen long press fires contextmenu too; the long-press timer already handled it
    if (this.#lastPointerType !== 'mouse' && this.#lastPointerButton === 0) return;
    const pos = this.#cellFromEvent(e);
    if (!pos) return;
    this.#moveCursor(pos.r, pos.c);
    this.#toggleFlag(pos.r, pos.c);
  }

  #handleKeyDown(e) {
    const { ROWS, COLS } = this.#config;
    let { r, c } = this.#cursor;

    switch (e.key) {
      case 'ArrowUp':
        r = Math.max(0, r - 1);
        break;
      case 'ArrowDown':
        r = Math.min(ROWS - 1, r + 1);
        break;
      case 'ArrowLeft':
        c = Math.max(0, c - 1);
        break;
      case 'ArrowRight':
        c = Math.min(COLS - 1, c + 1);
        break;
      case 'Enter':
      case ' ':
        this.#primaryAction(r, c);
        break;
      case 'f':
      case 'F':
        this.#toggleFlag(r, c);
        break;
      default:
        return;
    }

    e.preventDefault();
    this.#svg.classList.add('ms404-keyboard');
    this.#moveCursor(r, c);
    if (!this.#state.exploded && !this.#state.won) this.#announceCell(r, c);
  }

  #announceCell(r, c) {
    const text = this.#TEXT.EN.A11Y;
    const cell = this.#state.grid[r][c];
    let status;
    if (cell.permanent) status = text.PERMANENT;
    else if (!cell.open) status = cell.flag ? text.FLAGGED : text.HIDDEN;
    else status = cell.num > 0 ? String(cell.num) : text.EMPTY;
    this.#liveRegion.textContent = `${text.ROW} ${r + 1}, ${text.COLUMN} ${c + 1}: ${status}`;
  }

  // Game actions
  // Opens a closed cell, or chords an open number
  #primaryAction(r, c) {
    const cell = this.#state.grid[r][c];
    if (cell.open && !cell.permanent && cell.num > 0) {
      this.#chord(r, c);
    } else {
      this.#openCell(r, c);
    }
  }

  // Opens all unflagged neighbours when the flag count matches the number
  #chord(r, c) {
    if (this.#state.exploded || this.#state.won) return;
    const neighbours = this.#neighbours(r, c);
    const flags = neighbours.filter((n) => n.flag).length;
    if (flags !== this.#state.grid[r][c].num) return;
    for (const n of neighbours) this.#openCell(n.r, n.c);
  }

  #toggleFlag(r, c) {
    if (this.#state.exploded || this.#state.won) return;
    const cell = this.#state.grid[r][c];
    if (cell.open || cell.permanent) return;
    cell.flag = !cell.flag;
    this.#state.flags += cell.flag ? 1 : -1;
    this.#updateHud();
    this.#renderCell(r, c);
  }

  #openCell(r, c) {
    const state = this.#state;
    if (state.exploded || state.won) return;
    const cell = state.grid[r][c];
    if (cell.open || cell.flag || cell.permanent) return;

    if (!state.minesPlaced) {
      this.#placeMines(r, c);
      this.#calculateNumbers();
      this.#startTimer();
    }

    cell.open = true;
    if (cell.mine) {
      state.exploded = true;
      this.#endGame(false);
      return;
    }

    state.openCount++;
    this.#renderCell(r, c);
    if (cell.num === 0) this.#floodFill(r, c);
    this.#checkWin();
  }

  // Breadth-first reveal; the animation delay grows with the distance from the clicked cell
  #floodFill(r, c) {
    const queue = [[r, c, 0]];
    let maxDistance = 0;

    for (let i = 0; i < queue.length; i++) {
      const [cr, cc, distance] = queue[i];
      for (const n of this.#neighbours(cr, cc)) {
        if (n.open || n.flag || n.permanent) continue;
        n.open = true;
        this.#state.openCount++;
        maxDistance = Math.max(maxDistance, distance + 1);
        this.#schedule(() => this.#renderCell(n.r, n.c), (distance + 1) * this.#FLOOD_STEP_MS);
        if (n.num === 0) queue.push([n.r, n.c, distance + 1]);
      }
    }
    this.#state.animUntil = performance.now() + maxDistance * this.#FLOOD_STEP_MS;
  }

  #checkWin() {
    const state = this.#state;
    if (state.exploded || state.won) return;
    const { ROWS, COLS } = this.#config;
    const safeCells = ROWS * COLS - state.permanentCount - state.mines;
    if (state.openCount !== safeCells) return;

    state.won = true;
    // Flag every remaining mine
    for (const cell of state.grid.flat()) {
      if (cell.mine && !cell.flag) {
        cell.flag = true;
        state.flags++;
        this.#renderCell(cell.r, cell.c);
      }
    }
    this.#updateHud();
    this.#endGame(true);
  }

  #endGame(won) {
    this.#stopTimer();
    this.#updateTimer();
    this.#cancelPress();
    this.#svg.classList.add('ms404-ended');
    if (!won) {
      // Drop pending reveal animations and draw the final board at once
      this.#clearPendingTimeouts();
      this.#redrawAll();
    }
    this.#showEndMessage(won);
  }

  // HUD and timer
  #updateHud() {
    const { MINES, FLAGS } = this.#TEXT.EN.HUD_ELEMENT;
    const { mines, minesPlaced, flags } = this.#state;
    const total = minesPlaced ? mines : this.#config.MINES;
    this.#hudElements.mines.textContent = `${MINES}: ${total - flags}`;
    this.#hudElements.flags.textContent = `${FLAGS}: ${flags}`;
  }

  #updateTimer() {
    const { TIME, SECONDS } = this.#TEXT.EN.HUD_ELEMENT;
    const { startTime } = this.#state;
    const seconds = startTime === null ? 0 : Math.floor((performance.now() - startTime) / 1000);
    this.#hudElements.timer.textContent = `${TIME}: ${seconds} ${SECONDS}`;
  }

  #startTimer() {
    this.#stopTimer();
    this.#state.startTime = performance.now();
    this.#timerInterval = setInterval(() => this.#updateTimer(), 1000);
  }

  #stopTimer() {
    if (this.#timerInterval) clearInterval(this.#timerInterval);
    this.#timerInterval = null;
  }

  // Timeouts tied to the current game, cleared on reset
  #schedule(fn, delay) {
    const id = setTimeout(() => {
      this.#pendingTimeouts.delete(id);
      fn();
    }, delay);
    this.#pendingTimeouts.add(id);
  }

  #clearPendingTimeouts() {
    for (const id of this.#pendingTimeouts) clearTimeout(id);
    this.#pendingTimeouts.clear();
  }

  #showEndMessage(won) {
    const message = won ? this.#TEXT.EN.MESSAGE.CONGRATULATIONS : this.#TEXT.EN.MESSAGE.GAME_OVER;
    this.#liveRegion.textContent = message.replace(/<br>/g, ' ');

    // Wait for the reveal animation to finish before covering the board
    const delay = Math.max(0, this.#state.animUntil - performance.now());
    this.#schedule(() => {
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        background: 'rgba(0,0,0,0.55)',
      });
      overlay.classList.add('overlay-fade');
      overlay.innerHTML = `<div style="text-align:center;font-size:38px;font-weight:700;letter-spacing:2px;">${message}<div style="margin-top:16px;font-size:16px;font-weight:400"><button id="ms404-play-again" type="button" style="background:#333;border:1px solid #555;color:#fff;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:14px">${this.#TEXT.EN.BUTTON.PLAY_AGAIN}</button></div></div>`;
      this.#container.appendChild(overlay);
      this.#overlay = overlay;

      const playAgain = overlay.querySelector('#ms404-play-again');
      playAgain.addEventListener('click', () => {
        this.#newGame();
        this.#svg.focus({ preventScroll: true });
      });
      playAgain.focus({ preventScroll: true });
    }, delay);
  }
}

// Initialise Minesweeper404 game on page load
if (document.readyState === 'complete') {
  Minesweeper404.initialise();
} else {
  window.addEventListener('load', Minesweeper404.initialise);
}
