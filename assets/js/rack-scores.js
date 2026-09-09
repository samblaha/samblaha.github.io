/*
 * Local scorebook overlay for the virtual ball rack.
 *
 * GHIN (USGA Golf Handicap and Information Network) does not offer a public
 * consumer API for posted round scores. Partner APIs are licensed to clubs
 * and vendors (Value Added Service Providers / Golfer Product Access). The
 * public USGA Handicap ID lookup (https://handicapidlookup.usga.org/) emails
 * a golfer their GHIN number — it does not return scorecards. ghin.com
 * golfer lookup requires a GHIN login and is not used here.
 *
 * No GHIN number is published in this repo or in Sam's related public golf
 * repos (Open-Golf-Index-Network, golf-swing-weight-calculator, Golf).
 * Open-Golf-Index-Network is an independent open-index project, not GHIN.
 *
 * Scores on the rack are transcribed from posted rounds and kept in this
 * file. Match by `course` === BALLS[].name; optional `detail` further
 * scopes a round to one tee/layout on a multi-course club. Paste new
 * scorecards here when rounds are posted.
 *
 * Fields:
 *   course       — exact BALLS[].name
 *   detail       — optional; exact BALLS[].detail when a club has several balls
 *   date         — YYYY-MM-DD (posted date)
 *   score        — adjusted gross / posted score
 *   tee          — tee name (White, Blue, …)
 *   differential — optional score differential
 *   holes        — 9 or 18 (default 18)
 *   notes        — optional
 */
const SCOREBOOK = [
  // Empty on purpose: no posted-round scores are in the public repos.
  // Do not invent scores. When a GHIN scorecard is available, add it here.
];

/*
 * Placeholder examples — commented so they never render as real rounds.
 * Copy into SCOREBOOK and replace with actual posted data:
 *
 * { course: "Muirfield Village Golf Club", date: "2025-07-12", score: 84, tee: "White", differential: 12.4 },
 * { course: "Ohio State University Golf Club", date: "2025-06-03", score: 88, tee: "White", holes: 18 },
 * { course: "Pinehurst Resort", date: "2025-04-18", score: 91, tee: "White", notes: "No. 2" },
 */

function scoresForBall(ball) {
  if (typeof SCOREBOOK === "undefined" || !Array.isArray(SCOREBOOK)) return [];
  return SCOREBOOK.filter((s) => {
    if (s.course !== ball.name) return false;
    if (s.detail != null && s.detail !== (ball.detail || "")) return false;
    return true;
  }).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function formatPostedDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  const months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  return `${months[Number(m[2]) - 1]}/${Number(m[3])}/${m[1]}`;
}

function latestScoreLine(scores) {
  if (!scores.length) return "";
  const s = scores[0];
  const bits = [`Posted ${s.score}`];
  if (s.date) bits.push(formatPostedDate(s.date));
  if (s.tee) bits.push(`${s.tee} tees`);
  return bits.join(" · ");
}
