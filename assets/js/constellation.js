(function () {
  'use strict';

  const root = document.querySelector('[data-constellation]');
  const stage = document.getElementById('sky-stage');
  const board = document.getElementById('skyboard');
  const dataEl = document.getElementById('constellation-data');
  if (!root || !stage || !dataEl) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const VB = { w: 1200, h: 720, x0: 96, y0: 96, x1: 1104, y1: 560 };

  const PIN = {
    'retro-pi': [0.08, 0.34],
    'delta-3d-printer': [0.16, 0.68],
    'kali-macbook': [0.3, 0.86],
    'golf-ball-printer': [0.3, 0.5],
    'caesar-cipher': [0.46, 0.16],
    'quantum-random-number-generator': [0.56, 0.12],
    'guppy': [0.58, 0.44],
    'pi-pentester': [0.5, 0.78],
    'laser-timing-gates': [0.78, 0.32],
    'virtual-ball-rack': [0.88, 0.7],
  };

  const SILK = {
    'retro-pi': 'RETRO PI',
    'delta-3d-printer': 'DELTA',
    'kali-macbook': 'KALI MBP',
    'golf-ball-printer': 'BALL PRT',
    'caesar-cipher': 'CAESAR',
    'quantum-random-number-generator': 'QRNG',
    'guppy': 'GUPPY',
    'pi-pentester': 'PENTEST',
    'laser-timing-gates': 'OPENPAGE',
    'virtual-ball-rack': 'BALL RACK',
  };

  const FAMILY_Y = [
    { keys: ['quantum', 'cryptography'], y: 0.12 },
    { keys: ['ai', 'ux', 'embedded'], y: 0.32 },
    { keys: ['raspberry pi', 'hardware'], y: 0.46 },
    { keys: ['3d printing', 'cad'], y: 0.62 },
    { keys: ['golf', 'web'], y: 0.72 },
    { keys: ['security', 'linux'], y: 0.86 },
  ];

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function svg(name, attrs) {
    const el = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, String(attrs[k]));
    });
    return el;
  }

  function mapX(n) {
    return VB.x0 + n * (VB.x1 - VB.x0);
  }
  function mapY(n) {
    return VB.y0 + n * (VB.y1 - VB.y0);
  }

  function familyY(tags) {
    const t = (tags || []).map(function (x) {
      return String(x).toLowerCase();
    });
    for (let i = 0; i < FAMILY_Y.length; i++) {
      if (FAMILY_Y[i].keys.some(function (k) { return t.indexOf(k) !== -1; })) return FAMILY_Y[i].y;
    }
    return 0.5;
  }

  function isWip(status) {
    const s = String(status || '').toLowerCase();
    return s.indexOf('progress') !== -1 || s.indexOf('wip') !== -1;
  }

  function silkName(p) {
    if (SILK[p.id]) return SILK[p.id];
    const raw = String(p.title || p.id).replace(/^DIY\s+/i, '');
    return raw.slice(0, 12).toUpperCase();
  }

  function layout(projects) {
    const times = projects.map(function (p) { return Date.parse(p.date) || 0; });
    const tMin = Math.min.apply(null, times);
    const tMax = Math.max.apply(null, times);
    const nodes = projects.map(function (p, i) {
      let nx;
      let ny;
      if (PIN[p.id]) {
        nx = PIN[p.id][0];
        ny = PIN[p.id][1];
      } else {
        nx = 0.08 + 0.84 * ((times[i] - tMin) / (tMax - tMin || 1));
        ny = familyY(p.tags) + (hash(p.id) - 0.5) * 0.08;
      }
      return {
        id: p.id,
        title: p.title,
        url: p.url,
        summary: p.summary || '',
        status: p.status || '',
        date: p.date,
        year: p.year,
        label: p.label,
        tags: p.tags || [],
        tagSlugs: (p.tags || []).map(slugify),
        links: p.links || [],
        hero: p.hero || '',
        silk: silkName(p),
        nx: nx,
        ny: Math.max(0.04, Math.min(0.96, ny)),
        x: 0,
        y: 0,
        ref: 'U' + (i + 1),
        wip: isWip(p.status),
      };
    });

    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].nx - nodes[j].nx;
          const dy = nodes[i].ny - nodes[j].ny;
          const d2 = dx * dx + dy * dy;
          if (d2 < 0.018 && d2 > 0) {
            const d = Math.sqrt(d2);
            const push = (0.14 - d) * 0.5;
            nodes[j].ny = Math.max(0.04, Math.min(0.96, nodes[j].ny + (dy / d) * -push));
            nodes[i].ny = Math.max(0.04, Math.min(0.96, nodes[i].ny + (dy / d) * push));
          }
        }
      }
    }

    nodes.forEach(function (n) {
      n.x = mapX(n.nx);
      n.y = mapY(n.ny);
    });
    return nodes;
  }

  function edgeKey(a, b) {
    return a < b ? a + '|' + b : b + '|' + a;
  }

  function buildEdges(nodes) {
    const byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    const map = {};

    function add(a, b, kind, tag) {
      if (!a || !b || a === b || !byId[a] || !byId[b]) return;
      const key = edgeKey(a, b);
      if (!map[key]) map[key] = { a: a, b: b, kinds: {}, tags: [] };
      map[key].kinds[kind] = true;
      if (tag && map[key].tags.indexOf(tag) === -1) map[key].tags.push(tag);
    }

    const tagSets = {};
    nodes.forEach(function (n) {
      n.tags.forEach(function (tag) {
        const slug = slugify(tag);
        if (!tagSets[slug]) tagSets[slug] = [];
        tagSets[slug].push(n);
      });
    });
    Object.keys(tagSets).forEach(function (slug) {
      const group = tagSets[slug].slice().sort(function (a, b) {
        const da = Date.parse(a.date) - Date.parse(b.date);
        if (da !== 0) return da;
        return a.title.localeCompare(b.title);
      });
      for (let i = 0; i < group.length - 1; i++) add(group[i].id, group[i + 1].id, 'tag', slug);
    });

    nodes.forEach(function (n) {
      (n.links || []).forEach(function (id) { add(n.id, id, 'hand'); });
    });

    const chrono = nodes.slice().sort(function (a, b) {
      const da = Date.parse(a.date) - Date.parse(b.date);
      if (da !== 0) return da;
      return a.title.localeCompare(b.title);
    });
    for (let i = 0; i < chrono.length - 1; i++) {
      const key = edgeKey(chrono[i].id, chrono[i + 1].id);
      if (!map[key]) add(chrono[i].id, chrono[i + 1].id, 'time');
    }

    return Object.keys(map).map(function (k, i) {
      const e = map[k];
      e.kind = e.kinds.hand ? 'hand' : e.kinds.tag ? 'tag' : 'time';
      e.slot = i;
      return e;
    });
  }

  function route(a, b, slot) {
    const bump = ((slot % 5) - 2) * 22;
    if (Math.abs(a.x - b.x) >= Math.abs(a.y - b.y)) {
      const mx = (a.x + b.x) / 2 + bump;
      return {
        d: 'M' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' H' + mx.toFixed(1) + ' V' + b.y.toFixed(1) + ' H' + b.x.toFixed(1),
        vias: [
          { x: mx, y: a.y },
          { x: mx, y: b.y },
        ],
      };
    }
    const my = (a.y + b.y) / 2 + bump;
    return {
      d: 'M' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' V' + my.toFixed(1) + ' H' + b.x.toFixed(1) + ' V' + b.y.toFixed(1),
      vias: [
        { x: a.x, y: my },
        { x: b.x, y: my },
      ],
    };
  }

  function farFromPads(pt, nodes) {
    return nodes.every(function (n) {
      const dx = n.x - pt.x;
      const dy = n.y - pt.y;
      return dx * dx + dy * dy > 420;
    });
  }

  let payload;
  try {
    payload = JSON.parse(dataEl.textContent);
  } catch (err) {
    return;
  }

  const projects = (payload && payload.projects) || [];
  if (!projects.length) return;

  const nodes = layout(projects);
  const edges = buildEdges(nodes);
  const byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });

  const svgRoot = svg('svg', {
    viewBox: '0 0 ' + VB.w + ' ' + VB.h,
    role: 'group',
    'aria-label': 'PCB constellation of Blaha Labs builds',
  });

  const defs = svg('defs', {});
  defs.appendChild(svg('radialGradient', { id: 'sky-pad-glow', cx: '50%', cy: '50%', r: '50%' }));
  svgRoot.appendChild(defs);

  svgRoot.appendChild(svg('rect', { class: 'sky-fr4', x: 0, y: 0, width: VB.w, height: VB.h }));
  svgRoot.appendChild(svg('rect', { class: 'sky-outline', x: 22, y: 22, width: VB.w - 44, height: VB.h - 44, rx: 18 }));
  svgRoot.appendChild(svg('rect', { class: 'sky-outline sky-outline--inner', x: 36, y: 36, width: VB.w - 72, height: VB.h - 72, rx: 14 }));

  [
    [48, 48],
    [VB.w - 48, 48],
    [48, VB.h - 48],
    [VB.w - 48, VB.h - 48],
  ].forEach(function (pt) {
    svgRoot.appendChild(svg('circle', { class: 'sky-mount', cx: pt[0], cy: pt[1], r: 11 }));
    svgRoot.appendChild(svg('circle', { class: 'sky-hole', cx: pt[0], cy: pt[1], r: 4.5 }));
  });

  const starLayer = svg('g', { 'aria-hidden': 'true' });
  const rand = mulberry32(47);
  for (let i = 0; i < 90; i++) {
    starLayer.appendChild(
      svg('circle', {
        class: 'sky-star',
        cx: (40 + rand() * 1120).toFixed(1),
        cy: (40 + rand() * 640).toFixed(1),
        r: (rand() > 0.86 ? 1.6 : 0.7 + rand() * 0.6).toFixed(2),
        opacity: (0.12 + rand() * 0.28).toFixed(2),
      })
    );
  }
  svgRoot.appendChild(starLayer);

  const title = svg('text', { class: 'sky-silk', x: 80, y: 64 });
  title.textContent = 'Blaha Labs  ·  Constellation  ·  Rev A47';
  svgRoot.appendChild(title);
  const sub = svg('text', { class: 'sky-silk sky-silk--dim', x: 80, y: 80 });
  sub.textContent = 'Night shift  ·  FR4  ·  ' + nodes.length + ' pads live';
  svgRoot.appendChild(sub);

  const years = [];
  nodes.forEach(function (n) {
    if (years.indexOf(n.year) === -1) years.push(n.year);
  });
  years.sort();
  years.forEach(function (year) {
    const xs = nodes.filter(function (n) { return n.year === year; }).map(function (n) { return n.x; });
    const x = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
    const t = svg('text', { class: 'sky-year', x: x.toFixed(1), y: 652, 'text-anchor': 'middle' });
    t.textContent = year;
    svgRoot.appendChild(t);
  });

  const tagCentroids = {};
  nodes.forEach(function (n) {
    n.tagSlugs.forEach(function (slug, i) {
      if (!tagCentroids[slug]) tagCentroids[slug] = { x: 0, y: 0, n: 0, label: n.tags[i] };
      tagCentroids[slug].x += n.x;
      tagCentroids[slug].y += n.y;
      tagCentroids[slug].n += 1;
    });
  });
  const constLabels = {};
  Object.keys(tagCentroids).forEach(function (slug) {
    const c = tagCentroids[slug];
    if (c.n < 2) return;
    const t = svg('text', {
      class: 'sky-const-label',
      'data-tag': slug,
      x: (c.x / c.n).toFixed(1),
      y: (c.y / c.n - 42).toFixed(1),
      'text-anchor': 'middle',
    });
    t.textContent = c.label;
    svgRoot.appendChild(t);
    constLabels[slug] = t;
  });

  const traceLayer = svg('g', { class: 'sky-traces', 'aria-hidden': 'true' });
  const viaLayer = svg('g', { class: 'sky-vias', 'aria-hidden': 'true' });
  const packetLayer = svg('g', { class: 'sky-packets', 'aria-hidden': 'true' });
  const nodeLayer = svg('g', { class: 'sky-nodes' });

  const edgeEls = [];
  edges.forEach(function (edge, i) {
    const a = byId[edge.a];
    const b = byId[edge.b];
    const r = route(a, b, edge.slot);
    const path = svg('path', {
      class: 'sky-trace sky-trace--' + edge.kind,
      d: r.d,
      'data-a': edge.a,
      'data-b': edge.b,
      'data-tags': edge.tags.join(' '),
    });
    if (!prefersReduced) {
      path.classList.add('sky-trace--draw');
      path.style.strokeDasharray = '1800';
      path.style.strokeDashoffset = '1800';
      path.style.animationDelay = i * 45 + 'ms';
    }
    traceLayer.appendChild(path);
    edge.path = path;
    edge.d = r.d;
    edgeEls.push(edge);

    r.vias.forEach(function (pt) {
      if (!farFromPads(pt, nodes)) return;
      const via = svg('circle', { class: 'sky-via', cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 3.2 });
      viaLayer.appendChild(via);
      edge.vias = edge.vias || [];
      edge.vias.push(via);
    });

    if (!prefersReduced && edge.kind !== 'time') {
      const packet = svg('circle', { class: 'sky-packet', r: 2.6 });
      const motion = svg('animateMotion', {
        dur: 5 + (i % 5) * 1.4 + 's',
        repeatCount: 'indefinite',
        rotate: 'auto',
        path: r.d,
        begin: (i % 7) * 0.35 + 's',
      });
      packet.appendChild(motion);
      packetLayer.appendChild(packet);
      edge.packet = packet;
    }
  });

  svgRoot.appendChild(traceLayer);
  svgRoot.appendChild(viaLayer);

  const card = document.getElementById('skycard');
  const live = document.getElementById('sky-live');
  const statusEl = document.getElementById('skycard-status');
  const titleEl = document.getElementById('skycard-title');
  const metaEl = document.getElementById('skycard-meta');
  const summaryEl = document.getElementById('skycard-summary');
  const tagsEl = document.getElementById('skycard-tags');
  const goEl = document.getElementById('skycard-go');

  let activeId = null;
  let filterTag = 'all';
  const nodeEls = {};

  function placeCard(nodeEl) {
    if (!card || !nodeEl) return;
    const boardBox = board.getBoundingClientRect();
    const padBox = nodeEl.getBoundingClientRect();
    if (window.innerWidth < 720) {
      card.style.left = '12px';
      card.style.top = 'auto';
      return;
    }
    let left = padBox.right - boardBox.left + 14;
    let top = padBox.top - boardBox.top - 8;
    if (left + 330 > boardBox.width) left = padBox.left - boardBox.left - 334;
    if (top + 220 > boardBox.height) top = boardBox.height - 230;
    if (top < 12) top = 12;
    if (left < 12) left = 12;
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  function fillCard(node) {
    if (!card) return;
    statusEl.textContent = (node.wip ? 'In progress' : node.status || 'Logged') + '  ·  ' + node.ref;
    titleEl.textContent = node.title;
    metaEl.textContent = node.label;
    summaryEl.textContent = node.summary;
    tagsEl.textContent = '';
    node.tags.forEach(function (tag) {
      const s = document.createElement('span');
      s.className = 'skycard__tag';
      s.textContent = tag;
      tagsEl.appendChild(s);
    });
    goEl.href = node.url;
    card.hidden = false;
    placeCard(nodeEls[node.id]);
  }

  function announce(node) {
    if (!live) return;
    live.textContent = node.title + ', ' + (node.status || 'logged') + ', ' + node.label + '. ' + node.summary;
  }

  function connectedIds(id) {
    const set = {};
    set[id] = true;
    edgeEls.forEach(function (e) {
      if (e.a === id) set[e.b] = true;
      if (e.b === id) set[e.a] = true;
    });
    return set;
  }

  function applyChrome() {
    nodes.forEach(function (n) {
      const el = nodeEls[n.id];
      if (!el) return;
      const matchFilter = filterTag === 'all' || n.tagSlugs.indexOf(filterTag) !== -1;
      const hoverSet = activeId ? connectedIds(activeId) : null;
      const matchHover = !hoverSet || hoverSet[n.id];
      const on = matchFilter && matchHover;
      el.classList.toggle('is-dim', !on);
      el.classList.toggle('is-lit', !!(activeId && n.id === activeId));
    });
    edgeEls.forEach(function (e) {
      const tagMatch = filterTag === 'all' || e.tags.indexOf(filterTag) !== -1;
      const hoverMatch = !activeId || e.a === activeId || e.b === activeId;
      const on = tagMatch && hoverMatch;
      e.path.classList.toggle('is-dim', !on);
      e.path.classList.toggle('is-lit', !!(activeId && (e.a === activeId || e.b === activeId)));
      (e.vias || []).forEach(function (v) { v.classList.toggle('is-dim', !on); });
      if (e.packet) e.packet.classList.toggle('is-dim', !on);
    });
    Object.keys(constLabels).forEach(function (slug) {
      constLabels[slug].classList.toggle('is-on', filterTag === slug);
    });
    root.classList.toggle('is-filtered', filterTag !== 'all');
  }

  function select(id, fromFocus) {
    activeId = id;
    const node = byId[id];
    if (node) {
      fillCard(node);
      if (fromFocus) announce(node);
    }
    applyChrome();
  }

  function clearSelect() {
    activeId = null;
    if (card) card.hidden = true;
    applyChrome();
  }

  nodes.forEach(function (n) {
    const g = svg('a', {
      class: 'sky-node' + (n.wip ? ' is-wip' : ' is-shipped'),
      href: n.url,
      id: 'pad-' + n.id,
    });
    g.setAttribute('role', 'link');
    g.setAttribute('aria-label', n.title + ', ' + (n.status || 'logged') + ', ' + n.label);

    g.appendChild(svg('circle', { class: 'sky-copper', cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: 16 }));
    g.appendChild(svg('circle', { class: 'sky-ring', cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: 20 }));
    g.appendChild(svg('circle', { class: 'sky-hot', cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: 7.5 }));
    g.appendChild(svg('circle', { class: 'sky-hole', cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: 2.4 }));

    const labelY = n.ny > 0.88 ? n.y - 28 : n.y + 32;
    const label = svg('text', { class: 'sky-label', x: n.x.toFixed(1), y: labelY.toFixed(1) });
    label.textContent = n.silk;
    g.appendChild(label);

    const refY = n.ny > 0.88 ? n.y - 16 : n.y - 26;
    const ref = svg('text', { class: 'sky-ref', x: n.x.toFixed(1), y: refY.toFixed(1) });
    ref.textContent = n.ref;
    g.appendChild(ref);

    g.addEventListener('pointerenter', function () { select(n.id, false); });
    g.addEventListener('focus', function () { select(n.id, true); });
    g.addEventListener('click', function (ev) {
      if (!coarsePointer) return;
      if (activeId !== n.id) {
        ev.preventDefault();
        select(n.id, true);
      }
    });

    nodeLayer.appendChild(g);
    nodeEls[n.id] = g;
  });

  svgRoot.appendChild(nodeLayer);
  svgRoot.appendChild(packetLayer);

  stage.appendChild(svgRoot);
  board.classList.add('is-ready');

  if (!prefersReduced) {
    window.requestAnimationFrame(function () {
      edgeEls.forEach(function (e) {
        if (!e.path.getTotalLength) return;
        const len = Math.ceil(e.path.getTotalLength()) + 4;
        e.path.style.strokeDasharray = String(len);
        e.path.style.strokeDashoffset = String(len);
      });
      root.classList.add('is-animated');
    });
  }

  board.addEventListener('click', function (ev) {
    if (!coarsePointer) return;
    if (ev.target.closest('.sky-node, .skycard, .filter__btn')) return;
    clearSelect();
  });

  svgRoot.addEventListener('pointerleave', function (ev) {
    if (coarsePointer) return;
    if (ev.relatedTarget && board.contains(ev.relatedTarget)) return;
    clearSelect();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') clearSelect();
  });

  const buttons = Array.prototype.slice.call(root.querySelectorAll('[data-sky-filter]'));
  function applyFilter(tag) {
    filterTag = tag || 'all';
    buttons.forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-sky-filter') === filterTag);
    });
    const url = new URL(location.href);
    if (filterTag === 'all') url.searchParams.delete('tag');
    else url.searchParams.set('tag', filterTag);
    history.replaceState(null, '', url);
    applyChrome();
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      applyFilter(b.getAttribute('data-sky-filter'));
    });
  });

  const params = new URL(location.href).searchParams;
  const initialTag = params.get('tag');
  if (initialTag && buttons.some(function (b) { return b.getAttribute('data-sky-filter') === initialTag; })) {
    applyFilter(initialTag);
  } else {
    applyChrome();
  }

  const initialPad = params.get('pad');
  if (initialPad && nodeEls[initialPad]) {
    select(initialPad, true);
    nodeEls[initialPad].focus();
  }

  window.addEventListener('resize', function () {
    if (activeId && nodeEls[activeId]) placeCard(nodeEls[activeId]);
  });
})();
