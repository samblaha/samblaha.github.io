(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Scroll reveal =====
  function initReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (prefersReduced || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
  }

  // ===== Subtle pointer tilt on cards =====
  function initCardTilt() {
    if (prefersReduced || !window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translate(-4px, -4px) rotate(${x * 1.2 - 0.6}deg) perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`;
      });

      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ===== Confetti sparkle burst on primary actions =====
  const SPARKLE_COLORS = ['#ff4d8d', '#ffc800', '#00c2c2', '#7a5cff', '#ff7a30'];

  function sparkleBurst(x, y) {
    if (prefersReduced) return;

    const count = 14;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('div');
      const size = 5 + Math.random() * 6;
      const color = SPARKLE_COLORS[i % SPARKLE_COLORS.length];

      s.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;` +
        `background:${color};pointer-events:none;z-index:9999;` +
        (Math.random() > 0.5 ? 'border-radius:50%;' : 'border-radius:2px;');

      document.body.appendChild(s);

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 40 + Math.random() * 60;

      s.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0) rotate(${180 + Math.random() * 180}deg)`,
            opacity: 0,
          },
        ],
        { duration: 550 + Math.random() * 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      ).onfinish = () => s.remove();
    }
  }

  function initSparkles() {
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('.btn, .theme-float__btn') : null;
      if (target) sparkleBurst(e.clientX, e.clientY);
    });
  }

  // ===== Smooth scroll with fixed-header offset =====
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"], a[href^="/#"]').forEach((link) => {
      link.addEventListener('click', function (e) {
        const hash = this.getAttribute('href').replace(/^\//, '');
        if (hash === '#' || (location.pathname !== '/' && this.getAttribute('href').startsWith('/#'))) return;

        const target = document.querySelector(hash);
        if (!target) return;

        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.pageYOffset - 110;
        window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    });
  }

  // ===== Tag filter on the workbench grid (deep-linkable via ?tag=) =====
  function initTagFilter() {
    const buttons = Array.from(document.querySelectorAll('.filter__btn'));
    const cards = Array.from(document.querySelectorAll('#build-grid .card'));
    const empty = document.getElementById('grid-empty');
    if (!buttons.length || !cards.length) return;

    const apply = (tag) => {
      let shown = 0;
      cards.forEach((card) => {
        const tags = (card.getAttribute('data-tags') || '').split(/\s+/);
        const match = tag === 'all' || tags.includes(tag);
        card.classList.toggle('is-filtered', !match);
        if (match) shown++;
      });
      buttons.forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-filter') === tag));
      if (empty) empty.hidden = shown > 0;

      const url = new URL(location.href);
      if (tag === 'all') url.searchParams.delete('tag');
      else url.searchParams.set('tag', tag);
      history.replaceState(null, '', url);
    };

    buttons.forEach((b) => b.addEventListener('click', () => apply(b.getAttribute('data-filter'))));

    const initial = new URL(location.href).searchParams.get('tag');
    if (initial && buttons.some((b) => b.getAttribute('data-filter') === initial)) apply(initial);
  }

  function init() {
    initReveal();
    initCardTilt();
    initSparkles();
    initSmoothScroll();
    initTagFilter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
