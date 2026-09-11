(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Pass = window.BlahaArcadePass;

  const PROBE = {
    vcc: {
      title: 'TP1 · VCC',
      lines: ['HIGH', '3.28 V rail', 'Iron heater still in spec.', 'Don’t lick this one.'],
    },
    gate: {
      title: 'TP2 · GATE',
      lines: ['PULSE', 'Timing window ≈ 5 ms', 'Same family as the laser-gate write-up.', 'Open /p/laser-timing-gates/ if you want the real hardware.'],
    },
    card: {
      title: 'TP3 · CARD',
      lines: ['HIGH', 'Season card latched closed → open', 'localStorage · blaha-arcade-pass', 'High scores still live on blaha-arcade-hs.'],
    },
    sky: {
      title: 'TP4 · SKY',
      lines: ['HIGH', 'Constellation net is live', 'CH2 star chart · /constellation/', 'Copper traces are shared themes, not decoration.'],
    },
  };

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) el.setAttribute('hidden', '');
    else el.removeAttribute('hidden');
  }

  function paintLocked(pass) {
    const status = document.querySelector('[data-lab-lock-status]');
    if (!status || !Pass) return;
    const n = Pass.punchedCount(pass);
    const total = Pass.CHALLENGES.length;
    status.textContent = n === 0
      ? 'Season card 0/' + total + ' · every slot still open'
      : 'Season card ' + n + '/' + total + ' · still latched';
  }

  function bootLines() {
    return [
      'BLAHA LABS  BENCH BIOS 4.7',
      'SEASON CARD  ............  PUNCHED',
      'HOT IRON     ............  OK',
      'GATE TIME    ............  OK',
      'CLEAN BENCH  ...........  OK',
      'BACK ROOM LATCH  .......  OPEN',
      'PHOSPHOR PAD ............  WARM',
      'WELCOME AFTER HOURS.',
    ];
  }

  function playBoot(boot, logEl, done) {
    if (!boot || !logEl) {
      done();
      return;
    }
    setHidden(boot, false);
    const lines = bootLines();
    let i = 0;
    logEl.textContent = '';

    if (prefersReduced) {
      logEl.textContent = lines.join('\n');
      window.setTimeout(done, 40);
      return;
    }

    function tick() {
      if (i >= lines.length) {
        window.setTimeout(done, 420);
        return;
      }
      logEl.textContent += (i ? '\n' : '') + lines[i];
      i += 1;
      window.setTimeout(tick, 160);
    }
    tick();
  }

  function initDoodle(canvas) {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const readout = document.querySelector('[data-lab-doodle-readout]');
    const wipe = document.querySelector('[data-lab-doodle-wipe]');
    const strokes = [];
    let current = null;
    let drawing = false;

    function themeColor() {
      const s = getComputedStyle(document.documentElement);
      return (s.getPropertyValue('--phosphor') || '#f0b429').trim();
    }

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(280, Math.floor((wrap && wrap.clientWidth) || canvas.clientWidth || 720));
      const h = Math.max(220, Math.floor(w * 0.58));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      draw();
    }

    function point(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    function draw() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ctx = canvas.getContext('2d');
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#07140f';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(46, 230, 166, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 24) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 24) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      const color = themeColor();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.2;
      if (!prefersReduced) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }
      strokes.forEach(function (stroke) {
        if (stroke.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i += 1) ctx.lineTo(stroke[i].x, stroke[i].y);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      current = [point(e)];
      strokes.push(current);
      if (readout) readout.textContent = 'Tip down · phosphor wet';
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!drawing || !current) return;
      current.push(point(e));
      draw();
    });

    function endDraw() {
      drawing = false;
      current = null;
      if (readout) readout.textContent = 'Probe idle · ' + strokes.length + ' traces on glass';
    }

    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);

    if (wipe) {
      wipe.addEventListener('click', function () {
        strokes.length = 0;
        draw();
        if (readout) readout.textContent = 'Glass wiped · phosphor ready';
      });
    }

    window.addEventListener('resize', size);
    window.addEventListener('themechange', draw);
    size();
  }

  function initProbe() {
    const out = document.querySelector('[data-lab-probe-out]');
    const chrome = document.querySelector('[data-lab-probe-chrome]');
    const pads = Array.from(document.querySelectorAll('[data-lab-pad]'));
    if (!out || !pads.length) return;

    pads.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-lab-pad');
        const spec = PROBE[id];
        pads.forEach(function (p) { p.classList.toggle('is-live', p === btn); });
        if (!spec) return;
        out.textContent = spec.title + '\n' + spec.lines.join('\n');
        if (chrome) chrome.textContent = spec.lines[0];
      });
    });
  }

  function revealOpen(pass) {
    const locked = document.querySelector('[data-lab-locked]');
    const open = document.querySelector('[data-lab-open]');
    setHidden(locked, true);
    setHidden(open, false);
    if (Pass) Pass.revealLabChrome(pass);

    const boot = document.querySelector('[data-lab-boot]');
    const log = document.querySelector('[data-lab-boot-log]');
    const skip = document.querySelector('[data-lab-boot-skip]');
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      setHidden(boot, true);
      if (Pass) Pass.markBootSeen();
    }

    if (boot && pass && !pass.bootSeen) {
      if (Pass) Pass.markBootSeen();
      if (prefersReduced) {
        setHidden(boot, true);
      } else {
        if (skip) skip.addEventListener('click', finish);
        playBoot(boot, log, finish);
      }
    }

    initDoodle(document.querySelector('[data-lab-doodle]'));
    initProbe();
  }

  function init() {
    const pass = Pass ? Pass.loadPass() : { stamps: {}, unlocked: false };
    if (pass && pass.unlocked) revealOpen(pass);
    else paintLocked(pass);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
