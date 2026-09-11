(function () {
  'use strict';

  const VB = { w: 1600, h: 900 };
  const NS = 'http://www.w3.org/2000/svg';

  /* Hand-placed pads — percentages would drift; this is the silkscreen. */
  const LAYOUT = {
    'delta-3d-printer': { x: 210, y: 205 },
    'golf-ball-printer': { x: 405, y: 300 },
    'kali-macbook': { x: 730, y: 155 },
    'virtual-ball-rack': { x: 1345, y: 175 },
    'retro-pi': { x: 195, y: 495 },
    'guppy': { x: 475, y: 565 },
    'pi-pentester': { x: 805, y: 395 },
    'laser-timing-gates': { x: 1135, y: 545 },
    'caesar-cipher': { x: 255, y: 765 },
    'quantum-random-number-generator': { x: 545, y: 805 },
  };

  const SHORT = {
    'delta-3d-printer': 'Delta Printer',
    'golf-ball-printer': 'Golf Printer',
    'kali-macbook': 'Kali MacBook',
    'virtual-ball-rack': 'Ball Rack',
    'retro-pi': 'Retro Pi',
    'guppy': 'Guppy',
    'pi-pentester': 'Pi-Pentester',
    'laser-timing-gates': 'OpenPage',
    'caesar-cipher': 'Caesar Cipher',
    'quantum-random-number-generator': 'QRNG',
  };

  const CLUSTER_ART = {
    'Fab Bench': { x: 168, y: 92, rotate: -6 },
    'Security Trace': { x: 640, y: 62, rotate: 3 },
    'The Fairway': { x: 1235, y: 70, rotate: 5 },
    'Pi Nebula': { x: 148, y: 392, rotate: -8 },
    'Night Page': { x: 1095, y: 428, rotate: 4 },
    'Crypto Loop': { x: 175, y: 678, rotate: -4 },
  };

  const TAG_CLUSTER = [
    { tag: 'Golf', name: 'The Fairway' },
    { tag: 'Raspberry Pi', name: 'Pi Nebula' },
    { tag: 'Security', name: 'Security Trace' },
    { tag: '3D Printing', name: 'Fab Bench' },
    { tag: 'CAD', name: 'Fab Bench' },
    { tag: 'Cryptography', name: 'Crypto Loop' },
    { tag: 'AI', name: 'Night Page' },
  ];

  function prefersReduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function finePointer() {
    return window.matchMedia('(pointer: fine)').matches;
  }

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v || fallback).trim();
  }

  function svg(name, attrs) {
    const el = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== undefined && attrs[k] !== null) {
          el.setAttribute(k, String(attrs[k]));
        }
      });
    }
    return el;
  }

  function loadData() {
    const el = document.getElementById('sky-data');
    if (!el) return [];
    try {
      const data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  }

  function hasTag(project, tag) {
    return (project.tags || []).some(function (t) {
      return String(t).toLowerCase() === tag.toLowerCase();
    });
  }

  function inferCluster(project) {
    if (project.constellation) return project.constellation;
    for (let i = 0; i < TAG_CLUSTER.length; i++) {
      if (hasTag(project, TAG_CLUSTER[i].tag)) return TAG_CLUSTER[i].name;
    }
    return 'Loose Solder';
  }

  function isHot(project) {
    const s = (project.status || '').toLowerCase();
    return s.indexOf('progress') !== -1 || s.indexOf('wip') !== -1;
  }

  function edgeKey(a, b) {
    return a < b ? a + '::' + b : b + '::' + a;
  }

  function buildModel(raw) {
    const nodes = raw.map(function (p, i) {
      const laid = LAYOUT[p.id] || {};
      return {
        id: p.id,
        title: p.title,
        short: SHORT[p.id] || p.title,
        url: p.url,
        summary: p.summary || '',
        status: p.status || '',
        date: p.date,
        year: Number(p.year) || 0,
        tags: p.tags || [],
        cluster: inferCluster(p),
        links: p.links || [],
        hero: p.hero || '',
        hot: isHot(p),
        ref: 'U' + (i + 1),
        x: laid.x,
        y: laid.y,
      };
    });

    /* New pads without a hand placement: park them near their cluster. */
    const byCluster = {};
    nodes.forEach(function (n) {
      (byCluster[n.cluster] || (byCluster[n.cluster] = [])).push(n);
    });
    Object.keys(byCluster).forEach(function (name) {
      const art = CLUSTER_ART[name] || { x: 800, y: 450 };
      const group = byCluster[name];
      group.forEach(function (n, idx) {
        if (n.x && n.y) return;
        n.x = art.x + 90 + (idx % 3) * 110;
        n.y = art.y + 80 + Math.floor(idx / 3) * 90;
      });
    });

    const edges = {};
    function addEdge(a, b, kind) {
      if (!a || !b || a === b) return;
      const key = edgeKey(a, b);
      if (!edges[key]) edges[key] = { a: a, b: b, kind: kind };
    }

    nodes.forEach(function (n) {
      (n.links || []).forEach(function (other) {
        addEdge(n.id, other, 'link');
      });
    });

    Object.keys(byCluster).forEach(function (name) {
      const group = byCluster[name].slice().sort(function (a, b) {
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      });
      for (let i = 1; i < group.length; i++) {
        addEdge(group[i - 1].id, group[i].id, 'cluster');
      }
    });

    return { nodes: nodes, edges: Object.keys(edges).map(function (k) { return edges[k]; }), byCluster: byCluster };
  }

  function copperPath(a, b, index) {
    const jog = ((index % 5) - 2) * 22;
    const midX = Math.round((a.x + b.x) / 2 + jog);
    if (Math.abs(a.y - b.y) < 16) {
      return 'M ' + a.x + ' ' + a.y + ' H ' + b.x;
    }
    if (Math.abs(a.x - b.x) < 16) {
      return 'M ' + a.x + ' ' + a.y + ' V ' + b.y;
    }
    return 'M ' + a.x + ' ' + a.y + ' H ' + midX + ' V ' + b.y + ' H ' + b.x;
  }

  function hullPath(members) {
    if (members.length === 1) {
      const p = members[0];
      const r = 78;
      return 'M ' + (p.x - r) + ' ' + p.y +
        ' a ' + r + ' ' + r + ' 0 1 0 ' + r * 2 + ' 0' +
        ' a ' + r + ' ' + r + ' 0 1 0 ' + -r * 2 + ' 0';
    }
    const cx = members.reduce(function (s, n) { return s + n.x; }, 0) / members.length;
    const cy = members.reduce(function (s, n) { return s + n.y; }, 0) / members.length;
    const sorted = members.slice().sort(function (a, b) {
      return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
    });
    const pad = 70;
    const pts = sorted.map(function (n) {
      const dx = n.x - cx;
      const dy = n.y - cy;
      const len = Math.max(Math.hypot(dx, dy), 1);
      return { x: n.x + (dx / len) * pad, y: n.y + (dy / len) * pad };
    });
    return pts.map(function (p, i) {
      return (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }).join(' ') + ' Z';
  }

  function yearTicks(nodes) {
    const years = {};
    nodes.forEach(function (n) { years[n.year] = true; });
    return Object.keys(years).map(Number).sort(function (a, b) { return a - b; });
  }

  function renderBoard(svgRoot, model) {
    svgRoot.replaceChildren();
    const reduced = prefersReduced();
    const gBoard = svg('g', { class: 'sky-layer-board', 'aria-hidden': 'true' });
    gBoard.appendChild(svg('rect', { class: 'sky-edge', x: 28, y: 22, width: 1544, height: 856, rx: 22 }));
    gBoard.appendChild(svg('rect', { class: 'sky-keepout', x: 48, y: 42, width: 1504, height: 816, rx: 16 }));

    [{ x: 58, y: 52 }, { x: 1542, y: 52 }, { x: 58, y: 848 }, { x: 1542, y: 848 }].forEach(function (h) {
      gBoard.appendChild(svg('circle', { class: 'sky-hole', cx: h.x, cy: h.y, r: 11 }));
    });
    [{ x: 96, y: 88 }, { x: 1504, y: 88 }].forEach(function (f) {
      const g = svg('g', { class: 'sky-fiducial' });
      g.appendChild(svg('circle', { cx: f.x, cy: f.y, r: 8 }));
      g.appendChild(svg('circle', { cx: f.x, cy: f.y, r: 2.2 }));
      gBoard.appendChild(g);
    });

    for (let x = 90; x < 1520; x += 48) {
      for (let y = 90; y < 820; y += 48) {
        const busy = model.nodes.some(function (n) {
          return Math.hypot(n.x - x, n.y - y) < 52;
        });
        if (busy || ((x + y) / 48) % 3 !== 0) continue;
        gBoard.appendChild(svg('circle', { class: 'sky-via', cx: x, cy: y, r: 2.1 }));
      }
    }

    const busY = 858;
    const years = yearTicks(model.nodes);
    const minY = years[0] || 2019;
    const maxY = years[years.length - 1] || 2026;
    const x0 = 160;
    const x1 = 1180;
    gBoard.appendChild(svg('line', { class: 'sky-year-bus', x1: x0, y1: busY, x2: x1, y2: busY }));
    years.forEach(function (year) {
      const t = maxY === minY ? 0.5 : (year - minY) / (maxY - minY);
      const x = x0 + t * (x1 - x0);
      gBoard.appendChild(svg('line', { class: 'sky-year-tick', x1: x, y1: busY - 7, x2: x, y2: busY + 7 }));
      const label = svg('text', { class: 'sky-year-label', x: x, y: busY + 22, 'text-anchor': 'middle' });
      label.textContent = String(year);
      gBoard.appendChild(label);
    });

    const title = svg('g', { transform: 'translate(1224 778)' });
    title.appendChild(svg('rect', { class: 'sky-titleblock', x: 0, y: 0, width: 316, height: 78, rx: 6 }));
    const t1 = svg('text', { class: 'sky-titleblock__name', x: 14, y: 24 });
    t1.textContent = 'BLAHA LABS  ·  CONSTELLATION';
    const t2 = svg('text', { class: 'sky-titleblock__text', x: 14, y: 44 });
    t2.textContent = 'REV C47  ·  AFTER HOURS  ·  SHEET 1/1';
    const t3 = svg('text', { class: 'sky-titleblock__text', x: 14, y: 64 });
    t3.textContent = 'PADS ' + model.nodes.length + '  ·  TRACES ' + model.edges.length + '  ·  FR4';
    title.appendChild(t1);
    title.appendChild(t2);
    title.appendChild(t3);
    gBoard.appendChild(title);

    svgRoot.appendChild(gBoard);

    const gSilk = svg('g', { class: 'sky-layer-silk', 'aria-hidden': 'true' });
    Object.keys(model.byCluster).forEach(function (name) {
      const members = model.byCluster[name];
      const hull = svg('path', {
        class: 'sky-silk',
        d: hullPath(members),
        'data-cluster': name,
      });
      gSilk.appendChild(hull);
      const art = CLUSTER_ART[name];
      if (art) {
        const text = svg('text', {
          class: 'sky-cluster-name',
          x: art.x,
          y: art.y,
          transform: 'rotate(' + art.rotate + ' ' + art.x + ' ' + art.y + ')',
          'data-cluster': name,
        });
        text.textContent = name;
        gSilk.appendChild(text);
      }
    });
    svgRoot.appendChild(gSilk);

    const nodeById = {};
    model.nodes.forEach(function (n) { nodeById[n.id] = n; });

    const gTraces = svg('g', { class: 'sky-layer-traces', 'aria-hidden': 'true' });
    model.edges.forEach(function (e, i) {
      const a = nodeById[e.a];
      const b = nodeById[e.b];
      if (!a || !b) return;
      const d = copperPath(a, b, i);
      const path = svg('path', {
        class: 'sky-trace' + (reduced ? '' : ' is-draw'),
        d: d,
        'data-a': e.a,
        'data-b': e.b,
      });
      gTraces.appendChild(path);
      if (!reduced) {
        requestAnimationFrame(function () {
          try {
            const len = Math.ceil(path.getTotalLength());
            path.style.setProperty('--len', String(len));
          } catch (err) { /* empty path */ }
        });
      }
    });
    svgRoot.appendChild(gTraces);

    const gElectrons = svg('g', { class: 'sky-layer-electrons', 'aria-hidden': 'true' });
    svgRoot.appendChild(gElectrons);

    const gPads = svg('g', { class: 'sky-layer-pads' });
    model.nodes.forEach(function (n) {
      const labelY = n.y > 760 ? n.y - 36 : n.y + 38;
      const cls = 'sky-pad' + (n.hot ? ' is-hot' : ' is-shipped');
      const a = svg('a', {
        class: cls,
        href: n.url,
        id: 'pad-' + n.id,
        'data-id': n.id,
        'data-cluster': n.cluster,
        'aria-label': n.title + ', ' + (n.status || 'logged') + ', ' + n.cluster + ', ' + n.year + '. ' + n.summary,
      });
      a.appendChild(svg('circle', { class: 'sky-pad__glow', cx: n.x, cy: n.y, r: 28 }));
      a.appendChild(svg('circle', { class: 'sky-pad__ring', cx: n.x, cy: n.y, r: 14 }));
      a.appendChild(svg('circle', { class: 'sky-pad__via', cx: n.x, cy: n.y, r: 5 }));
      a.appendChild(svg('circle', { class: 'sky-pad__hit', cx: n.x, cy: n.y, r: 28 }));
      const ref = svg('text', { class: 'sky-pad__ref', x: n.x, y: n.y - 22 });
      ref.textContent = n.ref;
      a.appendChild(ref);
      const label = svg('text', { class: 'sky-pad__label', x: n.x, y: labelY });
      label.textContent = n.short;
      a.appendChild(label);
      gPads.appendChild(a);
    });
    svgRoot.appendChild(gPads);

    const probe = svg('g', { class: 'sky-probe is-off' });
    probe.appendChild(svg('line', { x1: -10, y1: 0, x2: 10, y2: 0 }));
    probe.appendChild(svg('line', { x1: 0, y1: -10, x2: 0, y2: 10 }));
    probe.appendChild(svg('circle', { r: 3 }));
    svgRoot.appendChild(probe);

    return { nodeById: nodeById, probe: probe, electrons: gElectrons };
  }

  function initStars(canvas) {
    if (!canvas) return { stop: function () {}, resize: function () {} };
    const ctx = canvas.getContext('2d');
    const reduced = prefersReduced();
    let stars = [];
    let raf = 0;
    let running = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(rect.width, rect.height);
    }

    function seed(w, h) {
      const count = Math.round((w * h) / 14000);
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.3 + 0.3,
          a: Math.random() * 0.6 + 0.15,
          s: Math.random() * 0.8 + 0.2,
          p: Math.random() * Math.PI * 2,
        });
      }
    }

    function color() {
      const dark = document.documentElement.getAttribute('data-theme') !== 'light';
      return dark ? cssVar('--ink', '#f3ead8') : cssVar('--copper', '#8a5a2b');
    }

    function frame(now) {
      if (!running) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const dark = document.documentElement.getAttribute('data-theme') !== 'light';
      if (!dark) {
        raf = requestAnimationFrame(frame);
        return;
      }
      ctx.fillStyle = color();
      stars.forEach(function (st) {
        const tw = reduced ? st.a : st.a * (0.65 + 0.35 * Math.sin(now / 900 * st.s + st.p));
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);

    return {
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
      },
      resize: resize,
    };
  }

  function initSky(root) {
    const svgRoot = root.querySelector('#sky-svg');
    const board = root.querySelector('[data-sky-board]');
    const card = root.querySelector('#sky-card');
    const filterHost = root.querySelector('.sky-toolbar__filters');
    const canvas = root.querySelector('#sky-stars');
    if (!svgRoot || !board) return;

    const model = buildModel(loadData());
    if (!model.nodes.length) return;

    const bits = renderBoard(svgRoot, model);
    const stars = initStars(canvas);
    const cardBits = {
      kicker: card.querySelector('[data-sky-card-kicker]'),
      title: card.querySelector('[data-sky-card-title]'),
      meta: card.querySelector('[data-sky-card-meta]'),
      summary: card.querySelector('[data-sky-card-summary]'),
      go: card.querySelector('[data-sky-card-go]'),
    };

    let selected = null;
    let filter = 'all';
    let electronRaf = 0;
    const electrons = [];

    const clusters = Object.keys(model.byCluster).sort();
    clusters.forEach(function (name) {
      const btn = document.createElement('button');
      btn.className = 'filter__btn';
      btn.type = 'button';
      btn.setAttribute('data-sky-filter', name);
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = name;
      filterHost.appendChild(btn);
    });

    root.querySelectorAll('[data-sky-index]').forEach(function (link) {
      const id = link.getAttribute('data-sky-index');
      const node = bits.nodeById[id];
      if (!node) return;
      const ref = link.querySelector('.sky-index__ref');
      if (ref) ref.textContent = node.ref;
    });

    function applyFilter() {
      const pads = svgRoot.querySelectorAll('.sky-pad');
      const traces = svgRoot.querySelectorAll('.sky-trace');
      const silks = svgRoot.querySelectorAll('[data-cluster]');
      pads.forEach(function (pad) {
        const on = filter === 'all' || pad.getAttribute('data-cluster') === filter;
        pad.classList.toggle('is-dim', !on);
      });
      traces.forEach(function (tr) {
        const a = bits.nodeById[tr.getAttribute('data-a')];
        const b = bits.nodeById[tr.getAttribute('data-b')];
        const on = filter === 'all' || (a && a.cluster === filter) || (b && b.cluster === filter);
        tr.classList.toggle('is-dim', !on);
      });
      silks.forEach(function (el) {
        const on = filter === 'all' || el.getAttribute('data-cluster') === filter;
        el.style.opacity = on ? '' : '0.12';
      });
      root.querySelectorAll('.sky-index__item').forEach(function (item) {
        const link = item.querySelector('[data-sky-index]');
        const id = link && link.getAttribute('data-sky-index');
        const node = bits.nodeById[id];
        const on = filter === 'all' || (node && node.cluster === filter);
        item.classList.toggle('is-dim', !on);
      });
    }

    function placeCard(node) {
      if (!card || !node) return;
      card.hidden = false;
      cardBits.kicker.textContent = (node.hot ? 'On the iron · ' : '') + node.cluster;
      cardBits.title.textContent = node.title;
      cardBits.meta.textContent = [node.year, node.status, (node.tags || []).join(' · ')].filter(Boolean).join(' · ');
      cardBits.summary.textContent = node.summary;
      cardBits.go.href = node.url;

      const pad = svgRoot.querySelector('#pad-' + node.id);
      const boardRect = board.getBoundingClientRect();
      const padRect = pad ? pad.getBoundingClientRect() : boardRect;
      if (window.matchMedia('(max-width: 720px)').matches) {
        card.style.left = '';
        card.style.top = '';
        card.style.bottom = '';
        return;
      }
      card.style.bottom = 'auto';
      let left = padRect.left - boardRect.left + padRect.width / 2 + 18;
      let top = padRect.top - boardRect.top - 12;
      const cw = card.offsetWidth || 300;
      const ch = card.offsetHeight || 180;
      if (left + cw > boardRect.width - 12) left = padRect.left - boardRect.left - cw - 8;
      if (left < 12) left = 12;
      if (top + ch > boardRect.height - 16) top = boardRect.height - ch - 16;
      if (top < 12) top = 12;
      card.style.left = left + 'px';
      card.style.top = top + 'px';
    }

    function clearElectrons() {
      cancelAnimationFrame(electronRaf);
      electrons.length = 0;
      bits.electrons.replaceChildren();
      svgRoot.querySelectorAll('.sky-trace.is-hot').forEach(function (tr) {
        tr.classList.remove('is-hot');
      });
    }

    function runElectrons(id) {
      clearElectrons();
      if (prefersReduced()) return;
      const traces = svgRoot.querySelectorAll('.sky-trace');
      traces.forEach(function (tr) {
        if (tr.getAttribute('data-a') !== id && tr.getAttribute('data-b') !== id) return;
        tr.classList.add('is-hot');
        const dot = svg('circle', { class: 'sky-electron', r: 3.2 });
        bits.electrons.appendChild(dot);
        electrons.push({ path: tr, dot: dot, t: Math.random(), dir: 1 });
      });
      const tick = function () {
        electrons.forEach(function (el) {
          const len = el.path.getTotalLength();
          if (!len) return;
          el.t += 0.008 * el.dir;
          if (el.t > 1) { el.t = 1; el.dir = -1; }
          if (el.t < 0) { el.t = 0; el.dir = 1; }
          const pt = el.path.getPointAtLength(el.t * len);
          el.dot.setAttribute('cx', pt.x);
          el.dot.setAttribute('cy', pt.y);
        });
        electronRaf = requestAnimationFrame(tick);
      };
      if (electrons.length) electronRaf = requestAnimationFrame(tick);
    }

    function select(node, opts) {
      opts = opts || {};
      selected = node;
      svgRoot.querySelectorAll('.sky-pad').forEach(function (pad) {
        pad.classList.toggle('is-on', pad.getAttribute('data-id') === node.id);
      });
      root.querySelectorAll('.sky-index__item').forEach(function (item) {
        const link = item.querySelector('[data-sky-index]');
        item.classList.toggle('is-on', link && link.getAttribute('data-sky-index') === node.id);
      });
      placeCard(node);
      runElectrons(node.id);
      if (opts.hash !== false) {
        history.replaceState(null, '', '#pad-' + node.id);
      }
    }

    function deselect() {
      selected = null;
      svgRoot.querySelectorAll('.sky-pad.is-on').forEach(function (pad) {
        pad.classList.remove('is-on');
      });
      root.querySelectorAll('.sky-index__item.is-on').forEach(function (item) {
        item.classList.remove('is-on');
      });
      if (card) card.hidden = true;
      clearElectrons();
    }

    svgRoot.querySelectorAll('a.sky-pad').forEach(function (pad) {
      const id = pad.getAttribute('data-id');
      const node = bits.nodeById[id];
      pad.addEventListener('pointerenter', function () {
        if (!finePointer()) return;
        select(node, { hash: false });
      });
      pad.addEventListener('focus', function () {
        select(node, { hash: false });
      });
      pad.addEventListener('click', function (e) {
        if (!finePointer() && selected && selected.id !== node.id) {
          e.preventDefault();
          select(node);
        }
      });
    });

    board.addEventListener('pointerleave', function (e) {
      bits.probe.classList.add('is-off');
      if (!finePointer()) return;
      if (e.relatedTarget && board.contains(e.relatedTarget)) return;
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.sky-pad')) return;
      deselect();
    });

    board.addEventListener('pointermove', function (e) {
      if (!finePointer() || prefersReduced()) {
        bits.probe.classList.add('is-off');
        return;
      }
      const rect = svgRoot.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * VB.w;
      const y = ((e.clientY - rect.top) / rect.height) * VB.h;
      bits.probe.classList.remove('is-off');
      bits.probe.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
    });

    filterHost.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-sky-filter]');
      if (!btn) return;
      filter = btn.getAttribute('data-sky-filter');
      filterHost.querySelectorAll('.filter__btn').forEach(function (b) {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyFilter();
    });

    function focusFromHash() {
      const hash = (location.hash || '').replace('#pad-', '');
      if (!hash || !bits.nodeById[hash]) return;
      const pad = svgRoot.querySelector('#pad-' + hash);
      select(bits.nodeById[hash], { hash: false });
      if (pad && pad.focus) pad.focus({ preventScroll: true });
    }

    window.addEventListener('hashchange', focusFromHash);
    window.addEventListener('resize', function () {
      stars.resize();
      if (selected) placeCard(selected);
    });
    window.addEventListener('themechange', function () {
      stars.resize();
    });

    focusFromHash();
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    const root = document.querySelector('[data-sky]');
    if (root) initSky(root);
  });
})();
