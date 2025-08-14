/**
 * Minesweeper 404 Game by Kirill Mamaev - kirill@mamaev.net
 *
 * A fun Minesweeper variant that displays a 404 error pattern
 * This script handles the game logic, rendering, and interactions.
 *
 * License: MIT
 */

// Numbers rendering colors map
const NUMBER_COLORS = ['', '#4fc3f7', '#81c784', '#ffb74d', '#9d60deff', '#ef5350', '#26c6da', '#ffffff', '#f472e7ff'];

// Direction vectors for adjacent cells
const DIRECTIONS = [
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
const PATTERN_DIGITS = {
  4: ['X.X', 'X.X', 'XXX', '..X', '..X'],
  0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
};

// Mobile / input configuration
const LONG_PRESS_MS = 500;
const IS_MOBILE = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 1;

// Game configuration
const CONFIG = {
  TILE: 32,
  ROWS: IS_MOBILE ? 9 : 15,
  COLS: IS_MOBILE ? 15 : 25,
  MINES: IS_MOBILE ? 10 : 25,
  MARGIN: IS_MOBILE ? 20 : 60,
};

// Initialise on load
if (document.readyState === 'complete') {
  initialise();
} else {
  window.addEventListener('load', initialise);
}

function initialise() {
  new Minesweeper404();
}

// Game Class
class Minesweeper404 {
  constructor() {
    this.resetPageStyles();
    this.eventsBound = false;
    this.hudElements = {};
    this.longPressTarget = null;
    this.longPressTimer = null;
    this.longPressExecuted = false;

    // Bind event handlers once to maintain references for removal
    this.boundHandleContextMenu = this.handleContextMenu.bind(this);
    this.boundHandlePointerDown = this.handlePointerDown.bind(this);
    this.boundHandlePointerUp = this.handlePointerUp.bind(this);
    this.boundClearLongPress = this.clearLongPress.bind(this);

    this.state = this.createEmptyState();
    this.generatePermanent404Pattern();
    this.placeMines();
    this.calculateNumbers();
    this.injectStyles();
    this.render();
    this.attachResizeHandler();
  }

  injectStyles() {
    if (document.getElementById('ms404-anim-styles')) return;
    const style = document.createElement('style');
    style.id = 'ms404-anim-styles';
    style.textContent = `
      @keyframes ms404-pop {0%{transform:scale(.4);opacity:0}60%{transform:scale(1.05);opacity:1}100%{transform:scale(1);opacity:1}}
      @keyframes ms404-flag {0%{transform:translateY(-6px);opacity:0}60%{transform:translateY(2px);opacity:1}100%{transform:translateY(0);opacity:1}}
      @keyframes ms404-explode {0%{transform:scale(.4) rotate(-30deg);opacity:0}70%{transform:scale(1.1) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0)} }
      @keyframes ms404-glow {0%{filter:drop-shadow(0 0 0 rgba(255,0,0,0))}50%{filter:drop-shadow(0 0 8px rgba(255,80,80,.6))}100%{filter:drop-shadow(0 0 0 rgba(255,0,0,0))}}
      @keyframes ms404-fade-in {from{opacity:0}to{opacity:1}}
      #ms404-container button:hover {background:#3c3c3c}
      #ms404-container button:active {transform:translateY(1px)}
      #ms404-container .cell-anim-open {animation:ms404-pop .18s cubic-bezier(.34,1.56,.64,1)}
      #ms404-container .cell-anim-flag {animation:ms404-flag .25s ease-out}
      #ms404-container .cell-anim-explode {animation:ms404-explode .35s cubic-bezier(.19,1,.22,1)}
      #ms404-container .pulse-glow {animation:ms404-glow 1.8s ease-in-out infinite}
      #ms404-container .overlay-fade {animation:ms404-fade-in .3s ease}
      #ms404-container svg {touch-action:none}
    `;
    document.head.appendChild(style);
  }

  // State helpers
  createEmptyState() {
    const { ROWS, COLS } = CONFIG;
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          r,
          c,
          mine: false,
          open: false,
          flag: false,
          num: 0,
          permanent: false,
        });
      }
      grid.push(row);
    }
    return {
      grid,
      mines: 0,
      openCount: 0,
      flags: 0,
      exploded: false,
      won: false,
      startTime: performance.now(),
      permanentCount: 0,
    };
  }

  generatePermanent404Pattern() {
    const { ROWS, COLS } = CONFIG;
    const sequence = ['4', '0', '4'];
    const patternWidth = sequence.length * 3 + (sequence.length - 1);
    const patternHeight = 5;
    const startRow = Math.floor((ROWS - patternHeight) / 2);
    const startCol = Math.floor((COLS - patternWidth) / 2);

    let colCursor = startCol;
    sequence.forEach((digit, idx) => {
      const rows = PATTERN_DIGITS[digit];
      rows.forEach((rowPattern, dr) => {
        [...rowPattern].forEach((ch, dc) => {
          if (ch === 'X') {
            const cell = this.state.grid[startRow + dr][colCursor + dc];
            cell.permanent = true;
            cell.open = true;
            cell.num = 0;
            this.state.permanentCount++;
          }
        });
      });
      colCursor += 3;
      if (idx < sequence.length - 1) colCursor++;
    });
  }

  placeMines() {
    const { ROWS, COLS, MINES } = CONFIG;
    let toPlace = MINES;
    while (toPlace > 0) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      const cell = this.state.grid[r][c];
      if (cell.mine || cell.permanent) continue;
      cell.mine = true;
      toPlace--;
      this.state.mines++;
    }
  }

  calculateNumbers() {
    const { ROWS, COLS } = CONFIG;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.state.grid[r][c];
        if (cell.mine) continue;

        let count = 0;
        for (const [dr, dc] of DIRECTIONS) {
          const nr = r + dr,
            nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && this.state.grid[nr][nc].mine) {
            count++;
          }
        }
        cell.num = count;
      }
    }
  }

  attachResizeHandler() {
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  handleResize() {
    this.computeTileSize();
    this.positionBoard();
    this.redrawBoard();
  }

  computeTileSize() {
    const hudH = this.hud ? this.hud.offsetHeight + 12 : 0;
    const margin = CONFIG.MARGIN;
    const availH = window.innerHeight - hudH - margin * 2;
    const availW = window.innerWidth - margin * 2;
    const tile = Math.floor(Math.min(availW / CONFIG.COLS, availH / CONFIG.ROWS));
    CONFIG.TILE = Math.max(18, tile);
  }

  positionBoard() {
    if (!this.svgRoot) return;
    const hudH = this.hud ? this.hud.offsetHeight + 12 : 0;
    const margin = CONFIG.MARGIN;
    const boardW = CONFIG.COLS * CONFIG.TILE;
    const boardH = CONFIG.ROWS * CONFIG.TILE;
    const left = Math.max(margin, (window.innerWidth - boardW) / 2);
    const topExtraSpace = window.innerHeight - hudH - boardH - margin * 2;
    const top = hudH + margin + Math.max(0, topExtraSpace / 2);
    this.svgRoot.setAttribute('width', boardW);
    this.svgRoot.setAttribute('height', boardH);
    this.svgRoot.setAttribute('viewBox', `0 0 ${boardW} ${boardH}`);
    this.svgRoot.style.left = `${left}px`;
    this.svgRoot.style.top = `${top}px`;
  }

  redrawBoard() {
    if (!this.boardGroup) return;
    // Rebuild tile transforms to new size
    this.drawTiles();
  }

  resetPageStyles() {
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

  render() {
    this.container = document.createElement('div');
    this.container.id = 'ms404-container';
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
    });
    document.body.appendChild(this.container);

    // HUD (fixed top center)
    this.hud = document.createElement('div');
    Object.assign(this.hud.style, {
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
    });
    this.hud.innerHTML = `
      <span id="ms404-mines">Mines: ${this.state.mines}</span>
      <span id="ms404-flags">Flags: 0</span>
      <span id="ms404-timer">Time: 0 s</span>
      <button id="ms404-reset" style="background:#333;border:1px solid #555;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:13px">Restart</button>
    `;
    this.container.appendChild(this.hud);

    // Cache HUD elements
    this.hudElements = {
      mines: this.hud.querySelector('#ms404-mines'),
      flags: this.hud.querySelector('#ms404-flags'),
      timer: this.hud.querySelector('#ms404-timer'),
      reset: this.hud.querySelector('#ms404-reset'),
    };
    this.hudElements.reset.addEventListener('click', () => this.resetGame());

    // Create board svg
    this.svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.assign(this.svgRoot.style, {
      position: 'absolute',
      background: '#111',
      border: '2px solid #444',
      borderRadius: '16px',
      boxShadow: '0 0 60px -6px #111, 0 0 25px -4px rgba(54, 89, 177, 1)',
    });
    this.container.appendChild(this.svgRoot);

    // Group for tiles
    this.boardGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svgRoot.appendChild(this.boardGroup);

    // Compute initial size + draw
    this.handleResize();
    this.startTimer();
  }

  drawTiles() {
    while (this.boardGroup.firstChild) this.boardGroup.removeChild(this.boardGroup.firstChild);
    const { ROWS, COLS, TILE } = CONFIG;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.state.grid[r][c];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('data-r', r);
        g.setAttribute('data-c', c);
        g.style.cursor = cell.open || this.state.exploded || this.state.won || cell.permanent ? 'default' : 'pointer';
        g.setAttribute('transform', `translate(${c * TILE},${r * TILE})`);
        this.boardGroup.appendChild(g);
        this.renderCell(g, cell);
      }
    }
    // Grid lines overlay (draw after cells)
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('data-grid-lines', '1');
    gridGroup.setAttribute('stroke', '#2a2a2a');
    gridGroup.setAttribute('stroke-width', Math.max(1, Math.floor(TILE * 0.04)));
    gridGroup.setAttribute('pointer-events', 'none');
    for (let c = 1; c < COLS; c++) {
      const x = c * TILE + 0.5;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', ROWS * TILE);
      gridGroup.appendChild(line);
    }
    for (let r = 1; r < ROWS; r++) {
      const y = r * TILE + 0.5;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', COLS * TILE);
      line.setAttribute('y2', y);
      gridGroup.appendChild(line);
    }
    this.boardGroup.appendChild(gridGroup);

    // Consolidate event listeners
    if (!this.eventsBound) {
      this.svgRoot.addEventListener('contextmenu', this.boundHandleContextMenu);
      this.svgRoot.addEventListener('pointerdown', this.boundHandlePointerDown);
      this.svgRoot.addEventListener('pointerup', this.boundHandlePointerUp);
      this.svgRoot.addEventListener('pointerleave', this.boundClearLongPress, true);
      this.svgRoot.addEventListener('pointercancel', this.boundClearLongPress, true);
      this.eventsBound = true;
    }
  }

  handleContextMenu(e) {
    const target = e.target.closest('g[data-r]');
    if (!target) return;
    e.preventDefault();
    // On mobile, don't handle context menu if we're handling long press
    if (IS_MOBILE && (this.longPressTimer || this.longPressExecuted)) {
      return;
    }
    const r = +target.getAttribute('data-r');
    const c = +target.getAttribute('data-c');
    this.toggleFlag(r, c);
  }

  handlePointerDown(e) {
    const target = e.target.closest('g[data-r]');
    if (!target || e.button !== 0) return;
    if (IS_MOBILE) {
      e.preventDefault();
      // If we already have a long press in progress for this target, don't start another
      if (this.longPressTarget === target && this.longPressTimer) {
        return;
      }
      // Clear any existing long press state before starting new one
      this.clearLongPress();
      this.longPressTarget = target;
      this.longPressExecuted = false;
      this.longPressTimer = setTimeout(() => {
        if (!this.longPressTarget) return;
        const r = +this.longPressTarget.getAttribute('data-r');
        const c = +this.longPressTarget.getAttribute('data-c');
        this.toggleFlag(r, c);
        this.longPressExecuted = true;
      }, LONG_PRESS_MS);
    }
  }

  handlePointerUp(e) {
    const target = e.target.closest('g[data-r]');
    if (!target) {
      this.clearLongPress();
      return;
    }
    if (e.button !== 0) return;
    const r = +target.getAttribute('data-r');
    const c = +target.getAttribute('data-c');
    if (IS_MOBILE) {
      if (this.longPressTarget === target) {
        if (this.longPressExecuted) {
          this.clearLongPress();
        } else if (this.longPressTimer) {
          this.clearLongPress();
          this.openCell(r, c);
        }
      }
    } else {
      this.openCell(r, c);
    }
  }

  clearLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressTarget = null;
    this.longPressExecuted = false;
  }

  renderCell(group, cell) {
    while (group.firstChild) group.removeChild(group.firstChild);
    const { TILE } = CONFIG;

    if (cell.permanent) {
      // 404 tile - bright blue styling
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', TILE);
      rect.setAttribute('height', TILE);
      rect.setAttribute('rx', Math.max(2, TILE * 0.125));
      rect.setAttribute('ry', Math.max(2, TILE * 0.125));
      rect.setAttribute('fill', 'rgba(52, 107, 245, 0.8)');
      rect.setAttribute('stroke', 'rgba(52, 107, 245, 1)');
      rect.setAttribute('stroke-width', Math.max(2, TILE * 0.0625));
      group.appendChild(rect);

      // Inner glow with blue highlight
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const inset = Math.max(2, TILE * 0.1875);
      glow.setAttribute('x', inset);
      glow.setAttribute('y', inset);
      glow.setAttribute('width', TILE - inset * 2);
      glow.setAttribute('height', TILE - inset * 2);
      glow.setAttribute('rx', Math.max(1, TILE * 0.0625));
      glow.setAttribute('ry', Math.max(1, TILE * 0.0625));
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', 'rgba(100, 150, 255, 0.8)');
      glow.setAttribute('stroke-width', '2');
      glow.setAttribute('opacity', '0.6');
      glow.classList.add('pulse-glow');
      group.appendChild(glow);

      // Add a subtle inner shine
      const shine = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const shineInset = Math.max(1, TILE * 0.125);
      shine.setAttribute('x', shineInset);
      shine.setAttribute('y', shineInset);
      shine.setAttribute('width', TILE - shineInset * 2);
      shine.setAttribute('height', Math.max(2, TILE * 0.15));
      shine.setAttribute('rx', Math.max(1, TILE * 0.0625));
      shine.setAttribute('ry', Math.max(1, TILE * 0.0625));
      shine.setAttribute('fill', 'rgba(180, 200, 255, 0.3)');
      group.appendChild(shine);
      return;
    }

    if (this.state.exploded && cell.mine) {
      // Draw mine directly
      this.drawMine(group, TILE);
      return;
    }

    if (!cell.open) {
      if (cell.flag) {
        this.drawFlag(group, TILE);
      } else {
        this.drawClosedTile(group, TILE);
      }
    } else {
      if (cell.mine) {
        this.drawBlastTile(group, TILE);
        this.drawMine(group, TILE);
      } else {
        this.drawOpenTile(group, TILE);
        if (cell.num > 0) {
          this.drawNumber(group, cell.num, TILE);
        }
      }
    }
  }

  // Rect creation with common attributes
  createRect(x, y, width, height, rx, ry, fill, stroke, strokeWidth) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', rx);
    rect.setAttribute('ry', ry);
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', strokeWidth);
    return rect;
  }

  drawClosedTile(group, size) {
    const rx = Math.max(2, size * 0.125);
    const rect = this.createRect(0, 0, size, size, rx, rx, '#2e2e2e', '#555', Math.max(1, size * 0.0625));
    rect.classList.add('cell-anim-open');
    group.appendChild(rect);
  }

  drawOpenTile(group, size) {
    const rx = Math.max(2, size * 0.125);
    const rect = this.createRect(0, 0, size, size, rx, rx, '#1a1a1a', '#444', Math.max(1, size * 0.03125));
    rect.classList.add('cell-anim-open');
    group.appendChild(rect);
  }

  drawBlastTile(group, size) {
    const rx = Math.max(2, size * 0.125);
    const rect = this.createRect(0, 0, size, size, rx, rx, '#4a0000', '#aa0000', Math.max(1, size * 0.0625));
    rect.classList.add('cell-anim-explode');
    group.appendChild(rect);
  }

  drawFlag(group, size) {
    // Base tile
    this.drawClosedTile(group, size);

    // Flag pole
    const pole = this.createRect(
      size * 0.34375,
      size * 0.1875,
      size * 0.0625,
      size * 0.625,
      0,
      0,
      '#c0c0c0',
      'none',
      0,
    );
    pole.classList.add('cell-anim-flag');
    group.appendChild(pole);

    // Flag
    const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    flag.setAttribute(
      'd',
      `M${size * 0.375} ${size * 0.8125}V${size * 0.1875}l${size * 0.3125} ${size * 0.125}-${size * 0.3125} ${
        size * 0.125
      }`,
    );
    flag.setAttribute('fill', '#ff3b30');
    flag.classList.add('cell-anim-flag');
    group.appendChild(flag);
  }

  drawMine(group, size) {
    const center = size / 2;
    const radius = size * 0.25;
    const strokeWidth = Math.max(1, size * 0.0625);

    // Mine body
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', center);
    circle.setAttribute('cy', center);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', '#000');
    circle.setAttribute('stroke', '#555');
    circle.setAttribute('stroke-width', strokeWidth);
    circle.classList.add('cell-anim-explode');
    group.appendChild(circle);

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

    spikeCoords.forEach(([x1, y1, x2, y2]) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', size * x1);
      line.setAttribute('y1', size * y1);
      line.setAttribute('x2', size * x2);
      line.setAttribute('y2', size * y2);
      line.setAttribute('stroke', '#555');
      line.setAttribute('stroke-width', strokeWidth);
      line.setAttribute('stroke-linecap', 'round');
      line.classList.add('cell-anim-explode');
      group.appendChild(line);
    });

    // Inner highlight
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('cx', center);
    inner.setAttribute('cy', center);
    inner.setAttribute('r', size * 0.125);
    inner.setAttribute('fill', '#444');
    inner.setAttribute('stroke', '#888');
    inner.setAttribute('stroke-width', '1');
    inner.classList.add('cell-anim-explode');
    group.appendChild(inner);
  }

  drawNumber(group, num, size) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', size / 2);
    text.setAttribute('y', size * 0.685);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', Math.round(size * 0.5625));
    text.setAttribute('font-weight', '600');
    text.setAttribute('fill', NUMBER_COLORS[num] || '#fff');
    text.textContent = num;
    text.classList.add('cell-anim-open');
    group.appendChild(text);
  }

  toggleFlag(r, c) {
    if (this.state.exploded || this.state.won) return;
    const cell = this.state.grid[r][c];
    if (cell.open || cell.permanent) return;
    cell.flag = !cell.flag;
    this.state.flags = cell.flag ? 1 : 0;
    this.updateHud();
    this.renderCell(this.findCellGroup(r, c), cell);
    this.checkWin();
  }

  openCell(r, c) {
    if (this.state.exploded || this.state.won) return;
    const cell = this.state.grid[r][c];
    if (cell.open || cell.flag || cell.permanent) return;
    cell.open = true;
    this.state.openCount++;
    if (cell.mine) {
      this.state.exploded = true;
      this.stopTimer();
      this.revealAllMines();
      this.showEndMessage(false);
      return;
    }
    this.renderCell(this.findCellGroup(r, c), cell);
    if (cell.num === 0) this.floodFill(r, c);
    this.checkWin();
  }

  floodFill(r, c) {
    const { ROWS, COLS } = CONFIG;
    const queue = [[r, c]];
    const seen = new Set();
    let wave = 0;

    while (queue.length) {
      const [cr, cc] = queue.shift();
      const key = `${cr},${cc}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const cell = this.state.grid[cr][cc];
      if (cell.num > 0) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const nr = cr + dr,
          nc = cc + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;

        const ncell = this.state.grid[nr][nc];
        if (!ncell.open && !ncell.flag && !ncell.permanent && !ncell.mine) {
          ncell.open = true;
          this.state.openCount++;
          const g = this.findCellGroup(nr, nc);
          const delay = wave * 12;
          setTimeout(() => this.renderCell(g, ncell), delay);
          if (ncell.num === 0) queue.push([nr, nc]);
        }
      }
      wave++;
    }
  }

  findCellGroup(r, c) {
    return this.boardGroup.querySelector(`g[data-r="${r}"][data-c="${c}"]`);
  }

  revealAllMines() {
    const { ROWS, COLS } = CONFIG;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.state.grid[r][c];
        if (cell.mine) {
          this.renderCell(this.findCellGroup(r, c), cell);
        }
      }
    }
  }

  checkWin() {
    if (this.state.exploded || this.state.won) return;
    const { ROWS, COLS } = CONFIG;
    const totalNonPermanent = ROWS * COLS - this.countPermanent();
    if (this.state.openCount === totalNonPermanent - this.state.mines) {
      this.state.won = true;
      this.stopTimer();
      this.showEndMessage(true);
    }
  }

  countPermanent() {
    const { ROWS, COLS } = CONFIG;
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.state.grid[r][c].permanent) count++;
      }
    }
    return count;
  }

  // Batch HUD updates
  updateHud() {
    const { mines, flags } = this.state;
    this.hudElements.mines.textContent = `Mines: ${mines}`;
    this.hudElements.flags.textContent = `Flags: ${flags}`;
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.state.exploded || this.state.won) return;
      const t = ((performance.now() - this.state.startTime) / 1000).toFixed();
      this.hudElements.timer.textContent = `Time: ${t} s`;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  showEndMessage(won) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.classList.add('overlay-fade');
    overlay.innerHTML = `<div style="text-align:center;font-size:38px;font-weight:700;letter-spacing:2px;">${
      won
        ? 'Congratulations! 🎉<br><br>The page is not found,<br>but the winner is! 😉'
        : 'The page is not found,<br>but the mine is! 😉'
    }<div style="margin-top:16px;font-size:16px;font-weight:400"><button id="ms404-play-again" style="background:#333;border:1px solid #555;color:#fff;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:14px">Play Again</button></div></div>`;
    this.container.appendChild(overlay);
    overlay.querySelector('#ms404-play-again').addEventListener('click', () => this.resetGame());
  }

  cleanup() {
    // Clean up timers and event state
    this.stopTimer();
    this.clearLongPress();

    // Remove event listeners if they exist
    if (this.svgRoot && this.eventsBound) {
      this.svgRoot.removeEventListener('contextmenu', this.boundHandleContextMenu);
      this.svgRoot.removeEventListener('pointerdown', this.boundHandlePointerDown);
      this.svgRoot.removeEventListener('pointerup', this.boundHandlePointerUp);
      this.svgRoot.removeEventListener('pointerleave', this.boundClearLongPress, true);
      this.svgRoot.removeEventListener('pointercancel', this.boundClearLongPress, true);
    }

    this.eventsBound = false;
  }

  resetGame() {
    this.cleanup();
    this.container.remove();
    this.state = this.createEmptyState();
    this.generatePermanent404Pattern();
    this.placeMines();
    this.calculateNumbers();
    this.render();
  }
}
