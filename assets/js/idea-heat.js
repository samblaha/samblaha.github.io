(function (root) {
  'use strict';

  var STORAGE_KEY = 'blaha-idea-heat';
  var VOTE_GLOW = 8;
  var WIP_GLOW = 52;
  var GAP_GLOW = 24;
  var WIP_RECENCY = 16;
  var GAP_AGE_BASE = 8;
  var GAP_AGE_SPAN = 8;

  var REASON_LABELS = {
    'in-progress': 'Iron still on',
    'media-gap': 'Media gap',
  };

  function asText(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function parseDate(value) {
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    var raw = asText(value);
    if (!raw) return null;
    if (/^\d{4}$/.test(raw)) raw += '-01-01';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) raw += 'T00:00:00Z';
    var date = new Date(raw);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  function asHero(value) {
    if (value === true) return true;
    if (value === false || value == null) return false;
    var raw = asText(value);
    if (!raw) return false;
    if (/^(false|0|no|none)$/i.test(raw)) return false;
    return true;
  }

  function parseProjects(raw) {
    var list = raw;
    if (typeof raw === 'string') {
      try {
        list = JSON.parse(raw);
      } catch (err) {
        return [];
      }
    }
    if (!Array.isArray(list)) return [];

    var out = [];
    list.forEach(function (item, index) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      var title = asText(item.title);
      var url = asText(item.url);
      var date = parseDate(item.date || item.year);
      if (!title || !url || !date) return;
      var tags = Array.isArray(item.tags)
        ? item.tags.map(asText).filter(Boolean)
        : [];
      out.push({
        id: asText(item.id) || String(index),
        title: title,
        url: url,
        summary: asText(item.summary),
        status: asText(item.status),
        tag: asText(item.tag) || tags[0] || '',
        tags: tags,
        date: date.toISOString().slice(0, 10),
        year: String(date.getUTCFullYear()),
        hero: asHero(item.hero),
      });
    });
    return out;
  }

  function isInProgress(status) {
    return /progress/i.test(asText(status));
  }

  function reasons(project) {
    var out = [];
    if (!project) return out;
    if (isInProgress(project.status)) out.push('in-progress');
    if (!project.hero) out.push('media-gap');
    return out;
  }

  function reasonLabel(code) {
    return REASON_LABELS[code] || asText(code);
  }

  function isBacklog(project) {
    return reasons(project).length > 0;
  }

  function clamp(value, min, max) {
    var n = Number(value);
    if (isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function ageDays(project, now) {
    var date = parseDate(project && project.date);
    if (!date) return 0;
    var then = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    return Math.max(0, (then.getTime() - date.getTime()) / 86400000);
  }

  function baseHeat(project, now) {
    if (!isBacklog(project)) return 0;
    var heat = 0;
    var age = ageDays(project, now);
    if (isInProgress(project.status)) {
      heat += WIP_GLOW;
      heat += Math.max(0, WIP_RECENCY - age / 30);
    }
    if (!project.hero) {
      heat += GAP_GLOW;
      if (!isInProgress(project.status)) {
        heat += Math.min(GAP_AGE_SPAN, GAP_AGE_BASE + age / 180);
      }
    }
    return Math.round(clamp(heat, 1, 99));
  }

  function applyVotes(heat, voted) {
    var extra = voted ? VOTE_GLOW : 0;
    return Math.round(clamp((heat || 0) + extra, 0, 99));
  }

  function band(heat) {
    var n = Number(heat) || 0;
    if (n >= 75) return 'iron';
    if (n >= 50) return 'hot';
    if (n >= 25) return 'warm';
    return 'cold';
  }

  function bandLabel(heat) {
    var name = band(heat);
    if (name === 'iron') return 'IRON';
    if (name === 'hot') return 'HOT';
    if (name === 'warm') return 'WARM';
    return 'GLOW';
  }

  function parseVotes(raw) {
    var data = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        return {};
      }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    var out = {};
    Object.keys(data).forEach(function (key) {
      var id = asText(key);
      if (!id) return;
      var value = data[key];
      if (value === true || value === 1 || value === '1' || asText(value) === 'true') {
        out[id] = 1;
      }
    });
    return out;
  }

  function serializeVotes(votes) {
    var clean = parseVotes(votes);
    return JSON.stringify(clean);
  }

  function scoreBacklog(projects, votes, now) {
    var tally = parseVotes(votes);
    return (projects || [])
      .filter(isBacklog)
      .map(function (project) {
        var base = baseHeat(project, now);
        var voted = !!tally[project.id];
        var heat = applyVotes(base, voted);
        return {
          id: project.id,
          title: project.title,
          url: project.url,
          summary: project.summary,
          status: project.status,
          date: project.date,
          hero: project.hero,
          reasons: reasons(project),
          base: base,
          voted: voted,
          heat: heat,
          band: band(heat),
        };
      })
      .sort(function (a, b) {
        if (b.heat !== a.heat) return b.heat - a.heat;
        return a.title.localeCompare(b.title);
      });
  }

  function peak(items) {
    if (!items || !items.length) {
      return { heat: 0, band: 'cold', title: '', count: 0 };
    }
    return {
      heat: items[0].heat,
      band: items[0].band,
      title: items[0].title,
      count: items.length,
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    VOTE_GLOW: VOTE_GLOW,
    REASON_LABELS: REASON_LABELS,
    parseProjects: parseProjects,
    parseDate: parseDate,
    isInProgress: isInProgress,
    isBacklog: isBacklog,
    reasons: reasons,
    reasonLabel: reasonLabel,
    ageDays: ageDays,
    baseHeat: baseHeat,
    applyVotes: applyVotes,
    band: band,
    bandLabel: bandLabel,
    parseVotes: parseVotes,
    serializeVotes: serializeVotes,
    scoreBacklog: scoreBacklog,
    peak: peak,
  };

  root.BlahaIdeaHeat = api;

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function readStoredVotes() {
    try {
      return parseVotes(root.localStorage.getItem(STORAGE_KEY));
    } catch (err) {
      return {};
    }
  }

  function writeStoredVotes(votes) {
    try {
      root.localStorage.setItem(STORAGE_KEY, serializeVotes(votes));
    } catch (err) {
      /* private mode / quota — chips still work for this visit */
    }
  }

  function palette(doc) {
    var dark = true;
    if (doc && doc.documentElement) {
      dark = doc.documentElement.getAttribute('data-theme') !== 'light';
    }
    return {
      dark: dark,
      screen: '#0a0604',
      phosphor: dark ? '#f0b429' : '#d9a52d',
      solder: dark ? '#ff6a2a' : '#e0601a',
      hot: dark ? '#ff3b1a' : '#c43c12',
      laser: dark ? '#3dffc5' : '#2e6b64',
      cream: '#fff6ea',
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function mixRgb(a, b, t) {
    return [
      Math.round(lerp(a[0], b[0], t)),
      Math.round(lerp(a[1], b[1], t)),
      Math.round(lerp(a[2], b[2], t)),
    ];
  }

  function heatRgb(t) {
    var x = clamp(t, 0, 1);
    var stops = [
      [0, [10, 8, 12]],
      [0.18, [26, 39, 68]],
      [0.38, [22, 90, 92]],
      [0.58, [240, 180, 41]],
      [0.78, [255, 106, 42]],
      [0.92, [255, 59, 26]],
      [1, [255, 246, 234]],
    ];
    for (var i = 1; i < stops.length; i += 1) {
      if (x <= stops[i][0]) {
        var span = stops[i][0] - stops[i - 1][0];
        var local = span ? (x - stops[i - 1][0]) / span : 1;
        return mixRgb(stops[i - 1][1], stops[i][1], local);
      }
    }
    return stops[stops.length - 1][1];
  }

  function rgb(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
  }

  function mount(doc) {
    var documentRef = doc || (typeof document !== 'undefined' ? document : null);
    if (!documentRef) return null;

    var rootEl = documentRef.querySelector('[data-idea-heat]');
    var dataEl = documentRef.getElementById('idea-heat-data');
    if (!rootEl || !dataEl) return null;

    var canvas = rootEl.querySelector('[data-idea-heat-canvas]');
    var chipsEl = rootEl.querySelector('[data-idea-heat-chips]');
    var liveEl = rootEl.querySelector('[data-idea-heat-live]');
    var peakEl = rootEl.querySelector('[data-idea-heat-peak]');
    var station = documentRef.querySelector('[data-station="ideas"]');
    var bentoLed = documentRef.querySelector('[data-idea-bento-led]');
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    var reduced = prefersReducedMotion();
    var running = true;
    var raf = 0;
    var projects = parseProjects(dataEl.textContent);
    var votes = readStoredVotes();
    var scored = [];

    function jointsLabel(count) {
      if (count === 1) return '1 JOINT';
      return count + ' JOINTS';
    }

    function paintChrome() {
      var top = peak(scored);
      var hot = top.count > 0;
      rootEl.setAttribute('data-heat-band', top.band);
      rootEl.classList.toggle('is-hot', hot);
      if (station) {
        station.classList.toggle('is-heat', hot);
        if (hot) station.setAttribute('data-heat-band', top.band);
        else station.removeAttribute('data-heat-band');
      }
      if (bentoLed) {
        bentoLed.classList.toggle('led--hot', hot);
        bentoLed.classList.toggle('led--live', false);
      }
      if (liveEl) {
        liveEl.textContent = hot ? bandLabel(top.heat) : 'COLD';
      }
      if (peakEl) {
        peakEl.textContent = hot
          ? top.heat + ' GLOW · ' + jointsLabel(top.count)
          : 'NO JOINTS';
      }
    }

    function paintChip(el, item) {
      if (!el || !item) return;
      el.hidden = false;
      el.style.setProperty('--heat', String(item.heat / 99));
      el.setAttribute('data-heat-band', item.band);
      el.classList.toggle('is-voted', item.voted);
      var temp = el.querySelector('[data-heat-temp]');
      var bandEl = el.querySelector('[data-heat-band-label]');
      var vote = el.querySelector('[data-heat-vote]');
      if (temp) temp.textContent = String(item.heat);
      if (bandEl) bandEl.textContent = bandLabel(item.heat);
      if (vote) {
        vote.setAttribute('aria-pressed', item.voted ? 'true' : 'false');
        vote.textContent = item.voted ? 'heated' : '+ heat';
        vote.setAttribute(
          'aria-label',
          (item.voted ? 'Remove heat from ' : 'Add heat to ') + item.title,
        );
      }
    }

    function paintChips() {
      if (!chipsEl) return;
      var nodes = Array.prototype.slice.call(chipsEl.querySelectorAll('[data-heat-id]'));
      var byId = {};
      scored.forEach(function (item) {
        byId[item.id] = item;
      });
      nodes.forEach(function (el) {
        var id = el.getAttribute('data-heat-id');
        var item = byId[id];
        if (!item) {
          el.hidden = true;
          return;
        }
        paintChip(el, item);
      });
      scored.forEach(function (item) {
        var el = chipsEl.querySelector('[data-heat-id="' + item.id + '"]');
        if (!el) return;
        var row = el.closest ? el.closest('li') : el.parentElement;
        chipsEl.appendChild(row && row.parentElement === chipsEl ? row : el);
      });
    }

    function refresh() {
      scored = scoreBacklog(projects, votes, new Date());
      paintChrome();
      paintChips();
    }

    function toggleVote(id) {
      if (!id) return;
      if (votes[id]) delete votes[id];
      else votes[id] = 1;
      writeStoredVotes(votes);
      refresh();
    }

    function sizeCanvas() {
      if (!canvas || !ctx) return { w: 0, h: 0, dpr: 1 };
      var dpr = Math.min((root.devicePixelRatio || 1), 2);
      var width = Math.max(240, Math.floor(canvas.clientWidth || rootEl.clientWidth || 640));
      var height = Math.max(72, Math.floor(canvas.clientHeight || 120));
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: width, h: height, dpr: dpr };
    }

    function fieldAt(x, y, w, h, time) {
      var nx = x / Math.max(1, w);
      var ny = y / Math.max(1, h);
      var v = 0.12 + 0.04 * Math.sin((nx + ny) * 9 + (time || 0) * 0.0004);
      scored.forEach(function (item, index) {
        var cx = ((index + 0.55) / Math.max(scored.length, 1)) * w;
        var cy = h * (0.42 + (index % 2) * 0.16);
        var dx = (x - cx) / w;
        var dy = (y - cy) / h;
        var sigma = 0.16 + item.heat / 420;
        var amp = 0.22 + item.heat / 140;
        v += amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      });
      return clamp(v, 0, 1);
    }

    function draw(now) {
      if (!ctx || !canvas) return;
      var size = sizeCanvas();
      var w = size.w;
      var h = size.h;
      if (!w || !h) return;
      var colors = palette(documentRef);
      ctx.fillStyle = colors.screen;
      ctx.fillRect(0, 0, w, h);

      var step = 3;
      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          var t = fieldAt(x + 1, y + 1, w, h, now);
          ctx.fillStyle = rgb(heatRgb(t));
          ctx.fillRect(x, y, step, step);
        }
      }

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = colors.screen;
      for (var scanY = 0; scanY < h; scanY += 4) {
        ctx.fillRect(0, scanY, w, 1);
      }
      ctx.globalAlpha = 1;

      if (!reduced && running) {
        var sweep = ((now || 0) / 4200) % 1;
        var sx = sweep * w;
        var fade = ctx.createLinearGradient(sx - 40, 0, sx + 6, 0);
        fade.addColorStop(0, 'rgba(255, 246, 234, 0)');
        fade.addColorStop(0.7, 'rgba(240, 180, 41, 0.08)');
        fade.addColorStop(1, 'rgba(255, 106, 42, 0.55)');
        ctx.fillStyle = fade;
        ctx.fillRect(sx - 40, 0, 46, h);
        ctx.fillStyle = colors.cream;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(sx, 0, 1.5, h);
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(draw);
      }
    }

    function onVoteClick(event) {
      var btn = event.target.closest && event.target.closest('[data-heat-vote]');
      if (!btn || !chipsEl.contains(btn)) return;
      event.preventDefault();
      var chip = btn.closest('[data-heat-id]');
      toggleVote(chip && chip.getAttribute('data-heat-id'));
    }

    function onKey(event) {
      if (!chipsEl) return;
      var chips = Array.prototype.slice
        .call(chipsEl.querySelectorAll('[data-heat-id]:not([hidden])'))
        .filter(function (el) {
          return !el.hidden;
        });
      if (!chips.length) return;
      var current = event.target.closest && event.target.closest('[data-heat-id]');
      var index = current ? chips.indexOf(current) : 0;
      var next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(chips.length - 1, index + 1);
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(0, index - 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = chips.length - 1;
      else if (event.key === 'Enter' && event.target.matches && event.target.matches('[data-heat-vote]')) {
        return;
      } else {
        return;
      }
      if (next === index && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      var target = chips[next];
      var focusable = target.querySelector('[data-heat-vote]') || target.querySelector('a') || target;
      if (focusable && focusable.focus) focusable.focus();
    }

    if (chipsEl) {
      chipsEl.addEventListener('click', onVoteClick);
      rootEl.addEventListener('keydown', onKey);
    }

    if (typeof documentRef.addEventListener === 'function') {
      documentRef.addEventListener('visibilitychange', function () {
        running = !documentRef.hidden;
        if (running && !reduced && ctx) {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(draw);
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () {
        if (reduced && ctx) draw(0);
      });
    }

    if (typeof MutationObserver !== 'undefined' && documentRef.documentElement) {
      var themeWatch = new MutationObserver(function () {
        if (reduced && ctx) draw(0);
      });
      themeWatch.observe(documentRef.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    refresh();
    rootEl.classList.add('is-ready');
    if (ctx) {
      draw(0);
    }

    return {
      projects: projects,
      scored: function () {
        return scored.slice();
      },
      toggleVote: toggleVote,
    };
  }

  api.mount = mount;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        mount(document);
      });
    } else {
      mount(document);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
