(function (root) {
  'use strict';

  var EDGE = 0.07;
  var TRACE_SAMPLES = 280;

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
      var status = asText(item.status);
      out.push({
        id: asText(item.id) || String(index),
        title: title,
        url: url,
        summary: asText(item.summary),
        status: status,
        tag: asText(item.tag) || tags[0] || '',
        tags: tags,
        date: date.toISOString().slice(0, 10),
        year: String(date.getUTCFullYear()),
        tMs: date.getTime(),
        hot: /progress/i.test(status),
      });
    });

    out.sort(function (a, b) {
      if (a.tMs !== b.tMs) return a.tMs - b.tMs;
      return a.title.localeCompare(b.title);
    });
    return out;
  }

  function axisFor(projects, nowMs) {
    if (!projects.length) {
      var fallback = typeof nowMs === 'number' ? nowMs : Date.now();
      return { start: fallback, end: fallback + 1 };
    }
    var start = projects[0].tMs;
    var end = projects[projects.length - 1].tMs;
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    if (now > end) end = now;
    if (end <= start) end = start + 86400000;
    return { start: start, end: end };
  }

  function mapT(raw01) {
    var clamped = Math.max(0, Math.min(1, raw01));
    return EDGE + clamped * (1 - EDGE * 2);
  }

  function layout(projects, axis) {
    var span = axis && axis.end - axis.start;
    if (!span || span <= 0) span = 1;
    var items = (projects || []).map(function (project) {
      var raw = (project.tMs - axis.start) / span;
      return Object.assign({}, project, { t: mapT(raw) });
    });

    var minGap = Math.min(0.05, 0.72 / Math.max(items.length, 1));
    for (var i = 1; i < items.length; i += 1) {
      if (items[i].t < items[i - 1].t + minGap) {
        items[i].t = items[i - 1].t + minGap;
      }
    }

    var first = items.length ? items[0].t : EDGE;
    var last = items.length ? items[items.length - 1].t : 0;
    var limit = 1 - EDGE;
    if (last > limit && last > first) {
      var span = last - first;
      var fit = Math.max(minGap, limit - first);
      var scale = fit / span;
      for (var i = 1; i < items.length; i += 1) {
        items[i].t = first + (items[i].t - first) * scale;
      }
    }
    return items;
  }

  function nearestIndex(t, laidOut) {
    if (!laidOut || !laidOut.length) return -1;
    var best = 0;
    var dist = Infinity;
    for (var i = 0; i < laidOut.length; i += 1) {
      var d = Math.abs(laidOut[i].t - t);
      if (d < dist) {
        dist = d;
        best = i;
      }
    }
    return best;
  }

  function sampleTrace(laidOut, samples) {
    var count = samples && samples > 8 ? samples : TRACE_SAMPLES;
    var sigma = 0.016;
    var values = [];
    for (var i = 0; i < count; i += 1) {
      var x = count === 1 ? 0.5 : i / (count - 1);
      var y = 0;
      for (var j = 0; j < (laidOut || []).length; j += 1) {
        var d = x - laidOut[j].t;
        var amp = laidOut[j].hot ? 1 : 0.74;
        y += amp * Math.exp(-(d * d) / (2 * sigma * sigma));
      }
      values.push(Math.min(1, y));
    }
    return values;
  }

  function yearTicks(projects, axis) {
    var seen = {};
    var ticks = [];
    (projects || []).forEach(function (project) {
      if (!project.year || seen[project.year]) return;
      seen[project.year] = true;
      var tMs = Date.UTC(Number(project.year), 0, 1);
      var raw = (tMs - axis.start) / Math.max(1, axis.end - axis.start);
      var t = mapT(raw);
      if (t >= 0 && t <= 1) ticks.push({ year: project.year, t: t });
    });
    return ticks;
  }

  function truncate(text, max) {
    var value = asText(text);
    if (value.length <= max) return value;
    return value.slice(0, Math.max(0, max - 1)).replace(/\s+\S*$/, '') + '…';
  }

  function readout(project) {
    if (!project) {
      return {
        kicker: 'NO TRACE',
        title: '',
        summary: '',
        href: '',
        status: '',
        line: '',
      };
    }
    var bits = [project.year, project.title];
    if (project.status) bits.push(project.status);
    return {
      kicker: project.year + (project.tag ? ' · ' + project.tag : ''),
      title: project.title,
      summary: truncate(project.summary, 150),
      href: project.url,
      status: project.status,
      line: bits.join(' · '),
    };
  }

  var api = {
    EDGE: EDGE,
    parseProjects: parseProjects,
    axisFor: axisFor,
    layout: layout,
    mapT: mapT,
    nearestIndex: nearestIndex,
    sampleTrace: sampleTrace,
    yearTicks: yearTicks,
    readout: readout,
  };

  root.BlahaCareerScope = api;

  function cssVar(name, fallback) {
    if (typeof document === 'undefined') return fallback;
    var value = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (value || fallback).trim();
  }

  function palette() {
    var dark =
      typeof document === 'undefined' ||
      document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      dark: dark,
      solder: cssVar('--solder', '#ff6a2a'),
      phosphor: cssVar('--phosphor', '#f0b429'),
      laser: cssVar('--laser', '#3dffc5'),
      copper: cssVar('--copper', '#c47a3a'),
      screen: dark ? '#07140f' : '#14241c',
    };
  }

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function mount(doc) {
    var documentRef = doc || (typeof document !== 'undefined' ? document : null);
    if (!documentRef) return null;

    var rootEl = documentRef.querySelector('[data-career-scope]');
    var dataEl = documentRef.getElementById('career-scope-data');
    if (!rootEl || !dataEl) return null;

    var canvas = rootEl.querySelector('[data-career-canvas]');
    var stage = rootEl.querySelector('[data-career-stage]');
    var markersEl = rootEl.querySelector('[data-career-markers]');
    var ticksEl = rootEl.querySelector('[data-career-ticks]');
    var kickerEl = rootEl.querySelector('[data-career-kicker]');
    var titleEl = rootEl.querySelector('[data-career-title]');
    var summaryEl = rootEl.querySelector('[data-career-summary]');
    var openEl = rootEl.querySelector('[data-career-open]');
    if (!canvas || !stage || !markersEl) return null;

    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var projects = parseProjects(dataEl.textContent);
    var axis = axisFor(projects);
    var laidOut = layout(projects, axis);
    var blips = Array.prototype.slice.call(rootEl.querySelectorAll('[data-career-id]'));
    var reduced = prefersReducedMotion();
    var active = laidOut.length ? laidOut.length - 1 : -1;
    var running = true;
    var raf = 0;

    function blipFor(index) {
      var item = laidOut[index];
      if (!item) return null;
      for (var i = 0; i < blips.length; i += 1) {
        if (blips[i].getAttribute('data-career-id') === item.id) return blips[i];
      }
      return blips[index] || null;
    }

    function paintTicks() {
      if (!ticksEl) return;
      ticksEl.innerHTML = '';
      yearTicks(projects, axis).forEach(function (tick) {
        var el = documentRef.createElement('span');
        el.className = 'career-scope__tick';
        el.textContent = tick.year;
        el.style.left = tick.t * 100 + '%';
        ticksEl.appendChild(el);
      });
    }

    function placeBlips() {
      laidOut.forEach(function (item, index) {
        var link = blipFor(index);
        if (!link) return;
        var li = link.parentElement;
        if (li) {
          li.style.left = item.t * 100 + '%';
          li.style.top = item.hot ? '28%' : '34%';
        }
        link.setAttribute('tabindex', index === active ? '0' : '-1');
        link.classList.toggle('is-active', index === active);
        link.setAttribute('aria-current', index === active ? 'true' : 'false');
      });
    }

    function paintHud() {
      var item = laidOut[active];
      var view = readout(item);
      if (kickerEl) kickerEl.textContent = view.kicker || 'Timebase';
      if (titleEl) titleEl.textContent = view.line || view.title || 'Probe a blip';
      if (summaryEl) {
        summaryEl.textContent =
          view.summary || 'Every spike is a logged write-up. Pointer is the probe.';
      }
      if (openEl) {
        if (view.href) {
          openEl.href = view.href;
          openEl.hidden = false;
        } else {
          openEl.hidden = true;
        }
      }
    }

    function setActive(index, opts) {
      if (index < 0 || index >= laidOut.length) return;
      var next = index;
      if (active === next && !(opts && opts.force)) return;
      active = next;
      placeBlips();
      paintHud();
      if (opts && opts.focus) {
        var link = blipFor(active);
        if (link) link.focus();
      }
    }

    function sizeCanvas() {
      var dpr = Math.min((root.devicePixelRatio || 1), 2);
      var width = Math.max(280, Math.floor(canvas.clientWidth || stage.clientWidth || 640));
      var height = Math.max(160, Math.floor(canvas.clientHeight || 220));
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: width, h: height };
    }

    function draw(now) {
      var size = sizeCanvas();
      var w = size.w;
      var h = size.h;
      var colors = palette();
      var persist = reduced ? 1 : 0.2;

      ctx.fillStyle = colors.dark
        ? 'rgba(7, 20, 15, ' + persist + ')'
        : 'rgba(20, 36, 28, ' + persist + ')';
      if (reduced) ctx.fillStyle = colors.screen;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(61, 255, 197, 0.12)';
      ctx.lineWidth = 1;
      var gx = w / 10;
      var gy = h / 5;
      ctx.beginPath();
      for (var x = 0; x <= w; x += gx) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (var y = 0; y <= h; y += gy) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      var baseY = h * 0.68;
      ctx.strokeStyle = 'rgba(61, 255, 197, 0.28)';
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(w, baseY);
      ctx.stroke();

      var samples = sampleTrace(laidOut, Math.max(160, Math.floor(w / 2)));
      var amp = h * 0.46;
      ctx.beginPath();
      ctx.strokeStyle = colors.laser;
      ctx.shadowColor = colors.laser;
      ctx.shadowBlur = reduced ? 6 : 12;
      ctx.lineWidth = 2;
      for (var i = 0; i < samples.length; i += 1) {
        var px = (i / Math.max(1, samples.length - 1)) * w;
        var py = baseY - samples[i] * amp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      var current = laidOut[active];
      if (current) {
        var cx = current.t * w;
        ctx.strokeStyle = current.hot ? colors.solder : colors.phosphor;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 8);
        ctx.lineTo(cx, h - 8);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        ctx.fillStyle = current.hot ? colors.solder : colors.laser;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, baseY - (current.hot ? 0.92 : 0.7) * amp, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (!reduced && running) {
        var sweep = ((now || 0) / 4800) % 1;
        var sx = sweep * w;
        var fade = ctx.createLinearGradient(sx - 48, 0, sx + 8, 0);
        fade.addColorStop(0, 'rgba(61, 255, 197, 0)');
        fade.addColorStop(0.75, 'rgba(61, 255, 197, 0.08)');
        fade.addColorStop(1, 'rgba(240, 180, 41, 0.55)');
        ctx.fillStyle = fade;
        ctx.fillRect(sx - 48, 0, 56, h);
        ctx.fillStyle = colors.phosphor;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(sx, 0, 1.5, h);
        ctx.globalAlpha = 1;
      }

      if (!reduced && running) raf = requestAnimationFrame(draw);
    }

    function tFromEvent(event) {
      var rect = stage.getBoundingClientRect();
      if (!rect.width) return 0.5;
      return (event.clientX - rect.left) / rect.width;
    }

    function onPointerMove(event) {
      setActive(nearestIndex(tFromEvent(event), laidOut));
    }

    function onPointerUp(event) {
      if (event.target.closest && event.target.closest('[data-career-id]')) return;
      var t = tFromEvent(event);
      var index = nearestIndex(t, laidOut);
      if (index < 0) return;
      var dx = Math.abs(laidOut[index].t - t) * stage.getBoundingClientRect().width;
      setActive(index);
      if (dx <= 28 && laidOut[index].url) {
        window.location.href = laidOut[index].url;
      }
    }

    function onKey(event) {
      if (!laidOut.length) return;
      var next = active;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(0, active - 1);
      else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        next = Math.min(laidOut.length - 1, active + 1);
      } else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = laidOut.length - 1;
      else return;
      event.preventDefault();
      setActive(next, { focus: true });
    }

    blips.forEach(function (link, index) {
      link.addEventListener('focus', function () {
        var id = link.getAttribute('data-career-id');
        var found = laidOut.findIndex(function (item) {
          return item.id === id;
        });
        setActive(found >= 0 ? found : index);
      });
    });

    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('click', onPointerUp);
    rootEl.addEventListener('keydown', onKey);

    function redrawStatic() {
      if (reduced) draw(0);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function () {
        placeBlips();
        paintTicks();
        redrawStatic();
      });
    }

    if (typeof MutationObserver !== 'undefined' && documentRef.documentElement) {
      var themeWatch = new MutationObserver(redrawStatic);
      themeWatch.observe(documentRef.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    if (typeof documentRef.addEventListener === 'function') {
      documentRef.addEventListener('visibilitychange', function () {
        running = !documentRef.hidden;
        if (running && !reduced) {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(draw);
        }
      });
    }

    paintTicks();
    placeBlips();
    paintHud();
    rootEl.classList.add('is-ready');
    ctx.fillStyle = palette().screen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    draw(0);

    return {
      projects: projects,
      laidOut: laidOut,
      setActive: setActive,
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
