/*
 * Local GHIN scorebook overlay for the virtual ball rack.
 *
 * The live page NEVER calls GHIN (no api2, no browser login).
 * scripts/sync_ghin.py runs on a private machine, maps GHIN course_name →
 * BALLS[].name, and writes assets/data/scorebook.json. This file fetches that
 * JSON and fills SCOREBOOK. Missing/empty/invalid → empty SCOREBOOK.
 *
 * Join (same as before): course === ball.name, plus optional detail.
 * Mapping/aliases live in the sync script, not here.
 *
 * Round fields:
 *   course, date, score, differential
 *   detail?, tee?, holes?, notes?   — Bit SCOREBOOK shape; no GHIN# / PII
 */
var SCOREBOOK = [];
var GHIN_PROFILE = null;

var SCOREBOOK_URL = "/assets/data/scorebook.json";
var SCOREBOOK_LOAD_MS = 4000;
var _scorebookPromise = null;

var SCOREBOOK_KEYS = ["course", "date", "score", "differential", "detail", "tee", "holes", "notes"];

function sanitizeRound(r) {
  if (!r || typeof r !== "object" || !r.course) return null;
  var out = {};
  for (var i = 0; i < SCOREBOOK_KEYS.length; i++) {
    var k = SCOREBOOK_KEYS[i];
    if (r[k] != null && r[k] !== "") out[k] = r[k];
  }
  return out.course ? out : null;
}

function applyGhinExport(data) {
  SCOREBOOK = [];
  GHIN_PROFILE = null;
  if (!data || typeof data !== "object") return;

  if (data.profile && typeof data.profile === "object") {
    GHIN_PROFILE = {
      handicap_index: data.profile.handicap_index,
      low_hi: data.profile.low_hi,
      low_hi_date: data.profile.low_hi_date,
      rev_date: data.profile.rev_date,
    };
  }

  var rounds = [];
  if (Array.isArray(data.rounds)) rounds = data.rounds;
  else if (Array.isArray(data)) rounds = data;

  SCOREBOOK = rounds.map(sanitizeRound).filter(Boolean);
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

function scoresForBall(ball) {
  if (!Array.isArray(SCOREBOOK) || !ball) return [];
  return SCOREBOOK.filter(function (s) {
    if (s.course !== ball.name) return false;
    if (s.detail != null && s.detail !== "" && s.detail !== (ball.detail || "")) return false;
    return true;
  }).slice().sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
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
