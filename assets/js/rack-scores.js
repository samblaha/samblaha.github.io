/*
 * Local GHIN scorebook overlay for the virtual ball rack.
 *
 * The live page NEVER calls GHIN. A Python sync (scripts/sync_ghin.py) logs in
 * from a private machine, pulls score + handicap history read-only, and writes
 * assets/data/ghin-scores.json. This file fetches that JSON and fills SCOREBOOK.
 *
 * Empty / missing / invalid file → empty SCOREBOOK (balls show "No posted round").
 * Credentials do not belong in this file, any HTML, or committed config.
 *
 * Round fields (from the export):
 *   course       — BALLS[].name when mapped, otherwise the GHIN course_name
 *   detail       — optional; BALLS[].detail when a club has several balls
 *   date         — YYYY-MM-DD (played date)
 *   score        — adjusted gross / posted score
 *   tee          — tee name when GHIN sent one
 *   differential — optional score differential
 *   holes        — 9 or 18 (default 18)
 *   notes        — optional
 *   hole_by_hole — optional per-hole rows (stored, not drawn)
 */
var SCOREBOOK = [];
var GHIN_PROFILE = null;
var COURSE_ALIASES = {};

var SCOREBOOK_URL = "/assets/data/ghin-scores.json";
var SCOREBOOK_LOAD_MS = 4000;
var _scorebookPromise = null;

var COURSE_NOISE = {
  the: 1, at: 1, and: 1, a: 1, golf: 1, club: 1, country: 1, course: 1,
  links: 1, resort: 1, of: 1,
};

function normalizeCourseName(name) {
  var s = String(name || "").toLowerCase().replace(/&/g, " and ");
  s = s.replace(/\bg\.?c\.?\b/g, "golf club");
  s = s.replace(/\bc\.?c\.?\b/g, "country club");
  s = s.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

function significantCourseTokens(name) {
  return normalizeCourseName(name).split(" ").filter(function (t) {
    return t && !COURSE_NOISE[t];
  });
}

function applyGhinExport(data) {
  SCOREBOOK = [];
  GHIN_PROFILE = null;
  COURSE_ALIASES = {};
  if (!data || typeof data !== "object") return;

  var aliases = data.course_aliases;
  if (aliases && typeof aliases === "object" && !Array.isArray(aliases)) {
    COURSE_ALIASES = aliases;
  }

  if (data.profile && typeof data.profile === "object") {
    GHIN_PROFILE = data.profile;
  }

  var rounds = [];
  if (Array.isArray(data.rounds)) rounds = data.rounds;
  else if (Array.isArray(data)) rounds = data;

  SCOREBOOK = rounds
    .filter(function (r) { return r && typeof r === "object" && r.course; })
    .map(function (r) {
      var copy = {};
      for (var k in r) {
        if (Object.prototype.hasOwnProperty.call(r, k)) copy[k] = r[k];
      }
      var mapped = COURSE_ALIASES[copy.course];
      if (typeof mapped === "string" && mapped) copy.course = mapped;
      return copy;
    });
}

function handicapIndex() {
  var v = GHIN_PROFILE && GHIN_PROFILE.handicap_index;
  if (v == null || v === "" || v === "NH") return null;
  return String(v);
}

function loadScorebook() {
  if (typeof fetch !== "function") {
    applyGhinExport(null);
    return Promise.resolve();
  }
  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var timer = setTimeout(function () {
    try { if (ctrl) ctrl.abort(); } catch (e) { /* ignore */ }
  }, SCOREBOOK_LOAD_MS);
  var opts = { cache: "no-store" };
  if (ctrl) opts.signal = ctrl.signal;
  return fetch(SCOREBOOK_URL, opts)
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { applyGhinExport(data); })
    .catch(function () { applyGhinExport(null); })
    .then(function () { clearTimeout(timer); }, function () { clearTimeout(timer); });
}

function scoresReady() {
  if (!_scorebookPromise) _scorebookPromise = loadScorebook();
  return _scorebookPromise;
}

function _roundHaystack(round) {
  return normalizeCourseName(
    String(round.course || "") + " " + String(round.detail || "")
  );
}

function _roundTokens(round) {
  return significantCourseTokens(
    String(round.course || "") + " " + String(round.detail || "")
  );
}

function _tokenSetEqual(a, b) {
  if (a.length !== b.length) return false;
  var sa = a.slice().sort().join("\0");
  var sb = b.slice().sort().join("\0");
  return sa === sb;
}

function _tokenSubset(inner, outer) {
  if (!inner.length) return false;
  var bag = {};
  for (var i = 0; i < outer.length; i++) bag[outer[i]] = 1;
  return inner.every(function (t) { return bag[t]; });
}

function _detailMatchesHay(detail, hay, hayTokens) {
  var d = normalizeCourseName(detail || "");
  if (d && hay.indexOf(d) !== -1) return true;
  var dt = significantCourseTokens(detail || "");
  return dt.length > 0 && _tokenSubset(dt, hayTokens);
}

function _candidatePool(round, playable) {
  var hay = _roundHaystack(round);
  var hayTokens = _roundTokens(round);

  function nameExact(b) {
    return normalizeCourseName(b.name) === hay;
  }
  function tokenEq(b) {
    return hayTokens.length > 0
      && _tokenSetEqual(significantCourseTokens(b.name), hayTokens);
  }
  function contained(b) {
    var nt = significantCourseTokens(b.name);
    if (!nt.length || !hayTokens.length) return false;
    return _tokenSubset(nt, hayTokens) || _tokenSubset(hayTokens, nt);
  }

  var pool = playable.filter(nameExact);
  if (!pool.length) pool = playable.filter(tokenEq);
  if (!pool.length) pool = playable.filter(contained);
  return { pool: pool, hay: hay, hayTokens: hayTokens };
}

function _uniqueHit(pool, ball, hay, hayTokens) {
  if (pool.indexOf(ball) === -1) return false;
  var detailed = pool.filter(function (b) {
    return _detailMatchesHay(b.detail, hay, hayTokens);
  });
  if (detailed.length === 1) return detailed[0] === ball;
  var names = {};
  pool.forEach(function (b) { names[b.name] = true; });
  if (Object.keys(names).length === 1) return ball.name === pool[0].name;
  if (detailed.length === 0 && pool.length === 1) return pool[0] === ball;
  return false;
}

function roundMatchesBall(round, ball) {
  if (!round || !ball || ball.special) return false;

  var course = round.course;
  var hay = _roundHaystack(round);
  var hayTokens = _roundTokens(round);

  if (course === ball.name) {
    if (round.detail != null && round.detail !== "" && round.detail !== (ball.detail || "")) {
      return false;
    }
    return _disambiguateSiblings(hay, hayTokens, ball);
  }

  var list = typeof BALLS !== "undefined" && Array.isArray(BALLS) ? BALLS : [];
  var playable = list.filter(function (b) { return b && !b.special; });
  var found = _candidatePool(round, playable);
  return _uniqueHit(found.pool, ball, found.hay, found.hayTokens);
}

function _disambiguateSiblings(hay, hayTokens, ball) {
  var list = typeof BALLS !== "undefined" && Array.isArray(BALLS) ? BALLS : [];
  var siblings = list.filter(function (b) {
    return b !== ball && b.name === ball.name && !b.special;
  });
  if (!siblings.length) return true;

  var selfHit = _detailMatchesHay(ball.detail, hay, hayTokens);
  var sibHit = siblings.some(function (b) { return _detailMatchesHay(b.detail, hay, hayTokens); });
  if (selfHit) return true;
  if (sibHit) return false;
  return true;
}

function scoresForBall(ball) {
  if (!Array.isArray(SCOREBOOK)) return [];
  return SCOREBOOK.filter(function (s) { return roundMatchesBall(s, ball); })
    .slice()
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
}

function formatPostedDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  var months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  return months[Number(m[2]) - 1] + "/" + Number(m[3]) + "/" + m[1];
}

function latestScoreLine(scores) {
  if (!scores.length) return "";
  var s = scores[0];
  var bits = ["Posted " + s.score];
  if (s.date) bits.push(formatPostedDate(s.date));
  if (s.tee) bits.push(s.tee + " tees");
  if (s.holes && Number(s.holes) !== 18) bits.push(s.holes + " holes");
  return bits.join(" · ");
}

if (typeof window !== "undefined") {
  scoresReady();
}
