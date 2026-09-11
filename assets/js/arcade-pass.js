(function (root) {
  'use strict';

  var PASS_KEY = 'blaha-arcade-pass';
  var HS_KEY = 'blaha-arcade-hs';
  var EVENT = 'blaha-pass-change';

  /* Thresholds vs current scoring:
   * Snake +10 per blob → 80 = eight eats on a 24×16 board (doable, not a fluke).
   * Laser Gates +1 per window → 8 gates is a short clean flight as speed ramps.
   * Chip Match: 8 pairs, perfect is 8 moves; 12 allows four misses. */
  var CHALLENGES = [
    {
      id: 'snake',
      game: 'snake',
      stamp: 'HOT IRON',
      title: 'Hot iron',
      brief: 'Feed the iron eight blobs in one run. Don’t short the board.',
      hint: 'Solder Snake · 80 pts',
      minScore: 80,
    },
    {
      id: 'lasers',
      game: 'lasers',
      stamp: 'GATE TIME',
      title: 'Gate time',
      brief: 'Thread eight timing windows before the flyer gets sliced.',
      hint: 'Laser Gates · 8 gates',
      minScore: 8,
    },
    {
      id: 'match',
      game: 'match',
      stamp: 'CLEAN BENCH',
      title: 'Clean bench',
      brief: 'Clear the chip tray in twelve moves or fewer.',
      hint: 'Chip Match · ≤12 moves',
      maxMoves: 12,
    },
  ];

  function emptyPass() {
    return { v: 1, stamps: {}, unlocked: false, unlockedAt: null, bootSeen: false };
  }

  function asStamp(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var at = Number(raw.at);
    var out = { at: Number.isFinite(at) && at > 0 ? Math.floor(at) : 1 };
    var score = Number(raw.score);
    if (Number.isFinite(score) && score >= 0) out.score = Math.floor(score);
    var moves = Number(raw.moves);
    if (Number.isFinite(moves) && moves >= 0) out.moves = Math.floor(moves);
    return out;
  }

  function normalizePass(raw) {
    var pass = emptyPass();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return pass;
    CHALLENGES.forEach(function (ch) {
      var stamp = asStamp(raw.stamps && raw.stamps[ch.id]);
      if (stamp) pass.stamps[ch.id] = stamp;
    });
    var punched = CHALLENGES.every(function (ch) {
      return !!pass.stamps[ch.id];
    });
    pass.unlocked = punched;
    var unlockedAt = Number(raw.unlockedAt);
    pass.unlockedAt = punched && Number.isFinite(unlockedAt) && unlockedAt > 0 ? Math.floor(unlockedAt) : (punched ? 1 : null);
    pass.bootSeen = raw.bootSeen === true;
    return pass;
  }

  function punchedCount(pass) {
    var n = 0;
    CHALLENGES.forEach(function (ch) {
      if (pass && pass.stamps && pass.stamps[ch.id]) n += 1;
    });
    return n;
  }

  function isComplete(pass) {
    return punchedCount(pass) >= CHALLENGES.length;
  }

  function challengeForGame(gameId) {
    var i;
    for (i = 0; i < CHALLENGES.length; i += 1) {
      if (CHALLENGES[i].game === gameId || CHALLENGES[i].id === gameId) return CHALLENGES[i];
    }
    return null;
  }

  function qualifies(challenge, run) {
    if (!challenge || !run || typeof run !== 'object') return false;
    if (challenge.minScore != null) {
      var score = Number(run.score);
      if (!Number.isFinite(score) || score < challenge.minScore) return false;
    }
    if (challenge.maxMoves != null) {
      var moves = Number(run.moves);
      if (run.cleared !== true) return false;
      if (!Number.isFinite(moves) || moves < 1 || moves > challenge.maxMoves) return false;
    }
    return true;
  }

  function getStore(storage) {
    if (storage) return storage;
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (err) {
      return null;
    }
    return null;
  }

  function loadPass(storage) {
    var store = getStore(storage);
    if (!store) return emptyPass();
    try {
      return normalizePass(JSON.parse(store.getItem(PASS_KEY) || 'null'));
    } catch (err) {
      return emptyPass();
    }
  }

  function savePass(pass, storage) {
    var store = getStore(storage);
    if (!store) return false;
    try {
      store.setItem(PASS_KEY, JSON.stringify(pass));
      return true;
    } catch (err) {
      return false;
    }
  }

  function emit(pass) {
    if (typeof root.dispatchEvent !== 'function' || typeof root.CustomEvent !== 'function') return;
    try {
      root.dispatchEvent(new root.CustomEvent(EVENT, { detail: pass }));
    } catch (err) {
      /* ignore */
    }
  }

  function noteRun(gameId, run, storage) {
    var challenge = challengeForGame(gameId);
    var pass = loadPass(storage);
    var punched = [];
    var justUnlocked = false;
    var payload = run && typeof run === 'object' ? run : {};

    if (challenge && qualifies(challenge, payload) && !pass.stamps[challenge.id]) {
      var stamp = { at: Date.now() };
      var score = Number(payload.score);
      if (Number.isFinite(score) && score >= 0) stamp.score = Math.floor(score);
      var moves = Number(payload.moves);
      if (Number.isFinite(moves) && moves >= 0) stamp.moves = Math.floor(moves);
      pass.stamps[challenge.id] = stamp;
      punched.push(challenge.id);
    }

    if (!pass.unlocked && isComplete(pass)) {
      pass.unlocked = true;
      pass.unlockedAt = Date.now();
      justUnlocked = true;
    }

    if (punched.length || justUnlocked) savePass(pass, storage);
    if (punched.length || justUnlocked) emit(pass);

    return {
      pass: pass,
      punched: punched,
      justUnlocked: justUnlocked,
      complete: isComplete(pass),
    };
  }

  function markBootSeen(storage) {
    var pass = loadPass(storage);
    if (pass.bootSeen) return pass;
    pass.bootSeen = true;
    savePass(pass, storage);
    emit(pass);
    return pass;
  }

  function stampLabel(id) {
    var ch = challengeForGame(id);
    return ch ? ch.stamp : id;
  }

  function fillMark(el, challenge, stamp) {
    if (!el) return;
    if (stamp) {
      if (challenge.maxMoves != null && stamp.moves != null) {
        el.textContent = 'Punched · ' + stamp.moves + ' moves';
      } else if (stamp.score != null) {
        el.textContent = 'Punched · ' + stamp.score;
      } else {
        el.textContent = 'Punched';
      }
    } else {
      el.textContent = 'Open slot';
    }
  }

  function fillCta(el, pass) {
    if (!el) return;
    var doc = el.ownerDocument;
    el.replaceChildren();
    if (isComplete(pass)) {
      var link = doc.createElement('a');
      link.className = 'btn btn--solder';
      link.href = '/lab/';
      link.textContent = 'Back room is open →';
      el.appendChild(link);
      var note = doc.createElement('span');
      note.className = 'pass__cta-note';
      note.textContent = 'Season card complete. The after-hours bench is yours in this browser.';
      el.appendChild(note);
    } else {
      var left = CHALLENGES.length - punchedCount(pass);
      var p = doc.createElement('span');
      p.className = 'pass__cta-note';
      p.textContent = left === CHALLENGES.length
        ? 'Three jobs. One back-room key. The lab stays dark until every stamp is punched.'
        : (left === 1
          ? 'One slot left on the card. Punch it and the back room opens.'
          : left + ' slots left. The back room stays latched.');
      el.appendChild(p);
    }
  }

  function paintPassBoards(pass, doc) {
    var documentRef = doc || (typeof document !== 'undefined' ? document : null);
    if (!documentRef) return;
    var state = pass || loadPass();
    var count = punchedCount(state);
    documentRef.querySelectorAll('[data-arcade-pass]').forEach(function (board) {
      board.classList.toggle('is-complete', isComplete(state));
      var countEl = board.querySelector('[data-pass-count]');
      if (countEl) countEl.textContent = String(count);
      var totalEl = board.querySelector('[data-pass-total]');
      if (totalEl) totalEl.textContent = String(CHALLENGES.length);
      CHALLENGES.forEach(function (ch) {
        var row = board.querySelector('[data-pass-stamp="' + ch.id + '"]');
        if (!row) return;
        var stamp = state.stamps[ch.id];
        row.classList.toggle('is-punched', !!stamp);
        fillMark(row.querySelector('[data-pass-mark]'), ch, stamp);
      });
      fillCta(board.querySelector('[data-pass-cta]'), state);
    });
  }

  function revealLabChrome(pass, doc) {
    var documentRef = doc || (typeof document !== 'undefined' ? document : null);
    if (!documentRef) return;
    var open = !!(pass && pass.unlocked);
    if (documentRef.documentElement) {
      documentRef.documentElement.classList.toggle('is-lab-open', open);
    }
    documentRef.querySelectorAll('[data-lab-entry]').forEach(function (el) {
      if (open) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
    });
  }

  function syncChrome() {
    var pass = loadPass();
    paintPassBoards(pass);
    revealLabChrome(pass);
  }

  function init() {
    syncChrome();
    if (typeof root.addEventListener === 'function') {
      root.addEventListener(EVENT, function (ev) {
        var pass = ev && ev.detail ? normalizePass(ev.detail) : loadPass();
        paintPassBoards(pass);
        revealLabChrome(pass);
      });
    }
  }

  var api = {
    PASS_KEY: PASS_KEY,
    HS_KEY: HS_KEY,
    EVENT: EVENT,
    CHALLENGES: CHALLENGES,
    emptyPass: emptyPass,
    normalizePass: normalizePass,
    punchedCount: punchedCount,
    isComplete: isComplete,
    isUnlocked: function (storage) {
      return loadPass(storage).unlocked === true;
    },
    qualifies: qualifies,
    challengeForGame: challengeForGame,
    loadPass: loadPass,
    savePass: savePass,
    noteRun: noteRun,
    markBootSeen: markBootSeen,
    stampLabel: stampLabel,
    paintPassBoards: paintPassBoards,
    revealLabChrome: revealLabChrome,
    syncChrome: syncChrome,
  };

  root.BlahaArcadePass = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
