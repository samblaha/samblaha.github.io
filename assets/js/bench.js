(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const isHome = document.body.classList.contains('page-home');
  const BOOT_KEY = 'blaha-boot-seen';

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v || fallback).trim();
  }

  function palette() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      dark,
      ink: cssVar('--ink', dark ? '#f3ead8' : '#1c120c'),
      solder: cssVar('--solder', '#ff6a2a'),
      phosphor: cssVar('--phosphor', '#f0b429'),
      laser: cssVar('--laser', '#2ee6a6'),
      copper: cssVar('--copper', '#c47a3a'),
      screen: dark ? '#07140f' : '#14241c',
      trace: dark ? 'rgba(46, 230, 166, 0.22)' : 'rgba(46, 107, 100, 0.28)',
    };
  }

  /* ------------------------------------------------------------------ */
  /* Boot sequence — CRT bench BIOS, once per session                    */
  /* ------------------------------------------------------------------ */
  function initBoot() {
    const boot = document.getElementById('boot');
    if (!boot || !isHome || prefersReduced) return;
    if (sessionStorage.getItem(BOOT_KEY)) return;
    if (location.hash) return;

    const log = document.getElementById('boot-log');
    const enterBtn = document.getElementById('boot-enter');
    const skipBtn = document.getElementById('boot-skip');
    const canvas = document.getElementById('boot-scope');
    const lines = [
      '> POST ................ OK',
      '> IRON HEATER ......... 340°C',
      '> SCOPE ............... LOCK',
      '> GAMES ............... 3 CARTS',
      '> BUILDS .............. LOGGED',
      '> CURIOSITY ........... UNCAPPED',
    ];

    let done = false;
    let raf = 0;
    let typed = 0;
    let lineTimer = 0;

    boot.hidden = false;
    document.documentElement.classList.add('is-booting');
    if (skipBtn) skipBtn.focus();

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      if (lineTimer) window.clearInterval(lineTimer);
      sessionStorage.setItem(BOOT_KEY, '1');
      document.documentElement.classList.remove('is-booting');
      boot.classList.add('is-out');
      window.setTimeout(function () {
        boot.hidden = true;
        boot.classList.remove('is-out');
      }, 420);
    }

    if (log) {
      log.textContent = '';
      const typer = window.setInterval(function () {
        if (typed >= lines.length) {
          window.clearInterval(typer);
          return;
        }
        log.textContent += lines[typed] + '\n';
        typed += 1;
      }, 220);
      lineTimer = typer;
    }

    if (canvas) {
      const ctx = canvas.getContext('2d');
      const loop = function (now) {
        if (done) return;
        const w = canvas.width;
        const h = canvas.height;
        const c = palette();
        ctx.fillStyle = 'rgba(4, 10, 8, 0.22)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(46, 230, 166, 0.12)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 28) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.strokeStyle = c.laser;
        ctx.shadowColor = c.laser;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        const t = now / 1000;
        for (let x = 0; x <= w; x += 3) {
          const nx = x / w;
          const y =
            h * 0.52 +
            Math.sin(nx * 18 + t * 4) * 18 +
            Math.sin(nx * 7 - t * 2.2) * 28 * Math.sin(t * 0.7);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        raf = requestAnimationFrame(loop);
      };
      ctx.fillStyle = '#041008';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(loop);
    }

    const onKey = function (e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    document.addEventListener('keydown', onKey);
    if (enterBtn) enterBtn.addEventListener('click', finish);
    if (skipBtn) skipBtn.addEventListener('click', finish);

    window.setTimeout(finish, 5600);

    window.addEventListener(
      'pagehide',
      function () {
        document.removeEventListener('keydown', onKey);
        cancelAnimationFrame(raf);
      },
      { once: true }
    );
  }

  /* ------------------------------------------------------------------ */
  /* Living PCB atmosphere                                               */
  /* ------------------------------------------------------------------ */
  function initAtmosphere() {
    const canvas = document.getElementById('atmosphere');
    if (!canvas || prefersReduced) return;
    if (window.matchMedia('(max-width: 640px)').matches) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let w = 0;
    let h = 0;
    let dpr = 1;
    let traces = [];
    let packets = [];
    let smoke = [];
    let running = true;
    let last = performance.now();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      const cols = w < 900 ? 10 : 16;
      const rows = w < 900 ? 7 : 10;
      const padX = w * 0.06;
      const padY = h * 0.1;
      const gw = (w - padX * 2) / (cols - 1);
      const gh = (h - padY * 2) / (rows - 1);
      const nodes = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const jitter = 10;
          nodes.push({
            x: padX + x * gw + (Math.random() - 0.5) * jitter,
            y: padY + y * gh + (Math.random() - 0.5) * jitter,
          });
        }
      }
      traces = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (x < cols - 1 && Math.random() > 0.22) traces.push([nodes[i], nodes[i + 1]]);
          if (y < rows - 1 && Math.random() > 0.28) traces.push([nodes[i], nodes[i + cols]]);
        }
      }
      packets = traces.slice(0, Math.min(traces.length, w < 900 ? 10 : 18)).map(function (seg, i) {
        return { seg: seg, t: Math.random(), dir: 1, speed: 0.08 + (i % 5) * 0.03 };
      });
      smoke = [];
      const n = w < 900 ? 10 : 22;
      for (let i = 0; i < n; i++) {
        smoke.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 8 + Math.random() * 22,
          v: 6 + Math.random() * 14,
          a: 0.04 + Math.random() * 0.05,
        });
      }
    }

    function tick(now) {
      if (!running) {
        last = now;
        requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      const c = palette();
      const boost = 1 + Math.min(1.4, window.scrollY / 1400);

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.strokeStyle = c.trace;
      ctx.lineWidth = 1.2;
      traces.forEach(function (seg) {
        ctx.beginPath();
        ctx.moveTo(seg[0].x, seg[0].y);
        ctx.lineTo(seg[1].x, seg[1].y);
        ctx.stroke();
      });

      packets.forEach(function (p) {
        p.t += p.speed * dt * boost * p.dir;
        if (p.t > 1 || p.t < 0) p.dir *= -1;
        const x = p.seg[0].x + (p.seg[1].x - p.seg[0].x) * p.t;
        const y = p.seg[0].y + (p.seg[1].y - p.seg[0].y) * p.t;
        ctx.fillStyle = c.laser;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      smoke.forEach(function (s) {
        s.y -= s.v * dt;
        s.x += Math.sin(now / 700 + s.r) * 8 * dt;
        if (s.y < -40) {
          s.y = h + 20;
          s.x = Math.random() * w;
        }
        ctx.fillStyle = c.dark ? 'rgba(243,234,216,0.035)' : 'rgba(28,18,12,0.04)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
    });
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /* Hero oscilloscope — phosphor persistence, pointer as probe          */
  /* ------------------------------------------------------------------ */
  function initScope() {
    const canvas = document.getElementById('hero-scope');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let mx = 0.42;
    let my = 0.5;
    let tx = mx;
    let ty = my;
    let running = true;
    const persist = prefersReduced ? 0.42 : 0.16;

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(280, Math.floor(canvas.clientWidth || 640));
      const h = Math.max(180, Math.floor(canvas.clientHeight || 280));
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: w, h: h };
    }

    window.addEventListener(
      'pointermove',
      function (e) {
        tx = e.clientX / window.innerWidth;
        ty = e.clientY / window.innerHeight;
      },
      { passive: true }
    );

    function draw(now) {
      const sizeInfo = size();
      const w = sizeInfo.w;
      const h = sizeInfo.h;
      const c = palette();
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;

      ctx.fillStyle = c.dark ? 'rgba(7, 20, 15, ' + persist + ')' : 'rgba(20, 36, 28, ' + persist + ')';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(46, 230, 166, 0.12)';
      ctx.lineWidth = 1;
      const gx = w / 8;
      const gy = h / 6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += gx) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += gy) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(46, 230, 166, 0.28)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const t = now / 1000;
      const drawWave = function (animated) {
        const freq = 6 + mx * 16;
        const amp = (0.18 + (1 - my) * 0.28) * h;
        const time = animated ? t : 0.8;
        ctx.beginPath();
        ctx.strokeStyle = c.laser;
        ctx.shadowColor = c.laser;
        ctx.shadowBlur = animated ? 10 : 6;
        ctx.lineWidth = 2;
        for (let x = 0; x <= w; x += 2) {
          const nx = x / w;
          const y =
            h / 2 +
            Math.sin(nx * freq + time * (2.4 + mx * 3)) * amp * 0.55 +
            Math.sin(nx * freq * 0.33 - time * 1.4) * amp * 0.22;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = c.solder;
        ctx.shadowColor = c.solder;
        ctx.shadowBlur = animated ? 8 : 4;
        ctx.lineWidth = 1.4;
        const duty = 0.35 + my * 0.4;
        for (let x = 0; x <= w; x += 2) {
          const nx = x / w;
          const wave = (nx * 5 + time * 1.6) % 1;
          const y = h / 2 + (wave < duty ? -amp * 0.22 : amp * 0.22);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      };

      if (prefersReduced) {
        drawWave(false);
      } else if (running) {
        drawWave(true);
      }

      requestAnimationFrame(draw);
    }

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
    });
    ctx.fillStyle = '#07140f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
  }

  /* ------------------------------------------------------------------ */
  /* Pointer lamp, 3D instrument tilt, knobs, station LEDs               */
  /* ------------------------------------------------------------------ */
  function initLamp() {
    const lamp = document.getElementById('lamp');
    if (!lamp || prefersReduced || !finePointer) return;
    window.addEventListener(
      'pointermove',
      function (e) {
        lamp.style.transform = 'translate(' + (e.clientX - 0.5 * lamp.offsetWidth) + 'px,' + (e.clientY - 0.5 * lamp.offsetHeight) + 'px)';
      },
      { passive: true }
    );
  }

  function initTilt() {
    const stage = document.querySelector('[data-tilt-stage]');
    const inner = document.querySelector('[data-tilt-inner]');
    if (!stage || !inner || prefersReduced || !finePointer) return;
    stage.addEventListener('pointermove', function (e) {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform = 'rotateX(' + (-y * 10 + 8) + 'deg) rotateY(' + (x * 16 - 14) + 'deg)';
    });
    stage.addEventListener('pointerleave', function () {
      inner.style.transform = '';
    });
  }

  function initKnobs() {
    if (prefersReduced || !finePointer) return;
    document.querySelectorAll('[data-knob]').forEach(function (knob) {
      knob.addEventListener('pointermove', function (e) {
        const r = knob.getBoundingClientRect();
        const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        knob.style.setProperty('--rot', a * (180 / Math.PI) + 90 + 'deg');
      });
    });
  }

  function initStations() {
    const links = Array.from(document.querySelectorAll('[data-station]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = {};
    links.forEach(function (a) {
      map[a.getAttribute('data-station')] = a;
    });
    const targets = Array.from(document.querySelectorAll('[data-station-target]'));
    if (!targets.length) return;
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-station-target');
          links.forEach(function (a) {
            const on = a.getAttribute('data-station') === id;
            a.classList.toggle('is-active', on);
          });
        });
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: 0 }
    );
    targets.forEach(function (t) {
      io.observe(t);
    });
  }

  function initIronTemp() {
    const el = document.querySelector('[data-iron-temp]');
    if (!el || prefersReduced) return;
    let t = 187;
    window.setInterval(function () {
      t += (340 - t) * 0.04 + (Math.random() - 0.5) * 3;
      t = Math.max(160, Math.min(360, t));
      el.textContent = String(Math.round(t));
    }, 900);
  }

  function init() {
    initBoot();
    initAtmosphere();
    initScope();
    initLamp();
    initTilt();
    initKnobs();
    initStations();
    initIronTemp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
