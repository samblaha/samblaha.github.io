(function () {
  'use strict';

  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMq = window.matchMedia('(pointer: coarse)');

  const QUIET =
    '[data-arcade-canvas], .arcade__screen, .arcade__match, .arcade__overlay, .arcade__pad,' +
    '.leaflet-container, .leaflet-pane, .leaflet-control,' +
    '#constellation-stage, .constellation__stage, .constellation__canvas,' +
    '.lightbox, input, textarea, select, [contenteditable="true"]';

  const LIFE = 900;
  const PAD_LIFE = 1100;
  const MOTIF_LIFE = 2200;
  const MOTIF_COOLDOWN = 16000;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v || fallback).trim();
  }

  function palette() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      dark: dark,
      copper: cssVar('--copper', dark ? '#c47a3a' : '#8a5a2b'),
      solder: cssVar('--solder', '#ff6a2a'),
      phosphor: cssVar('--phosphor', '#f0b429'),
      laser: cssVar('--laser', '#3dffc5'),
    };
  }

  function isQuiet(el) {
    return !!(el && el.closest && el.closest(QUIET));
  }

  function throttled() {
    return coarseMq.matches || window.innerWidth < 720;
  }

  function octilinear(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx < 0.5 && ady < 0.5) return [];
    const sx = dx < 0 ? -1 : 1;
    const sy = dy < 0 ? -1 : 1;
    if (adx < 1.2 || ady < 1.2 || Math.abs(adx - ady) < 1.2) {
      return [{ x1: ax, y1: ay, x2: bx, y2: by, elbow: false }];
    }
    const d = Math.min(adx, ady);
    const mx = ax + sx * d;
    const my = ay + sy * d;
    return [
      { x1: ax, y1: ay, x2: mx, y2: my, elbow: true },
      { x1: mx, y1: my, x2: bx, y2: by, elbow: false },
    ];
  }

  function unwrapDelta(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function detectLoop(samples, now) {
    const recent = [];
    for (let i = 0; i < samples.length; i++) {
      if (now - samples[i].t < 1500) recent.push(samples[i]);
    }
    if (recent.length < 10) return null;
    let turn = 0;
    let len = 0;
    for (let i = 2; i < recent.length; i++) {
      const a1 = Math.atan2(recent[i - 1].y - recent[i - 2].y, recent[i - 1].x - recent[i - 2].x);
      const a2 = Math.atan2(recent[i].y - recent[i - 1].y, recent[i].x - recent[i - 1].x);
      turn += unwrapDelta(a1, a2);
      len += Math.hypot(recent[i].x - recent[i - 1].x, recent[i].y - recent[i - 1].y);
    }
    const first = recent[0];
    const last = recent[recent.length - 1];
    const close = Math.hypot(last.x - first.x, last.y - first.y) < 64;
    if (Math.abs(turn) > 4.7 && close && len > 96) {
      return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
    }
    return null;
  }

  function detectIdlePath(samples, now) {
    const recent = [];
    for (let i = 0; i < samples.length; i++) {
      if (now - samples[i].t < 2800) recent.push(samples[i]);
    }
    if (recent.length < 14) return null;
    const dt = recent[recent.length - 1].t - recent[0].t;
    if (dt < 2300) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let len = 0;
    for (let i = 0; i < recent.length; i++) {
      const p = recent[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      if (i) len += Math.hypot(p.x - recent[i - 1].x, p.y - recent[i - 1].y);
    }
    const box = Math.max(maxX - minX, maxY - minY);
    if (box < 240 && box > 28 && len > 160) {
      return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    }
    return null;
  }

  function drawPad(ctx, x, y, r, alpha, c, via) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = c.copper;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.solder;
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.arc(x - r * 0.18, y - r * 0.2, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    if (via && r > 2.4) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function strokeCopper(ctx, x1, y1, x2, y2, width, alpha, c) {
    ctx.globalAlpha = alpha * 0.95;
    ctx.strokeStyle = c.copper;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = c.solder;
    ctx.lineWidth = Math.max(1, width * 0.45);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function motifResistorLed(ctx, c) {
    ctx.strokeStyle = c.copper;
    ctx.lineWidth = 1.85;
    ctx.beginPath();
    ctx.moveTo(-44, 0);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-21, -8);
    ctx.lineTo(-13, 8);
    ctx.lineTo(-5, -8);
    ctx.lineTo(3, 8);
    ctx.lineTo(10, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(22, -8);
    ctx.lineTo(22, 8);
    ctx.lineTo(36, 0);
    ctx.closePath();
    ctx.fillStyle = c.phosphor;
    ctx.fill();
    ctx.strokeStyle = c.solder;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = c.copper;
    ctx.lineWidth = 1.85;
    ctx.beginPath();
    ctx.moveTo(38, -8);
    ctx.lineTo(38, 8);
    ctx.moveTo(38, 0);
    ctx.lineTo(48, 0);
    ctx.moveTo(48, 0);
    ctx.lineTo(48, 12);
    ctx.moveTo(43, 12);
    ctx.lineTo(53, 12);
    ctx.moveTo(45, 15);
    ctx.lineTo(51, 15);
    ctx.stroke();
  }

  function motifCrystal(ctx, c) {
    ctx.strokeStyle = c.copper;
    ctx.lineWidth = 1.85;
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(36, 0);
    ctx.moveTo(-8, -14);
    ctx.lineTo(-8, 14);
    ctx.moveTo(8, -14);
    ctx.lineTo(8, 14);
    ctx.stroke();
    ctx.lineWidth = 3.1;
    ctx.strokeStyle = c.solder;
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.lineTo(-3, 10);
    ctx.moveTo(3, -10);
    ctx.lineTo(3, 10);
    ctx.stroke();
  }

  function motifNpn(ctx, c) {
    ctx.strokeStyle = c.copper;
    ctx.lineWidth = 1.85;
    ctx.beginPath();
    ctx.moveTo(-8, -22);
    ctx.lineTo(-8, 22);
    ctx.moveTo(-8, -8);
    ctx.lineTo(18, -16);
    ctx.lineTo(18, -28);
    ctx.moveTo(-8, 8);
    ctx.lineTo(18, 16);
    ctx.lineTo(18, 28);
    ctx.moveTo(-30, 0);
    ctx.lineTo(-8, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(18, 16);
    ctx.lineTo(9, 20);
    ctx.closePath();
    ctx.fillStyle = c.solder;
    ctx.fill();
  }

  const MOTIFS = [motifResistorLed, motifCrystal, motifNpn];

  function init() {
    const canvas = document.getElementById('copper-trace');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = !document.hidden;
    let enabled = !reduceMq.matches;
    let hx = 0;
    let hy = 0;
    let px = 0;
    let py = 0;
    let tipX = 0;
    let tipY = 0;
    let hasHead = false;
    let pointerDown = false;
    let lastMove = 0;
    let lastMotif = -MOTIF_COOLDOWN;
    let motifIndex = 0;
    let quiet = false;
    let samples = [];
    const segs = [];
    const pads = [];
    const motifs = [];

    function maxSegs() {
      return throttled() ? 70 : 160;
    }

    function minStep() {
      return throttled() ? 16 : 11;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, throttled() ? 1.25 : 1.6);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      segs.length = 0;
      pads.length = 0;
      samples.length = 0;
      hasHead = false;
    }

    function showLayer(on) {
      canvas.hidden = !on;
    }

    function kick() {
      if (!enabled || !visible || raf) return;
      raf = requestAnimationFrame(tick);
    }

    function addSeg(seg, now, width) {
      segs.push({
        x1: seg.x1,
        y1: seg.y1,
        x2: seg.x2,
        y2: seg.y2,
        born: now,
        life: LIFE + Math.random() * 280,
        width: width,
      });
      if (seg.elbow) {
        pads.push({
          x: seg.x2,
          y: seg.y2,
          r: 2.4 + Math.random() * 1.6,
          born: now,
          life: PAD_LIFE,
          via: true,
        });
      }
      while (segs.length > maxSegs()) segs.shift();
      while (pads.length > maxSegs()) pads.shift();
    }

    function routeTo(x, y, now) {
      if (!hasHead) {
        hx = x;
        hy = y;
        hasHead = true;
        pads.push({ x: x, y: y, r: 3.2, born: now, life: PAD_LIFE, via: false });
        return;
      }
      const dist = Math.hypot(x - hx, y - hy);
      if (dist < minStep()) return;
      const width = throttled() ? 2.1 : 2.6 - Math.min(1.1, dist / 140);
      const parts = octilinear(hx, hy, x, y);
      for (let i = 0; i < parts.length; i++) addSeg(parts[i], now, width);
      hx = x;
      hy = y;
      samples.push({ x: x, y: y, t: now });
      if (samples.length > 80) samples.splice(0, samples.length - 80);
      maybeEaster(now);
    }

    function spawnMotif(x, y, now) {
      motifs.push({
        x: x,
        y: y,
        rot: (Math.random() - 0.5) * 0.5,
        scale: throttled() ? 0.78 : 1,
        born: now,
        kind: motifIndex++ % MOTIFS.length,
      });
      lastMotif = now;
      samples.length = 0;
      pads.push({ x: x, y: y, r: 4.5, born: now, life: MOTIF_LIFE, via: false });
    }

    function maybeEaster(now) {
      if (throttled() && !pointerDown) return;
      if (now - lastMotif < MOTIF_COOLDOWN) return;
      const loop = detectLoop(samples, now);
      if (loop) {
        spawnMotif(loop.x, loop.y, now);
        return;
      }
      const idle = detectIdlePath(samples, now);
      if (idle) spawnMotif(idle.x, idle.y, now);
    }

    function prune(now, list, lifeKey) {
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        const life = item.life || lifeKey;
        if (now - item.born > life) list.splice(i, 1);
      }
    }

    function tick(now) {
      raf = 0;
      if (!enabled || !visible) {
        showLayer(false);
        return;
      }

      const slow = throttled();
      if (slow && tick._last && now - tick._last < 31) {
        raf = requestAnimationFrame(tick);
        return;
      }
      tick._last = now;

      const moving = now - lastMove < 80;
      prune(now, segs, LIFE);
      prune(now, pads, PAD_LIFE);
      prune(now, motifs, MOTIF_LIFE);

      const live = segs.length + pads.length + motifs.length;
      const tipHot = moving && hasHead && !quiet;
      if (!live && !tipHot) {
        showLayer(false);
        return;
      }

      showLayer(true);
      const c = palette();
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const t = (now - s.born) / s.life;
        const alpha = t < 0.55 ? 0.72 : Math.max(0, 0.72 * (1 - (t - 0.55) / 0.45));
        strokeCopper(ctx, s.x1, s.y1, s.x2, s.y2, s.width, alpha, c);
      }

      for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        const t = (now - p.born) / p.life;
        const alpha = Math.max(0, 1 - t);
        drawPad(ctx, p.x, p.y, p.r, alpha * 0.9, c, p.via);
      }

      for (let i = 0; i < motifs.length; i++) {
        const m = motifs[i];
        const t = (now - m.born) / MOTIF_LIFE;
        let alpha;
        if (t < 0.12) alpha = t / 0.12;
        else if (t < 0.55) alpha = 1;
        else alpha = Math.max(0, 1 - (t - 0.55) / 0.45);
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rot);
        ctx.scale(m.scale, m.scale);
        ctx.globalAlpha = alpha * 0.92;
        MOTIFS[m.kind](ctx, c);
        ctx.restore();
        ctx.globalAlpha = 1;
        drawPad(ctx, m.x, m.y, 3, alpha * 0.7, c, true);
      }

      if (tipHot) {
        tipX += (px - tipX) * 0.42;
        tipY += (py - tipY) * 0.42;
        const glow = c.dark ? 0.55 : 0.4;
        ctx.globalAlpha = glow;
        ctx.fillStyle = c.solder;
        ctx.beginPath();
        ctx.arc(tipX, tipY, slow ? 5 : 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = c.dark ? 0.22 : 0.16;
        ctx.fillStyle = c.phosphor;
        ctx.beginPath();
        ctx.arc(tipX, tipY, slow ? 11 : 14, 0, Math.PI * 2);
        ctx.fill();
        drawPad(ctx, tipX, tipY, slow ? 3.1 : 3.6, 0.95, c, false);
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    function onPointerMove(e) {
      if (!enabled || !visible) return;
      if (e.pointerType === 'touch' && !pointerDown) return;
      const nextQuiet = isQuiet(e.target);
      if (nextQuiet !== quiet) hasHead = false;
      quiet = nextQuiet;
      px = e.clientX;
      py = e.clientY;
      lastMove = performance.now();
      if (!hasHead) {
        tipX = px;
        tipY = py;
      }
      if (!quiet) routeTo(px, py, lastMove);
      kick();
    }

    function onPointerDown(e) {
      pointerDown = true;
      quiet = isQuiet(e.target);
      px = e.clientX;
      py = e.clientY;
      lastMove = performance.now();
      if (!quiet && enabled) {
        if (e.pointerType === 'touch') hasHead = false;
        routeTo(px, py, lastMove);
        pads.push({
          x: px,
          y: py,
          r: 3.8 + Math.random() * 1.4,
          born: lastMove,
          life: PAD_LIFE + 200,
          via: false,
        });
        kick();
      }
    }

    function onPointerUp() {
      pointerDown = false;
    }

    function onPointerLeave() {
      hasHead = false;
      samples.length = 0;
    }

    function setEnabled(on) {
      enabled = on;
      if (!on) {
        segs.length = 0;
        pads.length = 0;
        motifs.length = 0;
        samples.length = 0;
        hasHead = false;
        showLayer(false);
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
      if (visible) kick();
      else {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        showLayer(false);
      }
    });
    reduceMq.addEventListener('change', function () {
      setEnabled(!reduceMq.matches);
    });

    if (!enabled) showLayer(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
