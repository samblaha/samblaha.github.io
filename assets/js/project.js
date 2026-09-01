/* Project page: reading progress, build-log rail, heading anchors,
   code block chrome, image captions + lightbox. */
(function () {
  'use strict';

  const body = document.getElementById('project-body');
  if (!body) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Reading progress =====
  const bar = document.getElementById('read-progress');
  if (bar) {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ===== Headings: anchors + build-log rail =====
  const headings = Array.from(body.querySelectorAll('h2'));
  const slugify = (s) => s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');

  headings.forEach((h, i) => {
    if (!h.id) h.id = slugify(h.textContent) || `section-${i + 1}`;
    if (!h.querySelector('.anchor')) {
      const a = document.createElement('a');
      a.className = 'anchor';
      a.href = `#${h.id}`;
      a.setAttribute('aria-label', `Link to “${h.textContent.trim()}”`);
      a.textContent = '#';
      h.appendChild(a);
    }
  });

  const rail = document.getElementById('build-rail');
  const railList = document.getElementById('build-rail-list');
  if (rail && railList && headings.length >= 2) {
    const items = headings.map((h, i) => {
      const li = document.createElement('li');
      li.className = 'rail__item';
      const a = document.createElement('a');
      a.className = 'rail__link';
      a.href = `#${h.id}`;
      const label = h.cloneNode(true);
      label.querySelectorAll('.anchor').forEach((n) => n.remove());
      a.innerHTML = `<span class="rail__num">${String(i + 1).padStart(2, '0')}</span><span class="rail__text">${label.textContent.trim()}</span>`;
      li.appendChild(a);
      railList.appendChild(li);
      return li;
    });
    rail.hidden = false;

    // Scroll spy: the active section is the last heading above the fold line
    const setActive = () => {
      const line = window.innerHeight * 0.3;
      let activeIdx = 0;
      headings.forEach((h, i) => {
        if (h.getBoundingClientRect().top <= line) activeIdx = i;
      });
      items.forEach((li, i) => {
        li.classList.toggle('is-active', i === activeIdx);
        li.classList.toggle('is-done', i < activeIdx);
      });
    };
    window.addEventListener('scroll', setActive, { passive: true });
    setActive();
  }

  // ===== Code blocks: language sticker + copy button =====
  body.querySelectorAll('div.highlighter-rouge, pre.highlight').forEach((block) => {
    const wrapper = block.closest('div.highlighter-rouge') || block;
    if (wrapper.classList.contains('codeblock')) return;
    wrapper.classList.add('codeblock');

    const langClass = Array.from(wrapper.classList).find((c) => c.startsWith('language-'));
    const lang = langClass ? langClass.replace('language-', '') : '';

    const chrome = document.createElement('div');
    chrome.className = 'codeblock__chrome';
    chrome.innerHTML = `<span class="codeblock__lang">${lang || 'code'}</span>`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'codeblock__copy';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      const code = wrapper.querySelector('code') || wrapper.querySelector('pre');
      try {
        await navigator.clipboard.writeText(code ? code.innerText : '');
        btn.textContent = 'Copied ✓';
      } catch {
        btn.textContent = 'Nope';
      }
      setTimeout(() => (btn.textContent = 'Copy'), 1600);
    });
    chrome.appendChild(btn);
    wrapper.prepend(chrome);
  });

  // ===== Images: frame, caption from alt, lightbox =====
  body.querySelectorAll('p > img:only-child').forEach((img) => {
    const p = img.parentElement;
    const fig = document.createElement('figure');
    fig.className = 'prose__figure panel';
    fig.appendChild(img);
    if (img.alt) {
      const cap = document.createElement('figcaption');
      cap.textContent = img.alt;
      fig.appendChild(cap);
    }
    img.setAttribute('data-lightbox', '');
    img.loading = 'lazy';
    p.replaceWith(fig);
  });

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('.lightbox__img');
    const lbCap = lightbox.querySelector('.lightbox__caption');
    const close = () => {
      lightbox.hidden = true;
      document.body.style.overflow = '';
    };
    const open = (img) => {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || '';
      lbCap.textContent = img.alt || '';
      lbCap.hidden = !img.alt;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    };
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('[data-lightbox]') : null;
      if (target instanceof HTMLImageElement) {
        e.preventDefault();
        open(target);
      }
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || (e.target instanceof Element && e.target.closest('.lightbox__close'))) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lightbox.hidden) close();
    });
  }

  // ===== Section reveal (same feel as the homepage) =====
  if (!prefersReduced && 'IntersectionObserver' in window) {
    // Headings stay put so anchor scrolling lands exactly on them
    const targets = body.querySelectorAll('.prose__figure, .codeblock, blockquote, table');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in-view');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((el) => {
      el.setAttribute('data-reveal', '');
      io.observe(el);
    });
  }
})();
