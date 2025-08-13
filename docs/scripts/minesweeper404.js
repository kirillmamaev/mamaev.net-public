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
  ROWS: 16,
  COLS: 16,
  MINES: 35,
  PADDING: 12,
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
    const patternWidth = sequence.length * 3 + (sequence.length - 1) * 1; // 11
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
    window.addEventListener('resize', () => this.scaleBoard());
    this.scaleBoard();
  }

  scaleBoard() {
    if (!this.svgRoot) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const boardW = CONFIG.COLS * CONFIG.TILE + CONFIG.PADDING * 2;
    const boardH = CONFIG.ROWS * CONFIG.TILE + CONFIG.PADDING * 2 + 60;
    const scale = Math.min(w / boardW, h / boardH);
    this.container.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  resetPageStyles() {
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    document.body.style.overflow = 'hidden';
    document.body.style.display = 'flex';
    document.body.style.alignItems = 'center';
    document.body.style.justifyContent = 'center';
    document.body.style.background = 'radial-gradient(circle at 50% 40%, #222, #000)';
    document.body.style.fontFamily = 'Arial, sans-serif';
    document.body.style.color = '#fff';
    document.body.style.userSelect = 'none';
  }

  render() {
    // Container
    this.container = document.createElement('div');
    this.container.id = 'ms404-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transformOrigin = 'top left';
    this.container.style.transition = 'transform 0.2s ease';
    document.body.appendChild(this.container);

    // HUD
    const hud = document.createElement('div');
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.justifyContent = 'space-between';
    hud.style.width = `${CONFIG.COLS * CONFIG.TILE + CONFIG.PADDING * 2}px`;
    hud.style.padding = '8px 12px';
    hud.style.boxSizing = 'border-box';
    hud.style.fontSize = '18px';
    hud.style.fontWeight = '600';
    hud.style.letterSpacing = '1px';
    hud.innerHTML = `
      <div style="display:flex;gap:16px;align-items:center">
        <span id="ms404-mines">Mines: ${this.state.mines}</span>
        <span id="ms404-flags">Flags: 0</span>
        <span id="ms404-timer">0.0s</span>
      </div>
      <button id="ms404-reset" style="background:#333;border:1px solid #555;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:14px">Restart</button>
    `;
    this.container.appendChild(hud);

    hud.querySelector('#ms404-reset').addEventListener('click', () => this.resetGame());

    // SVG root
    this.svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgRoot.setAttribute('width', CONFIG.COLS * CONFIG.TILE + CONFIG.PADDING * 2);
    this.svgRoot.setAttribute('height', CONFIG.ROWS * CONFIG.TILE + CONFIG.PADDING * 2);
    this.svgRoot.setAttribute(
      'viewBox',
      `0 0 ${CONFIG.COLS * CONFIG.TILE + CONFIG.PADDING * 2} ${CONFIG.ROWS * CONFIG.TILE + CONFIG.PADDING * 2}`
    );
    this.svgRoot.style.background = 'linear-gradient(#111,#0d0d0d)';
    this.svgRoot.style.border = '2px solid #444';
    this.svgRoot.style.borderRadius = '12px';
    this.svgRoot.style.boxShadow = '0 0 24px -6px rgba(0,0,0,0.8), 0 0 40px -2px rgba(100,100,255,0.2)';
    this.container.appendChild(this.svgRoot);

    // Board group
    this.boardGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.boardGroup.setAttribute('transform', `translate(${CONFIG.PADDING},${CONFIG.PADDING})`);
    this.svgRoot.appendChild(this.boardGroup);

    this.drawTiles();
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
    // Events delegated
    this.svgRoot.addEventListener('contextmenu', (e) => {
      const target = e.target.closest('g[data-r]');
      if (!target) return;
      e.preventDefault();
      const r = +target.getAttribute('data-r');
      const c = +target.getAttribute('data-c');
      this.toggleFlag(r, c);
    });
    // Pointer handlers (desktop + touch)
    let longPressTimer = null;
    let longPressTarget = null;
    const clearLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressTarget = null;
    };
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
          // Haptic
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
          // Treat as tap open
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
  }

  renderCell(group, cell) {
    while (group.firstChild) group.removeChild(group.firstChild);
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    if (cell.permanent) {
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#tile-404');
      group.appendChild(use);
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      glow.setAttribute('x', 6);
      glow.setAttribute('y', 6);
      glow.setAttribute('width', 20);
      glow.setAttribute('height', 20);
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', '#888');
      glow.setAttribute('stroke-width', '1');
      glow.setAttribute('opacity', '0.3');
      glow.classList.add('pulse-glow');
      group.appendChild(glow);
      return;
    }

    if (this.state.exploded && cell.mine) {
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#mine');
      use.classList.add('cell-anim-explode');
      group.appendChild(use);
      return;
    }

    if (!cell.open) {
      if (cell.flag) {
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#flag');
        use.classList.add('cell-anim-flag');
      } else {
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#tile-closed');
      }
      group.appendChild(use);
    } else {
      if (cell.mine) {
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#tile-blast');
        use.classList.add('cell-anim-explode');
        group.appendChild(use);
        const m = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        m.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#mine');
        m.classList.add('cell-anim-explode');
        group.appendChild(m);
      } else {
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#tile-open');
        use.classList.add('cell-anim-open');
        group.appendChild(use);
        if (cell.num > 0) {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('x', 16);
          t.setAttribute('y', 19);
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('font-size', '18');
          t.setAttribute('font-weight', '600');
          t.setAttribute('fill', NUMBER_COLORS[cell.num] || '#fff');
          t.textContent = cell.num;
          t.classList.add('cell-anim-open');
          group.appendChild(t);
        }
      }
    }
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
      won ? 'YOU CLEARED AROUND 404!' : 'BOOM!'
    }<div style="margin-top:16px;font-size:16px;font-weight:400"><button id="ms404-play-again" style="background:#333;border:1px solid #555;color:#fff;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:14px">Play Again</button></div></div>`;
    this.container.appendChild(overlay);
    overlay.querySelector('#ms404-play-again').addEventListener('click', () => this.resetGame());
  }

  resetGame() {
    this.stopTimer();
    this.container.remove();
    this.state = this.createEmptyState();
    this.generatePermanent404Pattern();
    this.placeMines();
    this.calculateNumbers();
    this.render();
    this.scaleBoard();
  }
}
