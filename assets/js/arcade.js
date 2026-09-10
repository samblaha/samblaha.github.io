(function () {
  'use strict';

  const STORAGE_KEY = 'blaha-arcade-hs';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const GAMES = {
    snake: {
      title: 'Solder Snake',
      hint: 'Arrows / WASD to steer · eat the solder · don’t hit yourself',
      overlay: 'Steer the iron. Eat molten solder. Don’t short the board.',
      pad: true,
    },
    lasers: {
      title: 'Laser Gates',
      hint: 'Click, tap, or press Space to flap through the gates',
      overlay: 'A little flyer, a bunch of timing gates. Don’t get sliced.',
      pad: false,
    },
    match: {
      title: 'Chip Match',
      hint: 'Flip two chips at a time · fewer moves is a better score',
      overlay: 'Match the workshop pairs. Clear the bench. Brag locally.',
      pad: false,
    },
  };

  function loadScores() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      const out = {};
      Object.keys(GAMES).forEach(function (key) {
        const n = Number(raw[key]);
        if (Number.isFinite(n) && n >= 0) out[key] = Math.floor(n);
      });
      return out;
    } catch (err) {
      return {};
    }
  }

  function saveScores(scores) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (err) {
      /* private mode / quota — scores just don’t persist */
    }
  }

  function theme() {
    const s = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (s.getPropertyValue(name) || fallback).trim();
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      ink: read('--ink', dark ? '#f3ead8' : '#1c120c'),
      paper: read('--paper', dark ? '#12151a' : '#f8f0dc'),
      orange: read('--solder', read('--orange', '#ff6a2a')),
      mustard: read('--phosphor', read('--mustard', '#f0b429')),
      teal: read('--laser', read('--teal', '#2ee6a6')),
      base: read('--base', dark ? '#07080a' : '#eee2c8'),
      dark: dark,
    };
  }

  function spawnBurst(list, x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      list.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        color: color,
        r: 1.5 + Math.random() * 2.5,
      });
    }
  }

  function stepParticles(list, dt, gravity) {
    const g = gravity === undefined ? 80 : gravity;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt / 420;
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.vy += g * (dt / 1000);
      if (p.life <= 0) list.splice(i, 1);
    }
  }

  function drawParticles(ctx, list) {
    list.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function sizeCanvas(canvas) {
    const wrap = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(280, Math.floor(wrap.clientWidth));
    const h = Math.max(220, Math.floor(wrap.clientHeight));
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* ------------------------------------------------------------------ */
  /* Solder Snake                                                        */
  /* ------------------------------------------------------------------ */
  function createSnake(app) {
    const state = {
      cols: 24,
      rows: 16,
      snake: [],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 8, y: 8 },
      acc: 0,
      step: 130,
      alive: true,
      score: 0,
      particles: [],
    };

    function placeFood() {
      const taken = new Set(state.snake.map((c) => c.x + ',' + c.y));
      const spots = [];
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          if (!taken.has(x + ',' + y)) spots.push({ x, y });
        }
      }
      state.food = spots[Math.floor(Math.random() * spots.length)] || { x: 0, y: 0 };
    }

    function reset() {
      const midY = Math.floor(state.rows / 2);
      state.snake = [
        { x: 6, y: midY },
        { x: 5, y: midY },
        { x: 4, y: midY },
      ];
      state.dir = { x: 1, y: 0 };
      state.nextDir = { x: 1, y: 0 };
      state.acc = 0;
      state.step = 130;
      state.alive = true;
      state.score = 0;
      state.particles = [];
      placeFood();
      app.setScore(0);
    }

    function turn(x, y) {
      // Ignore a reverse of the heading already in motion, and only queue one
      // change per step so Down+Left in the same tick can't reverse into the body.
      if (state.dir.x + x === 0 && state.dir.y + y === 0) return;
      if (state.nextDir.x !== state.dir.x || state.nextDir.y !== state.dir.y) return;
      state.nextDir = { x, y };
    }

    function tick() {
      if (!state.alive) return;
      state.dir = state.nextDir;
      const head = state.snake[0];
      const next = {
        x: head.x + state.dir.x,
        y: head.y + state.dir.y,
      };

      const hitWall = next.x < 0 || next.y < 0 || next.x >= state.cols || next.y >= state.rows;
      const hitSelf = state.snake.some((c) => c.x === next.x && c.y === next.y);
      if (hitWall || hitSelf) {
        state.alive = false;
        app.flash();
        app.shake();
        app.gameOver(state.score);
        return;
      }

      state.snake.unshift(next);
      if (next.x === state.food.x && next.y === state.food.y) {
        state.score += 10;
        state.step = Math.max(70, state.step - 3);
        app.setScore(state.score);
        if (!prefersReduced) {
          const c = theme();
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            state.particles.push({
              x: next.x + 0.5,
              y: next.y + 0.5,
              vx: Math.cos(a) * (2 + Math.random() * 4),
              vy: Math.sin(a) * (2 + Math.random() * 4),
              life: 1,
              color: c.mustard,
              r: 1.6 + Math.random() * 2,
            });
          }
        }
        placeFood();
      } else {
        state.snake.pop();
      }
    }

    function draw(ctx, w, h, dt) {
      const c = theme();
      ctx.fillStyle = c.dark ? '#07140f' : '#1a2418';
      ctx.fillRect(0, 0, w, h);

      const pad = 12;
      const cell = Math.min((w - pad * 2) / state.cols, (h - pad * 2) / state.rows);
      const ox = (w - cell * state.cols) / 2;
      const oy = (h - cell * state.rows) / 2;

      ctx.fillStyle = c.dark ? '#0c1c16' : '#243028';
      ctx.fillRect(ox, oy, cell * state.cols, cell * state.rows);

      ctx.strokeStyle = 'rgba(46, 230, 166, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= state.cols; i++) {
        ctx.moveTo(ox + i * cell, oy);
        ctx.lineTo(ox + i * cell, oy + state.rows * cell);
      }
      for (let j = 0; j <= state.rows; j++) {
        ctx.moveTo(ox, oy + j * cell);
        ctx.lineTo(ox + state.cols * cell, oy + j * cell);
      }
      ctx.stroke();

      const food = state.food;
      const pulse = prefersReduced ? 1 : 0.85 + Math.sin(performance.now() / 180) * 0.15;
      const fx = ox + (food.x + 0.5) * cell;
      const fy = oy + (food.y + 0.5) * cell;
      ctx.fillStyle = c.mustard;
      ctx.shadowColor = c.mustard;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(fx, fy, (cell * 0.32) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      state.snake.forEach((seg, i) => {
        const heat = 1 - i / Math.max(1, state.snake.length);
        ctx.fillStyle = i === 0 ? c.orange : 'rgba(255, 106, 42,' + (0.45 + heat * 0.55) + ')';
        ctx.shadowColor = c.orange;
        ctx.shadowBlur = i === 0 ? 12 : 0;
        const inset = i === 0 ? 1 : 2.5;
        roundRect(ctx, ox + seg.x * cell + inset, oy + seg.y * cell + inset, cell - inset * 2, cell - inset * 2, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (i === 0) {
          ctx.fillStyle = c.paper;
          const ex = ox + (seg.x + 0.5 + state.dir.x * 0.18) * cell;
          const ey = oy + (seg.y + 0.5 + state.dir.y * 0.18) * cell;
          ctx.beginPath();
          ctx.arc(ex - (state.dir.y === 0 ? cell * 0.12 : 0), ey - (state.dir.x === 0 ? cell * 0.12 : 0), 2.2, 0, Math.PI * 2);
          ctx.arc(ex + (state.dir.y === 0 ? cell * 0.12 : 0), ey + (state.dir.x === 0 ? cell * 0.12 : 0), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (dt) {
        stepParticles(state.particles, dt, 1.2);
        state.particles.forEach(function (p) {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(ox + p.x * cell, oy + p.y * cell, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    }

    return {
      start: reset,
      stop: function () {},
      update: function (dt) {
        if (!state.alive) return;
        state.acc += dt;
        while (state.acc >= state.step) {
          state.acc -= state.step;
          tick();
        }
      },
      draw: draw,
      key: function (e) {
        const map = {
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          w: [0, -1],
          a: [-1, 0],
          s: [0, 1],
          d: [1, 0],
          W: [0, -1],
          A: [-1, 0],
          S: [0, 1],
          D: [1, 0],
        };
        const d = map[e.key];
        if (d) {
          e.preventDefault();
          turn(d[0], d[1]);
        }
      },
      pad: function (dir) {
        const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const d = map[dir];
        if (d) turn(d[0], d[1]);
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Laser Gates (flappy-style timing)                                   */
  /* ------------------------------------------------------------------ */
  function createLasers(app) {
    const state = {
      y: 0,
      vy: 0,
      gates: [],
      spawn: 0,
      score: 0,
      alive: true,
      t: 0,
      particles: [],
    };

    function reset(w, h) {
      state.y = h * 0.45;
      state.vy = 0;
      state.gates = [];
      state.spawn = 260;
      state.score = 0;
      state.alive = true;
      state.t = 0;
      state.particles = [];
      app.setScore(0);
    }

    function flap() {
      if (!state.alive) return;
      state.vy = -6.4;
    }

    function spawnGate(w, h) {
      const gap = Math.max(96, h * 0.28 - state.score * 1.2);
      const margin = 40;
      const gapY = margin + Math.random() * (h - gap - margin * 2);
      state.gates.push({ x: w + 20, gapY: gapY, gap: gap, passed: false });
    }

    function update(dt, w, h) {
      if (!state.alive) return;
      const step = Math.min(dt, 32) / 16.67;
      state.t += dt;
      state.vy += 0.32 * step;
      state.y += state.vy * step;

      const speed = (2.7 + state.score * 0.1) * step;
      state.spawn -= speed;
      if (state.spawn <= 0) {
        spawnGate(w, h);
        state.spawn = 260 + Math.random() * 50;
      }

      const px = w * 0.28;
      const pr = 14;

      if (state.y < pr) {
        state.y = pr;
        state.vy = 0;
      } else if (state.y > h - pr) {
        state.y = h - pr;
        state.vy = 0;
      }

      for (const g of state.gates) {
        g.x -= speed;
        if (!g.passed && g.x + 18 < px) {
          g.passed = true;
          state.score += 1;
          app.setScore(state.score);
        }
        const inX = px + pr > g.x && px - pr < g.x + 36;
        const inGap = state.y - pr > g.gapY && state.y + pr < g.gapY + g.gap;
        if (inX && !inGap) {
          state.alive = false;
          app.flash();
          app.shake();
          app.gameOver(state.score);
          return;
        }
      }

      state.gates = state.gates.filter((g) => g.x > -50);
    }

    function layout(w, h) {
      const pr = 14;
      if (!w || !h) return;
      state.y = Math.max(pr, Math.min(h - pr, state.y));
      for (const g of state.gates) {
        const maxGap = Math.max(96, h - 80);
        g.gap = Math.min(g.gap, maxGap);
        g.gapY = Math.max(40, Math.min(g.gapY, h - g.gap - 40));
      }
    }

    function draw(ctx, w, h, dt) {
      const c = theme();
      ctx.fillStyle = c.dark ? '#071018' : '#141c22';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = c.dark ? 'rgba(46,230,166,0.05)' : 'rgba(46,107,100,0.12)';
      for (let i = 0; i < 6; i++) {
        const x = ((i * 90 - (state.t * 0.04)) % (w + 90)) - 20;
        ctx.fillRect(x, 0, 18, h);
      }

      for (const g of state.gates) {
        ctx.fillStyle = c.dark ? '#0b2a24' : c.teal;
        ctx.fillRect(g.x, 0, 36, g.gapY);
        ctx.fillRect(g.x, g.gapY + g.gap, 36, h - (g.gapY + g.gap));
        ctx.shadowColor = c.orange;
        ctx.shadowBlur = 18;
        ctx.fillStyle = c.orange;
        ctx.fillRect(g.x - 4, g.gapY - 8, 44, 8);
        ctx.fillRect(g.x - 4, g.gapY + g.gap, 44, 8);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = c.orange;
        ctx.shadowColor = c.orange;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(g.x + 18, g.gapY);
        ctx.lineTo(g.x + 18, g.gapY + g.gap);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      }

      const px = w * 0.28;
      const py = state.y;
      const rot = Math.max(-0.6, Math.min(0.9, state.vy * 0.08));
      if (!prefersReduced && state.alive && state.particles.length < 48) {
        spawnBurst(state.particles, px - 12, py, c.teal, 1);
      }
      if (dt) stepParticles(state.particles, dt);
      drawParticles(ctx, state.particles);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.shadowColor = c.orange;
      ctx.shadowBlur = 16;
      ctx.fillStyle = c.orange;
      roundRect(ctx, -16, -12, 32, 24, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = c.mustard;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(22, -6);
      ctx.lineTo(22, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = c.paper;
      ctx.beginPath();
      ctx.arc(-2, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    return {
      start: function () {},
      onResize: reset,
      layout: layout,
      stop: function () {},
      update: function (dt, w, h) {
        if (state.gates.length === 0 && state.alive) reset(w, h);
        update(dt, w, h);
      },
      draw: draw,
      key: function (e) {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          flap();
        }
      },
      pointer: flap,
      pad: function (dir) {
        if (dir === 'action' || dir === 'up') flap();
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Chip Match                                                          */
  /* ------------------------------------------------------------------ */
  const MATCH_ICONS = ['⚙️', '⚡', '🔧', '⛳', '🖨️', '📡', '🌀', '💾'];

  function createMatch(app) {
    let cards = [];
    let flipped = [];
    let locked = false;
    let moves = 0;
    let matched = 0;
    let startedAt = 0;
    let flipTimer = 0;

    function shuffle(list) {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    }

    function clearFlipTimer() {
      if (flipTimer) {
        window.clearTimeout(flipTimer);
        flipTimer = 0;
      }
    }

    function paint(board) {
      if (!board) return;
      if (board.children.length !== cards.length) {
        board.innerHTML = '';
        cards.forEach(function (card, i) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.innerHTML =
            '<span class="match-card__face match-card__face--back" aria-hidden="true">✦</span>' +
            '<span class="match-card__face match-card__face--front" aria-hidden="true">' + card.icon + '</span>';
          btn.addEventListener('click', function () {
            flip(i, board);
          });
          board.appendChild(btn);
        });
      }
      cards.forEach(function (card, i) {
        const btn = board.children[i];
        btn.className = 'match-card' + (card.open || card.done ? ' is-open' : '') + (card.done ? ' is-done' : '');
        btn.disabled = !!card.done;
        btn.setAttribute('aria-label', card.open || card.done ? 'Chip ' + card.icon : 'Face-down chip');
      });
    }

    function flip(i, board) {
      if (locked) return;
      const card = cards[i];
      if (card.open || card.done) return;
      card.open = true;
      flipped.push(i);
      paint(board);
      if (board.children[i]) board.children[i].focus();

      if (flipped.length < 2) return;

      moves += 1;
      const a = cards[flipped[0]];
      const b = cards[flipped[1]];
      if (a.icon === b.icon) {
        a.done = true;
        b.done = true;
        flipped = [];
        matched += 1;
        const elapsed = Math.floor((performance.now() - startedAt) / 1000);
        const score = Math.max(0, 1200 - moves * 30 - elapsed * 4);
        app.setScore(score);
        if (matched === MATCH_ICONS.length) {
          app.flash();
          app.gameOver(score, 'Bench cleared in ' + moves + ' moves.');
        }
        paint(board);
      } else {
        locked = true;
        flipTimer = window.setTimeout(function () {
          flipTimer = 0;
          a.open = false;
          b.open = false;
          flipped = [];
          locked = false;
          paint(board);
        }, prefersReduced ? 0 : 650);
      }
    }

    return {
      start: function () {
        clearFlipTimer();
        const deck = shuffle(MATCH_ICONS.concat(MATCH_ICONS)).map(function (icon) {
          return { icon: icon, open: false, done: false };
        });
        cards = deck;
        flipped = [];
        locked = false;
        moves = 0;
        matched = 0;
        startedAt = performance.now();
        app.setScore(0);
        app.showMatch(true);
        if (app.matchBoard) app.matchBoard.innerHTML = '';
        paint(app.matchBoard);
      },
      stop: function () {
        clearFlipTimer();
        app.showMatch(false);
      },
      update: function () {},
      draw: function () {},
      key: function () {},
    };
  }

  /* ------------------------------------------------------------------ */
  /* Attract-mode doodle when idle                                       */
  /* ------------------------------------------------------------------ */
  function drawAttract(ctx, w, h, t) {
    const c = theme();
    ctx.fillStyle = c.dark ? '#07140f' : '#1a2418';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(46,230,166,0.12)';
    ctx.lineWidth = 1;
    const g = 28;
    ctx.beginPath();
    for (let x = (t / 40) % g; x < w; x += g) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = (t / 60) % g; y < h; y += g) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = c.teal;
    ctx.shadowColor = c.teal;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 4) {
      const y = h * 0.55 + Math.sin(x / 42 + t / 280) * 36 + Math.sin(x / 18 - t / 200) * 12;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    const cx = w / 2 + Math.sin(t / 900) * 30;
    const cy = h / 2 + Math.cos(t / 1100) * 16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t / 800);
    ctx.strokeStyle = c.orange;
    ctx.shadowColor = c.orange;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      roundRect(ctx, 34, -8, 18, 16, 3);
      ctx.fillStyle = c.mustard;
      ctx.fill();
    }
    ctx.restore();
    ctx.shadowBlur = 0;

    ctx.fillStyle = c.mustard;
    ctx.beginPath();
    ctx.arc(w * 0.2, h * 0.28 + Math.sin(t / 300) * 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.teal;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.7 + Math.cos(t / 280) * 12, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ------------------------------------------------------------------ */
  /* Shell                                                               */
  /* ------------------------------------------------------------------ */
  function mount(root) {
    const canvas = root.querySelector('[data-arcade-canvas]');
    const matchBoard = root.querySelector('[data-arcade-match]');
    const overlay = root.querySelector('[data-arcade-overlay]');
    const overlayTitle = root.querySelector('[data-arcade-overlay-title]');
    const overlayMsg = root.querySelector('[data-arcade-overlay-msg]');
    const startBtn = root.querySelector('[data-arcade-start]');
    const scoreEl = root.querySelector('[data-arcade-score]');
    const bestEl = root.querySelector('[data-arcade-best]');
    const titleEl = root.querySelector('[data-arcade-title]');
    const hintEl = root.querySelector('[data-arcade-hint]');
    const pad = root.querySelector('[data-arcade-pad]');
    const screen = root.querySelector('.arcade__screen');
    const liveEl = root.querySelector('[data-arcade-live]');
    const cabinet = root.querySelector('.arcade__cabinet');
    const picks = Array.from(root.querySelectorAll('[data-game]'));

    if (!canvas || !overlay) return;

    const scores = loadScores();
    let currentId = 'snake';
    let running = false;
    let raf = 0;
    let last = 0;
    let game = null;
    let visible = true;
    let attractDrawn = false;

    const factories = {
      snake: createSnake,
      lasers: createLasers,
      match: createMatch,
    };

    const app = {
      matchBoard: matchBoard,
      setScore: function (n) {
        scoreEl.textContent = String(n);
      },
      showMatch: function (on) {
        if (!matchBoard) return;
        matchBoard.hidden = !on;
        canvas.style.opacity = on ? '0' : '1';
        canvas.style.pointerEvents = on ? 'none' : 'auto';
        canvas.setAttribute('aria-hidden', on ? 'true' : 'false');
      },
      shake: function () {
        if (prefersReduced || !screen) return;
        screen.classList.remove('is-shake');
        void screen.offsetWidth;
        screen.classList.add('is-shake');
      },
      flash: function () {
        if (!screen) return;
        screen.classList.remove('is-flash');
        void screen.offsetWidth;
        screen.classList.add('is-flash');
      },
      gameOver: function (score, extra) {
        running = false;
        const prev = Number(scores[currentId]);
        const prior = Number.isFinite(prev) ? prev : 0;
        const best = Math.max(score || 0, prior);
        scores[currentId] = best;
        saveScores(scores);
        bestEl.textContent = String(best);
        overlay.hidden = false;
        overlayTitle.textContent = 'Game over';
        overlayMsg.textContent = extra || ('Score ' + (score || 0) + (best === (score || 0) && (score || 0) > prior ? ' — new best!' : ''));
        startBtn.textContent = 'Play again ✦';
        overlay.classList.add('is-over');
        if (liveEl) {
          liveEl.textContent = extra || ('Game over. Score ' + (score || 0));
        }
      },
    };

    function syncMeta() {
      const meta = GAMES[currentId];
      titleEl.textContent = meta.title;
      hintEl.textContent = meta.hint;
      bestEl.textContent = String(scores[currentId] || 0);
      if (screen) {
        screen.setAttribute('aria-label', meta.title + '. Click, then use the keyboard to play.');
      }
      if (!running) {
        overlayTitle.textContent = meta.title;
        overlayMsg.textContent = meta.overlay;
        startBtn.textContent = 'Play ✦';
        overlay.classList.remove('is-over');
      }
      if (pad) pad.hidden = !meta.pad;
      picks.forEach(function (btn) {
        const on = btn.getAttribute('data-game') === currentId;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        btn.tabIndex = on ? 0 : -1;
      });
      const activeTab = picks.find(function (btn) {
        return btn.getAttribute('data-game') === currentId;
      });
      if (cabinet && activeTab && activeTab.id) {
        cabinet.setAttribute('aria-labelledby', activeTab.id);
      }
    }

    function stopGame() {
      running = false;
      if (game && game.stop) game.stop();
      game = null;
      app.showMatch(false);
    }

    function startGame() {
      stopGame();
      overlay.hidden = true;
      overlay.classList.remove('is-over');
      if (liveEl) liveEl.textContent = '';
      const factory = factories[currentId];
      game = factory(app);
      running = true;
      last = performance.now();
      const size = sizeCanvas(canvas);
      if (game.onResize) game.onResize(size.w, size.h);
      if (game.start) game.start();
      scoreEl.textContent = '0';
      if (pad) pad.hidden = !GAMES[currentId].pad;
      if (screen) screen.focus({ preventScroll: true });
    }

    function loop(now) {
      const size = sizeCanvas(canvas);
      const dt = Math.min(50, now - last);
      last = now;

      if (visible) {
        if (running && game) {
          if (game.update) game.update(dt, size.w, size.h);
          if (game.draw) game.draw(size.ctx, size.w, size.h, dt);
        } else if (!overlay.classList.contains('is-over')) {
          if (!prefersReduced || !attractDrawn) {
            drawAttract(size.ctx, size.w, size.h, prefersReduced ? 0 : now);
            attractDrawn = prefersReduced;
          }
        }
      }

      raf = requestAnimationFrame(loop);
    }

    function selectGame(id) {
      if (!GAMES[id]) return;
      const switched = id !== currentId;
      currentId = id;
      if (switched || running) {
        stopGame();
        overlay.hidden = false;
        scoreEl.textContent = '0';
      }
      syncMeta();
    }

    picks.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        selectGame(btn.getAttribute('data-game'));
      });
      btn.addEventListener('keydown', function (e) {
        let next = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % picks.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + picks.length) % picks.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = picks.length - 1;
        if (next < 0) return;
        e.preventDefault();
        selectGame(picks[next].getAttribute('data-game'));
        picks[next].focus();
      });
    });

    startBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      startGame();
    });

    screen.addEventListener('pointerdown', function (e) {
      if (!running || !game || !game.pointer) return;
      if (e.target.closest('[data-arcade-start]')) return;
      if (matchBoard && !matchBoard.hidden) return;
      e.preventDefault();
      game.pointer(e);
    });

    window.addEventListener('keydown', function (e) {
      const typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (typing) return;

      const inArcade = root.contains(document.activeElement) || root.matches(':hover');
      if (!inArcade) return;

      if (!running) {
        if (e.key === 'Enter') {
          if (e.target && e.target.closest && (
            e.target.closest('[data-game]') || e.target.closest('[data-arcade-start]')
          )) return;
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (game && game.key) game.key(e);
    });

    if (pad) {
      pad.addEventListener('pointerdown', function (e) {
        const btn = e.target.closest('[data-pad]');
        if (!btn) return;
        e.preventDefault();
        const dir = btn.getAttribute('data-pad');
        if (!running) startGame();
        if (game && game.pad) game.pad(dir);
      });
    }

    function onLayout() {
      const size = sizeCanvas(canvas);
      attractDrawn = false;
      if (running && game && game.layout) game.layout(size.w, size.h);
    }

    window.addEventListener('resize', onLayout);
    window.addEventListener('themechange', function () {
      attractDrawn = false;
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        visible = entries.some(function (en) { return en.isIntersecting; });
      }, { threshold: 0.05 });
      io.observe(root);
    }

    syncMeta();
    last = performance.now();
    raf = requestAnimationFrame(loop);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) visible = false;
      else visible = true;
    });
  }

  function init() {
    document.querySelectorAll('[data-arcade]').forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
