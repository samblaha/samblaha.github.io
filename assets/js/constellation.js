(function () {
  'use strict';

  const stage = document.getElementById('constellation-stage');
  const canvas = document.getElementById('constellation-sky');
  const worldEl = document.getElementById('constellation-world');
  const dataEl = document.getElementById('constellation-data');
  if (!stage || !canvas || !worldEl || !dataEl) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const WORLD = { w: 1000, h: 720 };
  const SCALE_MIN = 0.42;
  const SCALE_MAX = 3.4;

  const LAYOUT = {
    guppy: [0.48, 0.14],
    'laser-timing-gates': [0.36, 0.28],
    'virtual-ball-rack': [0.78, 0.20],
    'retro-pi': [0.14, 0.26],
    'pi-pentester': [0.26, 0.44],
    'quantum-random-number-generator': [0.66, 0.40],
    'golf-ball-printer': [0.50, 0.52],
    'kali-macbook': [0.12, 0.58],
    'delta-3d-printer': [0.32, 0.72],
    'caesar-cipher': [0.80, 0.62],
  };

  const SHORT = {
    'laser-timing-gates': 'OpenPage',
    'virtual-ball-rack': 'Ball Rack',
    'pi-pentester': 'Pi-Pentest',
    'quantum-random-number-generator': 'QRNG',
    'golf-ball-printer': 'Ball Print',
    'kali-macbook': 'Kali MBP',
    'delta-3d-printer': 'Delta',
    'caesar-cipher': 'Caesar',
    'retro-pi': 'Retro Pi',
    guppy: 'Guppy',
  };

  const THEMES = [
    { id: 'hardware', label: 'Hardware', tags: ['Hardware', 'Embedded', '3D Printing', 'CAD', 'Raspberry Pi'] },
    { id: 'software', label: 'Software', tags: ['Software', 'Web', 'Python', 'UX'] },
    { id: 'ai', label: 'AI', tags: ['AI'] },
    { id: 'games', label: 'Games', tags: ['Retro Gaming'] },
    { id: 'golf', label: 'Golf', tags: ['Golf'] },
    { id: 'security', label: 'Security', tags: ['Security', 'Linux', 'Cryptography', 'Quantum'] },
  ];

  const THEME_COLOR = {
    hardware: '#c47a3a',
    software: '#3dffc5',
    ai: '#3dffc5',
    games: '#ff6a2a',
    golf: '#f0b429',
    security: '#ff6a2a',
  };

  const THEME_PRIORITY = ['ai', 'golf', 'games', 'security', 'hardware', 'software'];

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v || fallback).trim();
  }

  function palette() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      dark,
      ink: '#f3ead8',
      solder: cssVar('--solder', '#ff6a2a'),
      phosphor: cssVar('--phosphor', '#f0b429'),
      laser: cssVar('--laser', '#3dffc5'),
      copper: cssVar('--copper', '#c47a3a'),
    };
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSlug(slug) {
    let h = 2166136261;
    for (let i = 0; i < slug.length; i += 1) {
      h ^= slug.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function parseData() {
    try {
      const parsed = JSON.parse(dataEl.textContent);
      return Array.isArray(parsed) ? parsed.filter((p) => p && p.id && p.title && p.url) : [];
    } catch (err) {
      return [];
    }
  }

  function themeIdsFor(project) {
    const tags = Array.isArray(project.tags) ? project.tags : [];
    return THEMES.filter((theme) => theme.tags.some((tag) => tags.indexOf(tag) !== -1)).map((t) => t.id);
  }

  function primaryTheme(ids) {
    for (let i = 0; i < THEME_PRIORITY.length; i += 1) {
      if (ids.indexOf(THEME_PRIORITY[i]) !== -1) return THEME_PRIORITY[i];
    }
    return 'hardware';
  }

  function shortName(project) {
    if (SHORT[project.id]) return SHORT[project.id];
    const title = String(project.title || project.id);
    const cut = title.split(/[:—–-]/)[0].trim();
    return cut.length <= 16 ? cut : cut.slice(0, 14) + '…';
  }

  function placeNode(project, index) {
    const preset = LAYOUT[project.id];
    if (preset) {
      return { x: preset[0] * WORLD.w, y: preset[1] * WORLD.h };
    }
    const golden = Math.PI * (3 - Math.sqrt(5));
    const r = 0.18 + (hashSlug(project.id) % 40) / 400;
    const angle = index * golden;
    return {
      x: (0.5 + Math.cos(angle) * r) * WORLD.w,
      y: (0.5 + Math.sin(angle) * r) * WORLD.h,
    };
  }

  function buildEdges(nodes) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const map = new Map();

    function addChain(ids, themeId) {
      for (let i = 0; i < ids.length - 1; i += 1) {
        if (!byId.has(ids[i]) || !byId.has(ids[i + 1])) continue;
        const key = ids[i] < ids[i + 1] ? ids[i] + '~' + ids[i + 1] : ids[i + 1] + '~' + ids[i];
        const existing = map.get(key);
        if (existing) {
          if (existing.themes.indexOf(themeId) === -1) existing.themes.push(themeId);
        } else {
          map.set(key, { a: ids[i], b: ids[i + 1], themes: [themeId] });
        }
      }
    }

    THEMES.forEach((theme) => {
      const ids = nodes
        .filter((n) => n.themes.indexOf(theme.id) !== -1)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((n) => n.id);
      addChain(ids, theme.id);
    });

    return Array.from(map.values());
  }

  function pcbPath(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const m = Math.min(adx, ady);
    const mx = ax + Math.sign(dx) * m;
    const my = ay + Math.sign(dy) * m;
    return [
      { x: ax, y: ay },
      { x: mx, y: my },
      { x: bx, y: by },
    ];
  }

  const raw = parseData();
  const nodes = raw.map((project, index) => {
    const themes = themeIdsFor(project);
    const primary = primaryTheme(themes);
    const pos = placeNode(project, index);
    return Object.assign({}, project, {
      themes,
      primary,
      color: THEME_COLOR[primary] || THEME_COLOR.hardware,
      short: shortName(project),
      x: pos.x,
      y: pos.y,
    });
  });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges = buildEdges(nodes);

  const stars = [];
  const starRng = mulberry32(0xb1a7a);
  const starCount = coarsePointer ? 70 : 130;
  for (let i = 0; i < starCount; i += 1) {
    stars.push({
      x: starRng() * WORLD.w,
      y: starRng() * WORLD.h,
      r: starRng() * 1.4 + 0.3,
      a: 0.2 + starRng() * 0.7,
      tw: starRng() * Math.PI * 2,
      par: 0.25 + starRng() * 0.75,
    });
  }

  const cam = { x: WORLD.w / 2, y: WORLD.h / 2, scale: 1 };
  let viewW = 1;
  let viewH = 1;
  let dpr = 1;
  let filter = 'all';
  let selectedId = null;
  let hoverId = null;
  let raf = 0;
  let running = false;
  let dirty = true;
  const pointers = new Map();
  let drag = null;
  let pinch = null;

  const hud = {
    root: document.getElementById('constellation-hud'),
    kicker: document.getElementById('constellation-hud-kicker'),
    title: document.getElementById('constellation-hud-title'),
    summary: document.getElementById('constellation-hud-summary'),
    tags: document.getElementById('constellation-hud-tags'),
    open: document.getElementById('constellation-open'),
  };

  const readout = {
    nodes: document.querySelector('[data-sky-nodes]'),
    traces: document.querySelector('[data-sky-traces]'),
    net: document.querySelector('[data-sky-net]'),
    zoom: document.querySelector('[data-sky-zoom]'),
  };

  function worldToScreen(x, y, parallax) {
    const p = parallax == null ? 1 : parallax;
    return {
      x: (x - cam.x * p) * cam.scale + viewW / 2,
      y: (y - cam.y * p) * cam.scale + viewH / 2,
    };
  }

  function screenToWorld(sx, sy) {
    return {
      x: cam.x + (sx - viewW / 2) / cam.scale,
      y: cam.y + (sy - viewH / 2) / cam.scale,
    };
  }

  function applyWorldTransform() {
    const tx = viewW / 2 - cam.x * cam.scale;
    const ty = viewH / 2 - cam.y * cam.scale;
    worldEl.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + cam.scale + ')';
    worldEl.style.setProperty('--cam-scale', String(cam.scale));
    if (readout.zoom) readout.zoom.textContent = cam.scale.toFixed(1) + '×';
    dirty = true;
  }

  function clampCamera() {
    const pad = 80;
    cam.x = clamp(cam.x, -pad, WORLD.w + pad);
    cam.y = clamp(cam.y, -pad, WORLD.h + pad);
    cam.scale = clamp(cam.scale, SCALE_MIN, SCALE_MAX);
  }

  function fit(animate) {
    if (!nodes.length) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });
    const pad = 140;
    const bw = Math.max(maxX - minX, 120) + pad * 2;
    const bh = Math.max(maxY - minY, 120) + pad * 2;
    const next = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      scale: clamp(Math.min(viewW / bw, viewH / bh), SCALE_MIN, 1.35),
    };
    if (prefersReduced || animate === false) {
      cam.x = next.x;
      cam.y = next.y;
      cam.scale = next.scale;
      applyWorldTransform();
      return;
    }
    tweenCamera(next);
  }

  let tween = null;
  function tweenCamera(next) {
    if (prefersReduced) {
      Object.assign(cam, next);
      applyWorldTransform();
      return;
    }
    tween = {
      from: { x: cam.x, y: cam.y, scale: cam.scale },
      to: next,
      t: 0,
      dur: 420,
    };
  }

  function stepTween(dt) {
    if (!tween) return;
    tween.t += dt;
    const u = clamp(tween.t / tween.dur, 0, 1);
    const e = 1 - Math.pow(1 - u, 3);
    cam.x = tween.from.x + (tween.to.x - tween.from.x) * e;
    cam.y = tween.from.y + (tween.to.y - tween.from.y) * e;
    cam.scale = tween.from.scale + (tween.to.scale - tween.from.scale) * e;
    applyWorldTransform();
    if (u >= 1) tween = null;
  }

  function zoomAt(sx, sy, factor) {
    tween = null;
    const world = screenToWorld(sx, sy);
    cam.scale = clamp(cam.scale * factor, SCALE_MIN, SCALE_MAX);
    cam.x = world.x - (sx - viewW / 2) / cam.scale;
    cam.y = world.y - (sy - viewH / 2) / cam.scale;
    clampCamera();
    applyWorldTransform();
  }

  function panBy(dx, dy) {
    tween = null;
    cam.x -= dx / cam.scale;
    cam.y -= dy / cam.scale;
    clampCamera();
    applyWorldTransform();
  }

  function matchesFilter(themeList) {
    return filter === 'all' || themeList.indexOf(filter) !== -1;
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    viewW = Math.max(1, rect.width);
    viewH = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyWorldTransform();
  }

  function drawStars(now) {
    stars.forEach((star) => {
      const p = worldToScreen(star.x, star.y, star.par);
      if (p.x < -8 || p.y < -8 || p.x > viewW + 8 || p.y > viewH + 8) return;
      const twinkle = prefersReduced ? star.a : star.a * (0.65 + 0.35 * Math.sin(now / 700 + star.tw));
      ctx.beginPath();
      ctx.fillStyle = 'rgba(243,234,216,' + twinkle.toFixed(3) + ')';
      ctx.arc(p.x, p.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGrid() {
    const origin = worldToScreen(0, 0);
    const step = 48 * cam.scale;
    if (step < 10) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(196,122,58,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = origin.x % step;
    const y0 = origin.y % step;
    for (let x = x0; x < viewW; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewH);
    }
    for (let y = y0; y < viewH; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(viewW, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawTraces(now) {
    const pal = palette();
    edges.forEach((edge) => {
      const a = nodeById.get(edge.a);
      const b = nodeById.get(edge.b);
      if (!a || !b) return;
      const live = matchesFilter(edge.themes);
      const hot = hoverId === edge.a || hoverId === edge.b || selectedId === edge.a || selectedId === edge.b;
      const themeId = filter !== 'all' && edge.themes.indexOf(filter) !== -1 ? filter : edge.themes[0];
      const color = THEME_COLOR[themeId] || pal.copper;
      const path = pcbPath(a.x, a.y, b.x, b.y);
      const pts = path.map((p) => worldToScreen(p.x, p.y));

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = live ? (hot ? 1 : 0.82) : 0.12;
      ctx.strokeStyle = color;
      ctx.shadowColor = live ? color : 'transparent';
      ctx.shadowBlur = live && !prefersReduced ? (hot ? 16 : 10) : 0;
      ctx.lineWidth = live ? (hot ? 2.8 : 2.2) : 1.2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      if (live && !prefersReduced) {
        const pulse = (now / 1800) % 1;
        const segs = [];
        for (let i = 1; i < pts.length; i += 1) {
          const dx = pts[i].x - pts[i - 1].x;
          const dy = pts[i].y - pts[i - 1].y;
          segs.push({ x: pts[i - 1].x, y: pts[i - 1].y, dx: dx, dy: dy, len: Math.hypot(dx, dy) });
        }
        const total = segs.reduce((s, g) => s + g.len, 0);
        if (total > 8) {
          let dist = pulse * total;
          for (let i = 0; i < segs.length; i += 1) {
            if (dist <= segs[i].len) {
              const t = segs[i].len ? dist / segs[i].len : 0;
              const px = segs[i].x + segs[i].dx * t;
              const py = segs[i].y + segs[i].dy * t;
              ctx.fillStyle = '#fff6ea';
              ctx.beginPath();
              ctx.arc(px, py, 2.4, 0, Math.PI * 2);
              ctx.fill();
              break;
            }
            dist -= segs[i].len;
          }
        }
      }

      pts.slice(1, -1).forEach((p) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    });
  }

  function drawConstellationNames() {
    if (cam.scale < 0.55) return;
    THEMES.forEach((theme) => {
      if (filter !== 'all' && filter !== theme.id) return;
      const members = nodes.filter((n) => n.themes.indexOf(theme.id) !== -1);
      if (members.length < 2) return;
      let x = 0;
      let y = 0;
      members.forEach((n) => {
        x += n.x;
        y += n.y;
      });
      const p = worldToScreen(x / members.length, y / members.length - 36);
      ctx.save();
      ctx.globalAlpha = filter === theme.id ? 0.8 : 0.28;
      ctx.fillStyle = THEME_COLOR[theme.id];
      ctx.font = '700 11px "IBM Plex Mono", ui-monospace, monospace';
      ctx.letterSpacing = '0.18em';
      ctx.textAlign = 'center';
      ctx.fillText(theme.label.toUpperCase(), p.x, p.y);
      ctx.restore();
    });
  }

  function draw(now) {
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, viewW, viewH);
    drawGrid();
    drawStars(now);
    drawTraces(now);
    drawConstellationNames();
  }

  let last = performance.now();
  function loop(now) {
    if (!running) return;
    const dt = Math.min(32, now - last);
    last = now;
    const animating = Boolean(tween) || !prefersReduced;
    if (animating || dirty) {
      stepTween(dt);
      draw(now);
      dirty = Boolean(tween);
    }
    raf = window.requestAnimationFrame(loop);
  }

  function setRunning(on) {
    if (on) {
      if (running && raf) return;
      running = true;
      last = performance.now();
      dirty = true;
      raf = window.requestAnimationFrame(loop);
      return;
    }
    running = false;
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function updateReadouts() {
    const visibleEdges = edges.filter((e) => matchesFilter(e.themes));
    if (readout.nodes) readout.nodes.textContent = String(nodes.length);
    if (readout.traces) readout.traces.textContent = String(visibleEdges.length);
    if (readout.net) readout.net.textContent = filter === 'all' ? 'ALL' : filter.toUpperCase();
  }

  function setHudPlaceholder() {
    if (!hud.root) return;
    hud.root.classList.add('is-idle');
    if (hud.kicker) hud.kicker.textContent = 'Probe idle';
    if (hud.title) hud.title.textContent = 'Pick a pad on the chart.';
    if (hud.summary) {
      hud.summary.textContent = 'Hover or tab a star to read the build. Click through for the full log.';
    }
    if (hud.tags) hud.tags.innerHTML = '';
    if (hud.open) hud.open.removeAttribute('href');
  }

  function showHud(node) {
    if (!hud.root || !node) return;
    hud.root.classList.remove('is-idle');
    if (hud.kicker) {
      hud.kicker.textContent = (node.year || '') + (node.status ? ' · ' + node.status : '');
    }
    if (hud.title) hud.title.textContent = node.title;
    if (hud.summary) hud.summary.textContent = node.summary || '';
    if (hud.tags) {
      hud.tags.innerHTML = '';
      (node.tags || []).forEach((tag) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = tag;
        hud.tags.appendChild(chip);
      });
    }
    if (hud.open) {
      hud.open.href = node.url;
      hud.open.textContent = 'Open the build log →';
    }
  }

  function selectNode(id, opts) {
    selectedId = id;
    const node = nodeById.get(id);
    document.querySelectorAll('.cnode').forEach((el) => {
      el.classList.toggle('is-hot', el.dataset.id === id);
    });
    document.querySelectorAll('[data-sky-index]').forEach((el) => {
      el.classList.toggle('is-hot', el.getAttribute('data-sky-index') === id);
    });
    if (node) {
      showHud(node);
      if (opts && opts.pan) {
        tweenCamera({ x: node.x, y: node.y, scale: clamp(Math.max(cam.scale, 1.15), SCALE_MIN, 2.1) });
      }
    } else {
      setHudPlaceholder();
    }
  }

  function applyFilter(next) {
    filter = next;
    document.querySelectorAll('[data-sky-filter]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-sky-filter') === next);
    });
    document.querySelectorAll('.cnode').forEach((el) => {
      const node = nodeById.get(el.dataset.id);
      const dim = node && !matchesFilter(node.themes);
      el.classList.toggle('is-dim', Boolean(dim));
    });
    updateReadouts();
    dirty = true;
  }

  function mountNodes() {
    const frag = document.createDocumentFragment();
    nodes.forEach((node) => {
      const link = document.createElement('a');
      link.className = 'cnode';
      link.href = node.url;
      link.dataset.id = node.id;
      link.style.setProperty('--x', String(node.x));
      link.style.setProperty('--y', String(node.y));
      link.style.setProperty('--node', node.color);
      link.setAttribute('aria-label', node.title + '. ' + (node.summary || ''));
      const pad = document.createElement('span');
      pad.className = 'cnode__pad';
      pad.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'cnode__label';
      label.textContent = node.short;
      link.appendChild(pad);
      link.appendChild(label);
      link.addEventListener('pointerenter', () => {
        hoverId = node.id;
        dirty = true;
        if (!coarsePointer) showHud(node);
      });
      link.addEventListener('pointerleave', () => {
        if (hoverId === node.id) hoverId = null;
        dirty = true;
        if (!coarsePointer) {
          if (selectedId) {
            const sel = nodeById.get(selectedId);
            if (sel) showHud(sel);
          } else {
            setHudPlaceholder();
          }
        }
      });
      link.addEventListener('focus', () => selectNode(node.id, { pan: false }));
      link.addEventListener('click', (event) => {
        if (drag && drag.moved) {
          event.preventDefault();
          return;
        }
        if (coarsePointer && selectedId !== node.id) {
          event.preventDefault();
          selectNode(node.id, { pan: true });
        }
      });
      frag.appendChild(link);
    });
    worldEl.appendChild(frag);
  }

  function pointerPos(event) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinch = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        scale: cam.scale,
      };
      drag = null;
      return;
    }
    const local = pointerPos(event);
    drag = { x: event.clientX, y: event.clientY, sx: local.x, sy: local.y, moved: false };
  });

  stage.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2 && pinch) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.dist > 8) {
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const local = { x: mid.x - stage.getBoundingClientRect().left, y: mid.y - stage.getBoundingClientRect().top };
        const factor = dist / pinch.dist;
        const target = clamp(pinch.scale * factor, SCALE_MIN, SCALE_MAX);
        zoomAt(local.x, local.y, target / cam.scale);
      }
      return;
    }
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (drag.moved) {
      panBy(dx, dy);
      drag.x = event.clientX;
      drag.y = event.clientY;
    }
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) drag = null;
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const local = pointerPos(event);
      const factor = event.deltaY > 0 ? 0.92 : 1.09;
      zoomAt(local.x, local.y, factor);
    },
    { passive: false }
  );

  stage.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 90 : 48;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      panBy(step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      panBy(-step, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      panBy(0, step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      panBy(0, -step);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomAt(viewW / 2, viewH / 2, 1.12);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomAt(viewW / 2, viewH / 2, 0.9);
    } else if (event.key === '0' || event.key === 'Home') {
      event.preventDefault();
      fit(true);
    } else if (event.key === 'Escape') {
      selectNode(null);
    }
  });

  document.querySelectorAll('[data-sky-filter]').forEach((btn) => {
    btn.addEventListener('click', () => applyFilter(btn.getAttribute('data-sky-filter')));
  });

  const fitBtn = document.querySelector('[data-sky-fit]');
  const zoomInBtn = document.querySelector('[data-sky-zoom-in]');
  const zoomOutBtn = document.querySelector('[data-sky-zoom-out]');
  if (fitBtn) fitBtn.addEventListener('click', () => fit(true));
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomAt(viewW / 2, viewH / 2, 1.14));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomAt(viewW / 2, viewH / 2, 0.88));

  document.querySelectorAll('[data-sky-index]').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      const id = el.getAttribute('data-sky-index');
      const node = nodeById.get(id);
      if (node && !coarsePointer) showHud(node);
    });
    el.addEventListener('pointerleave', () => {
      if (!coarsePointer) {
        if (selectedId) {
          const sel = nodeById.get(selectedId);
          if (sel) showHud(sel);
        } else {
          setHudPlaceholder();
        }
      }
    });
    el.addEventListener('focus', () => {
      const id = el.getAttribute('data-sky-index');
      selectNode(id, { pan: true });
    });
  });

  window.addEventListener('themechange', () => draw(performance.now()));
  window.addEventListener('resize', () => {
    resize();
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setRunning(entry.isIntersecting));
      },
      { threshold: 0.05 }
    );
    io.observe(stage);
  }

  document.addEventListener('visibilitychange', () => {
    setRunning(!document.hidden);
  });

  mountNodes();
  resize();
  fit(false);
  setHudPlaceholder();
  updateReadouts();
  applyFilter('all');

  const hash = (location.hash || '').replace('#', '');
  if (hash && nodeById.has(hash)) {
    selectNode(hash, { pan: true });
  }

  setRunning(true);
})();
