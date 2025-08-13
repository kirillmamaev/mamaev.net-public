/**
 * Minesweeper 404 Game by Kirill Mamaev - kirill@mamaev.net
 */

// SVG SYMBOL SPRITE (all graphics live here)
const SVG_SYMBOL_SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <linearGradient id="g-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#222"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
  </defs>
  <symbol id="tile-closed" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" ry="4" fill="#2e2e2e" stroke="#555" stroke-width="2"/>
  </symbol>
  <symbol id="tile-open" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" ry="4" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
  </symbol>
  <symbol id="tile-404" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" ry="4" fill="#333" stroke="#666" stroke-width="1"/>
  </symbol>
  <symbol id="tile-blast" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" ry="4" fill="#4a0000" stroke="#aa0000" stroke-width="2"/>
  </symbol>
  <symbol id="flag" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" ry="4" fill="#2e2e2e" stroke="#555" stroke-width="2"/>
    <path d="M12 26V6l10 4-10 4" fill="#ff3b30"/>
    <rect x="11" y="6" width="2" height="20" fill="#c0c0c0"/>
  </symbol>
  <symbol id="mine" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="4" ry="4" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
    <g fill="#000" stroke="#555" stroke-width="2" stroke-linecap="round">
      <circle cx="16" cy="16" r="8" fill="#000"/>
      <line x1="16" y1="4" x2="16" y2="10"/>
      <line x1="16" y1="22" x2="16" y2="28"/>
      <line x1="4" y1="16" x2="10" y2="16"/>
      <line x1="22" y1="16" x2="28" y2="16"/>
      <line x1="7" y1="7" x2="11" y2="11"/>
      <line x1="21" y1="21" x2="25" y2="25"/>
      <line x1="21" y1="7" x2="25" y2="11"/>
      <line x1="7" y1="21" x2="11" y2="25"/>
      <circle cx="16" cy="16" r="4" fill="#444" stroke="#888" stroke-width="1"/>
    </g>
  </symbol>
  <symbol id="logo-404" viewBox="0 0 160 40">
    <rect width="160" height="40" fill="none"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="28" font-family="Arial" fill="#fff">404 Minesweeper</text>
  </symbol>
</svg>`;

// Number rendering; colors map:
const NUMBER_COLORS = {
  1: '#4fc3f7',
  2: '#81c784',
  3: '#ffb74d',
  4: '#ba68c8',
  5: '#ef5350',
  6: '#26c6da',
  7: '#ffffff',
  8: '#bdbdbd',
};

// Game configuration
const CONFIG = {
  TILE: 32,
  ROWS: 15,
  COLS: 25,
  MINES: 25,
  PADDING: 0,
};

// Mobile / input tweaks
const LONG_PRESS_MS = 450; // long press to flag on touch
const IS_MOBILE = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 1;

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

    // Inject SVG sprite once
    if (!document.getElementById('ms404-sprite')) {
      const div = document.createElement('div');
      div.id = 'ms404-sprite';
      div.innerHTML = SVG_SYMBOL_SPRITE;
      document.body.appendChild(div);
    }

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
    };
  }

  generatePermanent404Pattern() {
    const { ROWS, COLS } = CONFIG;
    // Pattern digits 4 0 4 in 3x5 each with 1 column spacing
    const DIGITS = {
      4: ['X.X', 'X.X', 'XXX', '..X', '..X'],
      0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
    };
    const sequence = ['4', '0', '4'];
    const patternWidth = sequence.length * 3 + (sequence.length - 1) * 1;
    const patternHeight = 5;
    const startRow = Math.floor((ROWS - patternHeight) / 2);
    const startCol = Math.floor((COLS - patternWidth) / 2);
    let colCursor = startCol;
    sequence.forEach((digit, idx) => {
      const rows = DIGITS[digit];
      rows.forEach((rowPattern, dr) => {
        [...rowPattern].forEach((ch, dc) => {
          if (ch === 'X') {
            const cell = this.state.grid[startRow + dr][colCursor + dc];
            cell.permanent = true;
            cell.open = true;
            cell.num = 0;
          }
        });
      });
      colCursor += 3;
      if (idx < sequence.length - 1) colCursor += 1;
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
    const dirs = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.state.grid[r][c];
        if (cell.mine) continue;
        let count = 0;
        for (const [dr, dc] of dirs) {
          const nr = r + dr,
            nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (this.state.grid[nr][nc].mine) count++;
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
    const availH = window.innerHeight - hudH;
    const availW = window.innerWidth;
    const tile = Math.floor(Math.min(availW / CONFIG.COLS, availH / CONFIG.ROWS));
    CONFIG.TILE = Math.max(18, tile);
  }

  positionBoard() {
    if (!this.svgRoot) return;
    const hudH = this.hud ? this.hud.offsetHeight + 12 : 0;
    const boardW = CONFIG.COLS * CONFIG.TILE;
    const boardH = CONFIG.ROWS * CONFIG.TILE;
    const left = (window.innerWidth - boardW) / 2;
    const topExtraSpace = window.innerHeight - hudH - boardH;
    const top = hudH + Math.max(0, topExtraSpace / 2);
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
      <span id="ms404-timer">0.0s</span>
      <button id="ms404-reset" style="background:#333;border:1px solid #555;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:13px">Restart</button>
    `;
    this.container.appendChild(this.hud);
    this.hud.querySelector('#ms404-reset').addEventListener('click', () => this.resetGame());

    // Create board svg
    this.svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.assign(this.svgRoot.style, {
      position: 'absolute',
      background: '#111',
      border: '2px solid #444',
      borderRadius: '16px',
      boxShadow: '0 0 60px -6px rgba(0,0,0,.85), 0 0 50px -4px rgba(52, 107, 245, 1)',
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
    // Grid lines overlay (draw after cells) inside boardGroup so it is cleared next redraw
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

    if (!this.eventsBound) {
      // Events delegated (bind once)
      let longPressTimer = null;
      let longPressTarget = null;
      const clearLongPress = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        longPressTarget = null;
      };
      this.svgRoot.addEventListener('contextmenu', (e) => {
        const target = e.target.closest('g[data-r]');
        if (!target) return;
        e.preventDefault();
        const r = +target.getAttribute('data-r');
        const c = +target.getAttribute('data-c');
        this.toggleFlag(r, c);
      });
      this.svgRoot.addEventListener('pointerdown', (e) => {
        const target = e.target.closest('g[data-r]');
        if (!target) return;
        if (e.button !== 0) return;
        if (IS_MOBILE) {
          longPressTarget = target;
          longPressTimer = setTimeout(() => {
            if (!longPressTarget) return;
            const r = +longPressTarget.getAttribute('data-r');
            const c = +longPressTarget.getAttribute('data-c');
            this.toggleFlag(r, c);
            if (navigator.vibrate) navigator.vibrate(10);
            longPressTarget = null;
          }, LONG_PRESS_MS);
        }
      });
      this.svgRoot.addEventListener('pointerup', (e) => {
        const target = e.target.closest('g[data-r]');
        if (!target) {
          clearLongPress();
          return;
        }
        if (e.button !== 0) return;
        if (IS_MOBILE) {
          if (longPressTarget === target) {
            clearLongPress();
            const r = +target.getAttribute('data-r');
            const c = +target.getAttribute('data-c');
            this.openCell(r, c);
          }
        } else {
          const r = +target.getAttribute('data-r');
          const c = +target.getAttribute('data-c');
          this.openCell(r, c);
        }
      });
      this.svgRoot.addEventListener('pointerleave', clearLongPress, true);
      this.svgRoot.addEventListener('pointercancel', clearLongPress, true);
      this.eventsBound = true;
    }
  }

  renderCell(group, cell) {
    while (group.firstChild) group.removeChild(group.firstChild);
    const { TILE } = CONFIG;

    if (cell.permanent) {
      // 404 tile - bright blue distinctive styling
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

  drawClosedTile(group, size) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', size);
    rect.setAttribute('height', size);
    rect.setAttribute('rx', Math.max(2, size * 0.125));
    rect.setAttribute('ry', Math.max(2, size * 0.125));
    rect.setAttribute('fill', '#2e2e2e');
    rect.setAttribute('stroke', '#555');
    rect.setAttribute('stroke-width', Math.max(1, size * 0.0625));
    rect.classList.add('cell-anim-open');
    group.appendChild(rect);
  }

  drawOpenTile(group, size) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', size);
    rect.setAttribute('height', size);
    rect.setAttribute('rx', Math.max(2, size * 0.125));
    rect.setAttribute('ry', Math.max(2, size * 0.125));
    rect.setAttribute('fill', '#1a1a1a');
    rect.setAttribute('stroke', '#444');
    rect.setAttribute('stroke-width', Math.max(1, size * 0.03125));
    rect.classList.add('cell-anim-open');
    group.appendChild(rect);
  }

  drawBlastTile(group, size) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', size);
    rect.setAttribute('height', size);
    rect.setAttribute('rx', Math.max(2, size * 0.125));
    rect.setAttribute('ry', Math.max(2, size * 0.125));
    rect.setAttribute('fill', '#4a0000');
    rect.setAttribute('stroke', '#aa0000');
    rect.setAttribute('stroke-width', Math.max(1, size * 0.0625));
    rect.classList.add('cell-anim-explode');
    group.appendChild(rect);
  }

  drawFlag(group, size) {
    // Base tile
    this.drawClosedTile(group, size);

    // Flag pole
    const pole = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const poleX = size * 0.34375; // 11/32
    const poleY = size * 0.1875; // 6/32
    const poleW = size * 0.0625; // 2/32
    const poleH = size * 0.625; // 20/32
    pole.setAttribute('x', poleX);
    pole.setAttribute('y', poleY);
    pole.setAttribute('width', poleW);
    pole.setAttribute('height', poleH);
    pole.setAttribute('fill', '#c0c0c0');
    pole.classList.add('cell-anim-flag');
    group.appendChild(pole);

    // Flag
    const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const flagPath = `M${size * 0.375} ${size * 0.8125}V${size * 0.1875}l${size * 0.3125} ${size * 0.125}-${
      size * 0.3125
    } ${size * 0.125}`;
    flag.setAttribute('d', flagPath);
    flag.setAttribute('fill', '#ff3b30');
    flag.classList.add('cell-anim-flag');
    group.appendChild(flag);
  }

  drawMine(group, size) {
    // Mine body
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', size / 2);
    circle.setAttribute('cy', size / 2);
    circle.setAttribute('r', size * 0.25); // 8/32
    circle.setAttribute('fill', '#000');
    circle.setAttribute('stroke', '#555');
    circle.setAttribute('stroke-width', Math.max(1, size * 0.0625));
    circle.classList.add('cell-anim-explode');
    group.appendChild(circle);

    // Mine spikes
    const spikes = [
      [0.5, 0.125, 0.5, 0.3125], // top
      [0.5, 0.6875, 0.5, 0.875], // bottom
      [0.125, 0.5, 0.3125, 0.5], // left
      [0.6875, 0.5, 0.875, 0.5], // right
      [0.21875, 0.21875, 0.34375, 0.34375], // top-left
      [0.65625, 0.65625, 0.78125, 0.78125], // bottom-right
      [0.65625, 0.21875, 0.78125, 0.34375], // top-right
      [0.21875, 0.65625, 0.34375, 0.78125], // bottom-left
    ];

    spikes.forEach(([x1, y1, x2, y2]) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', size * x1);
      line.setAttribute('y1', size * y1);
      line.setAttribute('x2', size * x2);
      line.setAttribute('y2', size * y2);
      line.setAttribute('stroke', '#555');
      line.setAttribute('stroke-width', Math.max(1, size * 0.0625));
      line.setAttribute('stroke-linecap', 'round');
      line.classList.add('cell-anim-explode');
      group.appendChild(line);
    });

    // Inner highlight
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('cx', size / 2);
    inner.setAttribute('cy', size / 2);
    inner.setAttribute('r', size * 0.125); // 4/32
    inner.setAttribute('fill', '#444');
    inner.setAttribute('stroke', '#888');
    inner.setAttribute('stroke-width', '1');
    inner.classList.add('cell-anim-explode');
    group.appendChild(inner);
  }

  drawNumber(group, num, size) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', size / 2);
    text.setAttribute('y', size * 0.625); // 20/32
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', Math.round(size * 0.5625)); // 18/32
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
    this.state.flags += cell.flag ? 1 : -1;
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
      const key = cr + ',' + cc;
      if (seen.has(key)) continue;
      seen.add(key);
      const cell = this.state.grid[cr][cc];
      if (cell.num > 0) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = cr + dr;
          const nc = cc + dc;
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
    let totalNonPermanent = ROWS * COLS - this.countPermanent();
    if (this.state.openCount === totalNonPermanent - this.state.mines) {
      this.state.won = true;
      this.stopTimer();
      this.showEndMessage(true);
    }
  }

  countPermanent() {
    const { ROWS, COLS } = CONFIG;
    let count = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.state.grid[r][c].permanent) count++;
    return count;
  }

  updateHud() {
    const minesEl = document.getElementById('ms404-mines');
    const flagsEl = document.getElementById('ms404-flags');
    if (minesEl) minesEl.textContent = `Mines: ${this.state.mines}`;
    if (flagsEl) flagsEl.textContent = `Flags: ${this.state.flags}`;
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.state.exploded || this.state.won) return;
      const t = ((performance.now() - this.state.startTime) / 1000).toFixed(1);
      const el = document.getElementById('ms404-timer');
      if (el) el.textContent = `${t}s`;
    }, 100);
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
      won ? 'CONGRATULATIONS! YOU WON!' : 'BOOM!'
    }<div style="margin-top:16px;font-size:16px;font-weight:400"><button id="ms404-play-again" style="background:#333;border:1px solid #555;color:#fff;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:14px">Play Again</button></div></div>`;
    this.container.appendChild(overlay);
    overlay.querySelector('#ms404-play-again').addEventListener('click', () => this.resetGame());
  }

  resetGame() {
    this.stopTimer();
    this.container.remove();
    this.eventsBound = false; // Reset events flag so they get bound again
    this.state = this.createEmptyState();
    this.generatePermanent404Pattern();
    this.placeMines();
    this.calculateNumbers();
    this.render();
  }
}
