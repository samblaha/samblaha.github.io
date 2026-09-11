(function (root) {
  'use strict';

  var MODES = ['year', 'tag', 'status'];
  var LCD_WIDTH = 8;
  var NEEDLE_MIN = -72;
  var NEEDLE_SPAN = 144;

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
      var tag = asText(item.tag) || tags[0] || '';
      out.push({
        id: asText(item.id) || String(index),
        title: title,
        url: url,
        summary: asText(item.summary),
        status: asText(item.status),
        tag: tag,
        tags: tags,
        date: date.toISOString().slice(0, 10),
        year: String(date.getUTCFullYear()),
      });
    });
    return out;
  }

  function lcdText(value, width) {
    var max = width || LCD_WIDTH;
    var cleaned = asText(value)
      .toUpperCase()
      .replace(/[^A-Z0-9.\- ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '----';
    if (cleaned.length <= max) return cleaned;
    return cleaned.slice(0, max).replace(/\s+$/, '');
  }

  function isHot(status) {
    return /progress/i.test(asText(status));
  }

  function yearNeedle(project, projects) {
    if (!project) return 0;
    var years = (projects || [])
      .map(function (item) {
        return Number(item.year);
      })
      .filter(function (year) {
        return !isNaN(year);
      });
    if (!years.length) return 0.5;
    var min = Math.min.apply(null, years);
    var max = Math.max.apply(null, years);
    var year = Number(project.year);
    if (isNaN(year) || max === min) return 0.5;
    return (year - min) / (max - min);
  }

  function needleDeg(t) {
    var clamped = Math.max(0, Math.min(1, t || 0));
    return NEEDLE_MIN + clamped * NEEDLE_SPAN;
  }

  function idleReading() {
    return {
      mode: '',
      digits: '----',
      unit: '',
      range: 'OPEN',
      label: 'Probe a build',
      live: 'LEADS OPEN',
      tone: 'idle',
      needle: 0,
      continuity: 'open',
      href: '',
      title: '',
    };
  }

  function reading(project, mode, projects) {
    if (!project) return idleReading();
    var current = MODES.indexOf(mode) >= 0 ? mode : 'year';
    var view = {
      mode: current,
      href: project.url,
      title: project.title,
      live: 'HOLD',
      tone: 'laser',
      continuity: 'hold',
      label: project.title,
    };

    if (current === 'year') {
      view.digits = project.year || '----';
      view.unit = 'YR';
      view.range = 'TIME';
      view.tone = 'phosphor';
      view.needle = yearNeedle(project, projects);
      return view;
    }

    if (current === 'tag') {
      var tag = project.tag || '';
      view.digits = tag ? lcdText(tag, LCD_WIDTH) : '----';
      view.unit = 'Ω';
      view.range = tag || 'STACK';
      view.tone = 'copper';
      view.needle = 0.38;
      if (!tag) view.label = project.title + ' · no stack logged';
      return view;
    }

    var status = asText(project.status);
    view.range = status || 'OPEN';
    view.unit = 'V';
    if (!status) {
      view.digits = '----';
      view.tone = 'idle';
      view.continuity = 'open';
      view.needle = 0.08;
      view.live = 'OPEN';
      view.label = project.title + ' · no status in the log';
      return view;
    }
    if (isHot(status)) {
      view.digits = 'OL';
      view.tone = 'solder';
      view.continuity = 'spike';
      view.needle = 0.92;
      view.live = 'SPIKE';
      return view;
    }
    view.digits = 'CONT';
    view.tone = 'laser';
    view.continuity = 'closed';
    view.needle = 0.58;
    view.live = 'BEEP';
    return view;
  }

  function stepIndex(index, delta, length) {
    if (!length) return -1;
    if (index < 0) return delta >= 0 ? 0 : length - 1;
    var next = index + delta;
    if (next < 0) return 0;
    if (next > length - 1) return length - 1;
    return next;
  }

  var api = {
    MODES: MODES,
    LCD_WIDTH: LCD_WIDTH,
    parseProjects: parseProjects,
    lcdText: lcdText,
    isHot: isHot,
    yearNeedle: yearNeedle,
    needleDeg: needleDeg,
    idleReading: idleReading,
    reading: reading,
    stepIndex: stepIndex,
  };

  root.BlahaMultimeter = api;

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function coarsePointer() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  function mount(doc) {
    var documentRef = doc || (typeof document !== 'undefined' ? document : null);
    if (!documentRef) return null;

    var rootEl = documentRef.querySelector('[data-dmm]');
    var dataEl = documentRef.getElementById('dmm-data');
    var grid = documentRef.getElementById('home-grid');
    if (!rootEl || !dataEl || !grid) return null;

    var digitsEl = rootEl.querySelector('[data-dmm-digits]');
    var unitEl = rootEl.querySelector('[data-dmm-unit]');
    var rangeEl = rootEl.querySelector('[data-dmm-range]');
    var labelEl = rootEl.querySelector('[data-dmm-label]');
    var liveEl = rootEl.querySelector('[data-dmm-live-label]');
    var ledEl = rootEl.querySelector('[data-dmm-led]');
    var needleEl = rootEl.querySelector('[data-dmm-needle]');
    var dialEl = rootEl.querySelector('[data-dmm-dial]');
    var lcdEl = rootEl.querySelector('[data-dmm-lcd]');
    var modeBtns = Array.prototype.slice.call(rootEl.querySelectorAll('[data-dmm-mode]'));
    var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-probe-id]'));
    if (!digitsEl || !cards.length) return null;

    var projects = parseProjects(dataEl.textContent);
    var byId = {};
    projects.forEach(function (project) {
      byId[project.id] = project;
    });
    var order = cards
      .map(function (card) {
        return byId[card.getAttribute('data-probe-id')];
      })
      .filter(Boolean);

    var reduced = prefersReducedMotion();
    var coarse = coarsePointer();
    var mode = 'year';
    var active = -1;

    function cardFor(index) {
      var project = order[index];
      if (!project) return null;
      for (var i = 0; i < cards.length; i += 1) {
        if (cards[i].getAttribute('data-probe-id') === project.id) return cards[i];
      }
      return cards[index] || null;
    }

    function linkFor(index) {
      var card = cardFor(index);
      return card ? card.querySelector('[data-probe-target], .card__link') : null;
    }

    function paintModes() {
      modeBtns.forEach(function (btn) {
        var on = btn.getAttribute('data-dmm-mode') === mode;
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
        btn.classList.toggle('is-active', on);
      });
      if (dialEl) {
        var rot = mode === 'year' ? -48 : mode === 'tag' ? 0 : 48;
        dialEl.style.setProperty('--dmm-rot', rot + 'deg');
      }
    }

    function paintMeter() {
      var project = order[active];
      var view = reading(project, mode, order);
      digitsEl.textContent = view.digits;
      if (unitEl) unitEl.textContent = view.unit;
      if (rangeEl) rangeEl.textContent = view.range;
      if (labelEl) labelEl.textContent = view.label;
      if (liveEl) liveEl.textContent = view.live;
      if (ledEl) {
        ledEl.classList.toggle('led--live', view.continuity === 'closed' || view.continuity === 'hold');
        ledEl.classList.toggle('led--hot', view.continuity === 'spike');
      }
      rootEl.setAttribute('data-dmm-tone', view.tone);
      rootEl.classList.toggle('is-probing', !!project);
      if (lcdEl) lcdEl.setAttribute('data-continuity', view.continuity);
      if (needleEl) {
        needleEl.style.transform = 'rotate(' + needleDeg(view.needle) + 'deg)';
        if (reduced) needleEl.style.transition = 'none';
      }
      cards.forEach(function (card) {
        var on = !!(project && card.getAttribute('data-probe-id') === project.id);
        card.classList.toggle('is-probed', on);
        var link = card.querySelector('[data-probe-target], .card__link');
        if (link) link.setAttribute('aria-current', on ? 'true' : 'false');
      });
    }

    function setActive(index, opts) {
      var next = index;
      if (next < -1 || next >= order.length) return;
      if (active === next && !(opts && opts.force)) {
        if (opts && opts.focus) {
          var same = linkFor(active);
          if (same) same.focus();
        }
        return;
      }
      active = next;
      paintMeter();
      if (opts && opts.focus) {
        var link = linkFor(active);
        if (link) link.focus();
      }
    }

    function setMode(next, opts) {
      if (MODES.indexOf(next) < 0) return;
      if (mode === next && !(opts && opts.force)) return;
      mode = next;
      paintModes();
      paintMeter();
    }

    function indexFromEvent(event) {
      var card = event.target.closest && event.target.closest('[data-probe-id]');
      if (!card || !grid.contains(card)) return -1;
      var id = card.getAttribute('data-probe-id');
      return order.findIndex(function (project) {
        return project.id === id;
      });
    }

    function onGridPointer(event) {
      var index = indexFromEvent(event);
      if (index >= 0) setActive(index);
    }

    function onGridLeave(event) {
      var next = event.relatedTarget;
      if (next && grid.contains(next)) return;
      if (coarse) return;
      var focused = documentRef.activeElement;
      if (focused && grid.contains(focused)) return;
      setActive(-1);
    }

    function onFocusIn(event) {
      var index = indexFromEvent(event);
      if (index >= 0) setActive(index);
    }

    function onFocusOut(event) {
      var next = event.relatedTarget;
      if (next && (grid.contains(next) || rootEl.contains(next))) return;
      if (coarse && active >= 0) return;
      setActive(-1);
    }

    function onKey(event) {
      if (!order.length) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        setActive(stepIndex(active, 1, order.length), { focus: true });
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(stepIndex(active, -1, order.length), { focus: true });
      } else if (event.key === 'Home') {
        event.preventDefault();
        setActive(0, { focus: true });
      } else if (event.key === 'End') {
        event.preventDefault();
        setActive(order.length - 1, { focus: true });
      }
    }

    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-dmm-mode'));
      });
    });

    grid.addEventListener('pointerover', onGridPointer);
    grid.addEventListener('pointerdown', onGridPointer);
    grid.addEventListener('mouseleave', onGridLeave);
    grid.addEventListener('focusin', onFocusIn);
    grid.addEventListener('focusout', onFocusOut);
    rootEl.addEventListener('keydown', onKey);
    grid.addEventListener('keydown', onKey);

    paintModes();
    paintMeter();
    rootEl.classList.add('is-ready');

    return {
      projects: order,
      setActive: setActive,
      setMode: setMode,
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
