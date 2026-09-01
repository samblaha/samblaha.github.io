/* Desktop Labs · Field Notes — page-local behaviour.
   The engine (scrollcraft.js) stays untouched; everything bespoke here reads
   the act's published --sc-p or plain DOM state. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Under reduced motion the blueprint is rendered complete, so the pin has
  // nothing to spend four viewport-heights on. Shorten it before mounting.
  if (reduce) {
    var pinned = document.querySelector('#build[data-sc-act="pin"]');
    if (pinned) pinned.setAttribute('data-sc-span', '1.5');
  }

  ScrollCraft.mount(document.body);

  /* ---------------------------------------------------------- the folio --
     Chapter number and title in the margin, updating as chapters pass. */
  var folio = document.getElementById('folio');
  var folioChapter = document.getElementById('folio-chapter');
  var chapters = document.querySelectorAll('[data-lab-chapter]');

  if (folio && folioChapter && 'IntersectionObserver' in window) {
    var folioObserver = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        var el = entries[i].target;
        folioChapter.textContent = el.getAttribute('data-lab-chapter');
        folio.classList.toggle('folio--inverted', el.hasAttribute('data-lab-dark'));
      }
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });

    for (var c = 0; c < chapters.length; c++) folioObserver.observe(chapters[c]);
  }

  /* ------------------------------------------- the self-drawing blueprint --
     Signature move. Each [data-draw="from to"] stroke is drawn by scroll:
     dashoffset runs its length across its window of the act's --sc-p.
     Each [data-call="at"] group lands once progress passes its mark. */
  var svg = document.getElementById('lab-drawing');
  var act = svg ? svg.closest('[data-sc-act]') : null;
  var stage = svg ? svg.closest('[data-sc-stage]') : null;

  if (svg && act) {
    var strokes = [];
    var strokeEls = svg.querySelectorAll('[data-draw]');
    for (var s = 0; s < strokeEls.length; s++) {
      var el = strokeEls[s];
      var win = (el.getAttribute('data-draw') || '0 1').trim().split(/\s+/).map(parseFloat);
      var len = el.getTotalLength();
      strokes.push({ el: el, from: win[0] || 0, to: win[1] || 1, len: len });
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
    }

    var callouts = [];
    var calloutEls = svg.querySelectorAll('[data-call]');
    for (var k = 0; k < calloutEls.length; k++) {
      callouts.push({ el: calloutEls[k], at: parseFloat(calloutEls[k].getAttribute('data-call')) || 0 });
    }

    var annotation = document.getElementById('lab-annotation');
    var lastP = -1;
    var lastMove = performance.now();
    var restP = -1;          // where the reader actually stopped
    var annotationOn = false;

    function render(p) {
      for (var i = 0; i < strokes.length; i++) {
        var st = strokes[i];
        var t = (p - st.from) / Math.max(st.to - st.from, 0.001);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        st.el.style.strokeDashoffset = (st.len * (1 - t)).toFixed(2);
      }
      for (var j = 0; j < callouts.length; j++) {
        var co = callouts[j];
        // small hysteresis so a callout does not flicker on the boundary
        if (p >= co.at + 0.005) co.el.classList.add('bp-on');
        else if (p < co.at - 0.015) co.el.classList.remove('bp-on');
      }
    }

    if (reduce) {
      // Fewer and gentler, not zero: the finished drawing IS the content.
      render(1);
      if (stage) stage.setAttribute('data-sc-verify-hold', 'true');
    } else {
      var tick = function () {
        var p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
        if (p !== lastP) {
          render(p);
          // Publish the rendered timeline so the harness can see the stage
          // changing (the drawing lives outside the engine's own devices).
          if (stage) {
            var drawn = 0;
            for (var d = 0; d < strokes.length; d++) {
              var sd = strokes[d];
              drawn += Math.max(0, Math.min(1, (p - sd.from) / Math.max(sd.to - sd.from, 0.001)));
            }
            stage.setAttribute('data-sc-verify-state',
              'draw:' + (drawn / strokes.length).toFixed(3));
          }
          lastP = p;
        }
        // The dwell timer ignores sub-pixel settle: smooth wheel scrolling
        // keeps nudging p for a moment after the hand stops, and a timer that
        // resets on every nudge never fires for anyone with momentum scrolling.
        var moved = restP < 0 ? 1 : Math.abs(p - restP);
        if (moved > 0.004) {
          if (annotationOn && annotation && moved > 0.02) {
            annotation.classList.remove('bp-on');
            annotationOn = false;
          }
          restP = p;
          lastMove = performance.now();
        }
        if (annotation && finePointer && !annotationOn) {
          // The dwell reward: hold still mid-drawing and a margin note arrives.
          if (p > 0.3 && p < 0.9 && performance.now() - lastMove > 1400) {
            annotation.classList.add('bp-on');
            annotationOn = true;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
})();
