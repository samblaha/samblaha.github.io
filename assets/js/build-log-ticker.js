(function (root) {
  'use strict';

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

  function escapeHtml(value) {
    return asText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
      });
    });

    out.sort(function (a, b) {
      if (a.tMs !== b.tMs) return b.tMs - a.tMs;
      return a.title.localeCompare(b.title);
    });
    return out;
  }

  function statusCode(status) {
    var raw = asText(status);
    if (!raw) return 'LOG';
    if (/progress|\bwip\b/i.test(raw)) return 'WIP';
    if (/ship|done|complete/i.test(raw)) return 'SHIP';
    var stamp = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 8);
    return stamp || 'LOG';
  }

  function statusTone(status) {
    var code = statusCode(status);
    if (code === 'WIP') return 'wip';
    if (code === 'SHIP') return 'ship';
    return 'log';
  }

  function loopSeconds(count) {
    var n = Number(count);
    if (!n || n < 1) return 0;
    return Math.max(18, Math.min(72, n * 3.4));
  }

  function shouldAnimate(count, reduced) {
    return !reduced && Number(count) > 0;
  }

  function renderItem(project) {
    if (!project || !project.title || !project.url || !project.date) return '';
    var tone = statusTone(project.status);
    var stamp = statusCode(project.status);
    var tag = asText(project.tag);
    var html = '<a class="ticker__item" href="' + escapeHtml(project.url) + '">';
    html +=
      '<time class="ticker__year" datetime="' +
      escapeHtml(project.date) +
      '">' +
      escapeHtml(project.year) +
      '</time>';
    html += '<span class="ticker__sep" aria-hidden="true">·</span>';
    html += '<span class="ticker__title">' + escapeHtml(project.title) + '</span>';
    html +=
      '<span class="ticker__stamp ticker__stamp--' +
      tone +
      '">' +
      escapeHtml(stamp) +
      '</span>';
    if (tag) {
      html += '<span class="ticker__sep" aria-hidden="true">·</span>';
      html += '<span class="ticker__tag">' + escapeHtml(tag) + '</span>';
    }
    html += '</a>';
    html += '<span class="ticker__gem" aria-hidden="true">✦</span>';
    return html;
  }

  function renderSeq(projects) {
    return (projects || []).map(renderItem).join('');
  }

  var api = {
    parseProjects: parseProjects,
    parseDate: parseDate,
    statusCode: statusCode,
    statusTone: statusTone,
    loopSeconds: loopSeconds,
    shouldAnimate: shouldAnimate,
    renderItem: renderItem,
    renderSeq: renderSeq,
    escapeHtml: escapeHtml,
  };

  root.BlahaBuildLog = api;

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

    var rootEl = documentRef.querySelector('[data-build-log]');
    var dataEl = documentRef.getElementById('build-log-data');
    if (!rootEl || !dataEl) return null;

    var track = rootEl.querySelector('[data-build-log-track]');
    var seq = rootEl.querySelector('[data-build-log-seq]');
    var liveEl = rootEl.querySelector('[data-build-log-live]');
    var ledEl = rootEl.querySelector('[data-build-log-led]');
    var projects = parseProjects(dataEl.textContent);
    if (!track || !seq || !projects.length) return null;

    var reduced = prefersReducedMotion();
    var animating = shouldAnimate(projects.length, reduced);
    var paused = !animating;

    seq.innerHTML = renderSeq(projects);

    Array.prototype.slice.call(track.querySelectorAll('[data-build-log-clone]')).forEach(function (node) {
      node.parentNode.removeChild(node);
    });

    if (animating) {
      var clone = seq.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('data-build-log-clone', '');
      clone.removeAttribute('data-build-log-seq');
      var cloneLinks = clone.querySelectorAll('a');
      for (var i = 0; i < cloneLinks.length; i += 1) {
        cloneLinks[i].setAttribute('tabindex', '-1');
      }
      track.appendChild(clone);
      track.style.setProperty('--ticker-s', loopSeconds(projects.length) + 's');
    }

    function setPaused(next) {
      paused = !!next || !animating;
      rootEl.classList.toggle('is-paused', paused);
      if (liveEl) liveEl.textContent = animating && !paused ? 'LIVE' : 'HOLD';
      if (ledEl) {
        ledEl.classList.toggle('led--live', animating && !paused);
      }
    }

    function onEnter() {
      if (animating) setPaused(true);
    }

    function onLeave(event) {
      var next = event && event.relatedTarget;
      if (next && rootEl.contains(next)) return;
      if (animating) setPaused(false);
    }

    rootEl.addEventListener('mouseenter', onEnter);
    rootEl.addEventListener('mouseleave', onLeave);
    rootEl.addEventListener('focusin', onEnter);
    rootEl.addEventListener('focusout', onLeave);

    rootEl.classList.toggle('is-static', !animating);
    rootEl.classList.add('is-ready');
    setPaused(!animating);

    return {
      projects: projects,
      animating: animating,
      setPaused: setPaused,
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
