(function (root) {
  'use strict';

  var BIN_COUNT = 48;
  var LIVE_TAU = 0.2;
  var PEAK_TAU = 1.7;
  var REDUCED_PEAK_TAU = 8;
  var SCROLL_SCALE = 1600;
  var POINTER_SCALE = 1900;

  function clamp(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    return Math.max(min, Math.min(max, n));
  }

  function zeros(count) {
    var n = count > 0 ? count | 0 : 0;
    var out = [];
    var i;
    for (i = 0; i < n; i += 1) out.push(0);
    return out;
  }

  function createState(count) {
    var n = count > 0 ? count | 0 : BIN_COUNT;
    return { bins: zeros(n), peaks: zeros(n), sweep: 0 };
  }

  function energies(input) {
    var src = input && typeof input === 'object' ? input : {};
    return {
      scroll: clamp(src.scroll, 0, 1),
      pointer: clamp(src.pointer, 0, 1),
      pulse: src.pulse ? 1 : 0,
      x: clamp(src.x == null ? 0.5 : src.x, 0, 1),
    };
  }

  function velocityEnergy(pixels, dt, scale) {
    if (!(dt > 0) || !isFinite(pixels)) return 0;
    var ref = scale > 0 ? scale : SCROLL_SCALE;
    return clamp(Math.abs(pixels) / dt / ref, 0, 1);
  }

  function shapeAt(count, kind, x) {
    var n = count > 0 ? count | 0 : 0;
    var out = zeros(n);
    var pos = clamp(x, 0, 1);
    var i;
    var t;
    var d;
    if (kind === 'scroll') {
      for (i = 0; i < n; i += 1) {
        t = n === 1 ? 0 : i / (n - 1);
        out[i] = 1 / (1 + 16 * t * t);
      }
    } else if (kind === 'pointer') {
      var center = 0.26 + pos * 0.52;
      var width = 0.13;
      for (i = 0; i < n; i += 1) {
        t = n === 1 ? center : i / (n - 1);
        d = (t - center) / width;
        out[i] = Math.exp(-d * d);
      }
    } else if (kind === 'pulse') {
      for (i = 0; i < n; i += 1) {
        t = n === 1 ? 1 : i / (n - 1);
        out[i] = 0.32 + 0.68 * t;
      }
    }
    return out;
  }

  function inject(bins, shape, amount) {
    if (!bins || !bins.length) return bins;
    var a = clamp(amount, 0, 1);
    if (a <= 0) return bins;
    var i;
    for (i = 0; i < bins.length; i += 1) {
      bins[i] = clamp(bins[i] + (shape && shape[i] ? shape[i] : 0) * a, 0, 1);
    }
    return bins;
  }

  function decay(values, dt, tau) {
    if (!values || !values.length) return values;
    var k = dt <= 0 ? 1 : Math.exp(-dt / Math.max(tau, 1e-4));
    var i;
    for (i = 0; i < values.length; i += 1) {
      values[i] *= k;
    }
    return values;
  }

  function holdPeaks(peaks, bins, dt, tau) {
    if (!peaks || !peaks.length) return peaks;
    var k = dt <= 0 ? 1 : Math.exp(-dt / Math.max(tau, 1e-4));
    var i;
    var live;
    for (i = 0; i < peaks.length; i += 1) {
      live = bins && bins[i] ? bins[i] : 0;
      if (live >= peaks[i]) peaks[i] = live;
      else peaks[i] *= k;
    }
    return peaks;
  }

  function step(state, input, dt, opts) {
    var next = state || createState(BIN_COUNT);
    var n = next.bins.length;
    var reduced = !!(opts && opts.reduced);
    var e = energies(input);
    var seconds = dt > 0 ? dt : 0;

    if (reduced) {
      decay(next.peaks, seconds, REDUCED_PEAK_TAU);
      inject(next.peaks, shapeAt(n, 'scroll', e.x), e.scroll * 0.72);
      inject(next.peaks, shapeAt(n, 'pointer', e.x), e.pointer * 0.72);
      inject(next.peaks, shapeAt(n, 'pulse', e.x), e.pulse);
      var i;
      for (i = 0; i < n; i += 1) next.bins[i] = next.peaks[i];
      next.sweep = 0;
      return next;
    }

    decay(next.bins, seconds, LIVE_TAU);
    inject(next.bins, shapeAt(n, 'scroll', e.x), e.scroll);
    inject(next.bins, shapeAt(n, 'pointer', e.x), e.pointer * 0.9);
    inject(next.bins, shapeAt(n, 'pulse', e.x), e.pulse);
    holdPeaks(next.peaks, next.bins, seconds, PEAK_TAU);
    next.sweep = (next.sweep + seconds / 1.85) % 1;
    return next;
  }

  function peakDb(values) {
    var max = 0;
    var i;
    if (!values) return Number.NEGATIVE_INFINITY;
    for (i = 0; i < values.length; i += 1) {
      if (values[i] > max) max = values[i];
    }
    if (max <= 0.0008) return Number.NEGATIVE_INFINITY;
    return 20 * Math.log10(max);
  }

  function formatPeak(db) {
    if (!isFinite(db)) return 'PK −∞';
    var n = Math.round(db);
    return 'PK ' + (n > 0 ? '+' : '') + n;
  }

  function dbHeight(value) {
    var x = clamp(value, 0, 1);
    if (x <= 0) return 0;
    return clamp((20 * Math.log10(x) + 46) / 46, 0, 1);
  }

  var api = {
    BIN_COUNT: BIN_COUNT,
    LIVE_TAU: LIVE_TAU,
    PEAK_TAU: PEAK_TAU,
    SCROLL_SCALE: SCROLL_SCALE,
    POINTER_SCALE: POINTER_SCALE,
    clamp: clamp,
    zeros: zeros,
    createState: createState,
    energies: energies,
    velocityEnergy: velocityEnergy,
    shapeAt: shapeAt,
    inject: inject,
    decay: decay,
    holdPeaks: holdPeaks,
    step: step,
    peakDb: peakDb,
    formatPeak: formatPeak,
    dbHeight: dbHeight,
  };

  root.BlahaSpectrum = api;

  function prefersReducedMotion(win) {
    var w = win || (typeof window !== 'undefined' ? window : null);
    return !!(w && w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function mixRgb(a, b, t) {
    var k = clamp(t, 0, 1);
    return [
      Math.round(a[0] + (b[0] - a[0]) * k),
      Math.round(a[1] + (b[1] - a[1]) * k),
      Math.round(a[2] + (b[2] - a[2]) * k),
    ];
  }

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
  }

  function palette(doc) {
    var light = !!(doc && doc.documentElement && doc.documentElement.getAttribute('data-theme') === 'light');
    return {
      light: light,
      screen: '#050806',
      green: light ? [46, 120, 92] : [61, 255, 197],
      amber: light ? [217, 165, 45] : [240, 180, 41],
      hot: light ? [196, 60, 18] : [255, 106, 42],
    };
  }

  function mount(doc, win) {
    var documentRef = doc || (typeof document !== 'undefined' ? document : null);
    var windowRef = win || (typeof window !== 'undefined' ? window : null);
    if (!documentRef || !windowRef) return null;

    var rootEl = documentRef.querySelector('[data-spectrum]');
    if (!rootEl) return null;

    var canvas = rootEl.querySelector('[data-spectrum-canvas]');
    var liveEl = rootEl.querySelector('[data-spectrum-live]');
    var peakEl = rootEl.querySelector('[data-spectrum-peak]');
    var ledEl = rootEl.querySelector('[data-spectrum-led]');
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    var state = createState(BIN_COUNT);
    var reduced = prefersReducedMotion(windowRef);
    var running = true;
    var raf = 0;
    var lastTs = 0;
    var pendingScroll = 0;
    var pendingPointer = 0;
    var pendingPulse = 0;
    var pointerX = 0.5;
    var lastPtr = null;
    var lastHud = '';
    var colors = palette(documentRef);

    function fitCanvas() {
      if (!canvas || !ctx) return;
      var dpr = Math.min(windowRef.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(2, Math.round(rect.width * dpr));
      var h = Math.max(2, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      fitCanvas();
      var w = canvas.width;
      var h = canvas.height;
      var padL = Math.round(w * 0.018);
      var padR = Math.round(w * 0.018);
      var padT = Math.round(h * 0.1);
      var padB = Math.round(h * 0.22);
      var innerW = Math.max(1, w - padL - padR);
      var innerH = Math.max(1, h - padT - padB);
      var n = state.bins.length;
      var gap = Math.max(1, Math.floor(innerW / n * 0.18));
      var barW = Math.max(1, (innerW - gap * (n - 1)) / n);
      var i;
      var x;
      var liveH;
      var peakH;
      var amp;
      var col;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.screen;
      ctx.fillRect(0, 0, w, h);

      var well = ctx.createRadialGradient(w * 0.5, h * 0.92, h * 0.05, w * 0.5, h * 0.7, w * 0.62);
      well.addColorStop(0, rgba(colors.green, 0.1));
      well.addColorStop(0.45, rgba(colors.amber, 0.04));
      well.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = well;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.rect(padL, padT, innerW, innerH);
      ctx.clip();

      ctx.strokeStyle = rgba(colors.green, 0.12);
      ctx.lineWidth = Math.max(1, Math.round(w / 720));
      ctx.beginPath();
      for (i = 0; i <= 10; i += 1) {
        x = padL + (innerW * i) / 10;
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + innerH);
      }
      for (i = 0; i <= 4; i += 1) {
        var y = padT + (innerH * i) / 4;
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + innerW, y);
      }
      ctx.stroke();

      if (!reduced && state.sweep > 0) {
        var sweepX = padL + innerW * state.sweep;
        ctx.fillStyle = rgba(colors.green, 0.08);
        ctx.fillRect(padL, padT, sweepX - padL, innerH);
        ctx.strokeStyle = rgba(colors.green, 0.55);
        ctx.beginPath();
        ctx.moveTo(sweepX, padT);
        ctx.lineTo(sweepX, padT + innerH);
        ctx.stroke();
      }

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (i = 0; i < n; i += 1) {
        x = padL + i * (barW + gap);
        amp = dbHeight(state.bins[i]);
        liveH = amp * innerH;
        col = mixRgb(colors.green, colors.amber, amp);
        if (amp > 0.82) col = mixRgb(col, colors.hot, (amp - 0.82) / 0.18);
        ctx.shadowColor = rgba(col, 0.85);
        ctx.shadowBlur = Math.max(6, barW * 1.8);
        ctx.fillStyle = rgba(col, 0.22 + amp * 0.55);
        ctx.fillRect(x, padT + innerH - liveH, barW, liveH);
        if (i === 0) ctx.moveTo(x + barW / 2, padT + innerH - liveH);
        else ctx.lineTo(x + barW / 2, padT + innerH - liveH);
      }
      ctx.shadowBlur = 18;
      ctx.strokeStyle = rgba(colors.amber, 0.95);
      ctx.lineWidth = Math.max(1.25, barW * 0.22);
      ctx.stroke();

      ctx.shadowBlur = 0;
      for (i = 0; i < n; i += 1) {
        peakH = dbHeight(state.peaks[i]) * innerH;
        if (peakH <= 1) continue;
        x = padL + i * (barW + gap);
        ctx.fillStyle = rgba(colors.amber, 0.92);
        ctx.fillRect(x, padT + innerH - peakH - 1, barW, 2);
      }
      ctx.restore();

      ctx.fillStyle = rgba(colors.green, 0.38);
      ctx.font = Math.max(9, Math.round(h * 0.11)) + 'px "IBM Plex Mono", monospace';
      ctx.textBaseline = 'top';
      var labels = ['0', '2k', '5k', '8k', '10k'];
      for (i = 0; i < labels.length; i += 1) {
        ctx.fillText(labels[i], padL + (innerW * i) / (labels.length - 1) - (i === labels.length - 1 ? 14 : 0), padT + innerH + 3);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (i = 0; i < h; i += 3) ctx.fillRect(0, i, w, 1);
    }

    function paintHud() {
      var db = peakDb(state.peaks);
      var label = formatPeak(db);
      var hot = isFinite(db) && db > -34;
      if (peakEl && peakEl.textContent !== label) peakEl.textContent = label;
      if (liveEl) liveEl.textContent = hot ? 'LIVE' : 'HOLD';
      if (ledEl) {
        ledEl.classList.toggle('led--live', hot);
        ledEl.classList.toggle('led--hot', hot && db > -8);
      }
      rootEl.classList.toggle('is-live', hot);
      var hud = label + (hot ? '|LIVE' : '|HOLD');
      if (hud !== lastHud) {
        lastHud = hud;
        rootEl.setAttribute('data-spectrum-hud', hud);
      }
    }

    function consume(dt) {
      var scrollE = velocityEnergy(pendingScroll, dt || 0.016, SCROLL_SCALE);
      var pointerE = velocityEnergy(pendingPointer, dt || 0.016, POINTER_SCALE);
      var pulse = pendingPulse > 0;
      pendingScroll = 0;
      pendingPointer = 0;
      pendingPulse = 0;
      step(state, { scroll: scrollE, pointer: pointerE, pulse: pulse, x: pointerX }, dt, { reduced: reduced });
      paintHud();
      draw();
    }

    function loop(ts) {
      if (!running || reduced) return;
      if (!lastTs) lastTs = ts;
      var dt = clamp((ts - lastTs) / 1000, 0, 0.08);
      lastTs = ts;
      consume(dt);
      raf = windowRef.requestAnimationFrame(loop);
    }

    function startLoop() {
      if (reduced || !running) return;
      if (raf) return;
      lastTs = 0;
      raf = windowRef.requestAnimationFrame(loop);
    }

    function stopLoop() {
      if (raf && windowRef.cancelAnimationFrame) windowRef.cancelAnimationFrame(raf);
      raf = 0;
    }

    function onWheel(event) {
      var dy = event.deltaY || 0;
      if (event.deltaMode === 1) dy *= 16;
      if (event.deltaMode === 2) dy *= 800;
      pendingScroll += Math.abs(dy);
      if (reduced) consume(0.05);
    }

    function onPointerMove(event) {
      var px = event.clientX || 0;
      var py = event.clientY || 0;
      var now = typeof event.timeStamp === 'number' ? event.timeStamp : Date.now();
      pointerX = windowRef.innerWidth ? clamp(px / windowRef.innerWidth, 0, 1) : 0.5;
      if (lastPtr) {
        var dx = px - lastPtr.x;
        var dy = py - lastPtr.y;
        pendingPointer += Math.sqrt(dx * dx + dy * dy);
      }
      lastPtr = { x: px, y: py, t: now };
      if (reduced) consume(0.05);
    }

    function onPointerDown() {
      pendingPulse += 1;
      if (reduced) consume(0.05);
    }

    function onKey(event) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      if (documentRef.activeElement !== rootEl) return;
      event.preventDefault();
      pendingPulse += 1;
      if (reduced) consume(0.05);
    }

    function onTheme() {
      colors = palette(documentRef);
      draw();
    }

    function onMotion(event) {
      reduced = !!(event && event.matches);
      rootEl.classList.toggle('is-reduced', reduced);
      if (reduced) {
        stopLoop();
        consume(0);
      } else {
        startLoop();
      }
    }

    function onVis() {
      if (documentRef.hidden) stopLoop();
      else if (!reduced) startLoop();
    }

    fitCanvas();
    rootEl.classList.toggle('is-reduced', reduced);
    paintHud();
    draw();
    rootEl.classList.add('is-ready');

    windowRef.addEventListener('wheel', onWheel, { passive: true, capture: true });
    windowRef.addEventListener('pointermove', onPointerMove, { passive: true });
    windowRef.addEventListener('pointerdown', onPointerDown, { passive: true });
    rootEl.addEventListener('keydown', onKey);
    windowRef.addEventListener('resize', function () {
      draw();
    });
    documentRef.addEventListener('visibilitychange', onVis);
    windowRef.addEventListener('themechange', onTheme);
    if (windowRef.MutationObserver) {
      var themeWatch = new windowRef.MutationObserver(onTheme);
      themeWatch.observe(documentRef.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }
    if (windowRef.matchMedia) {
      var motion = windowRef.matchMedia('(prefers-reduced-motion: reduce)');
      if (motion.addEventListener) motion.addEventListener('change', onMotion);
      else if (motion.addListener) motion.addListener(onMotion);
    }
    if (!reduced) startLoop();

    return {
      state: state,
      pulse: function () {
        pendingPulse += 1;
        if (reduced) consume(0.05);
      },
      destroy: function () {
        running = false;
        stopLoop();
        windowRef.removeEventListener('wheel', onWheel, { capture: true });
        windowRef.removeEventListener('pointermove', onPointerMove);
        windowRef.removeEventListener('pointerdown', onPointerDown);
      },
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
