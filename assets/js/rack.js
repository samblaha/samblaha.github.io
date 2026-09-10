/* Virtual ball rack: renders the case, the map, and the course list from BALLS. */

const STATE_NAMES = {
  OH: "Ohio", SC: "South Carolina", NC: "North Carolina", MI: "Michigan",
  AL: "Alabama", KY: "Kentucky", AZ: "Arizona", FL: "Florida", DC: "Washington, D.C.",
};

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const rackEl = document.getElementById("rack");
const detailEl = document.getElementById("detail");
const statsEl = document.getElementById("stats");
const listEl = document.getElementById("course-list");

let map;
const markersByBall = new Map(); // ball index -> Leaflet marker
const ballEls = new Map();       // ball index -> button element
let selectedIdx = null;

function ballLocation(b) {
  return b.city
    ? `${b.city}, ${STATE_NAMES[b.state] || b.state}`
    : (b.state ? STATE_NAMES[b.state] : "Location unknown");
}

function appendBallFace(host, ball, { large = false } = {}) {
  const sphere = document.createElement("span");
  sphere.className = "ball__sphere";
  sphere.setAttribute("aria-hidden", "true");
  host.appendChild(sphere);

  const dimples = document.createElement("span");
  dimples.className = "ball__dimples";
  dimples.setAttribute("aria-hidden", "true");
  host.appendChild(dimples);

  const equator = document.createElement("span");
  equator.className = "ball__equator";
  equator.setAttribute("aria-hidden", "true");
  host.appendChild(equator);

  const highlight = document.createElement("span");
  highlight.className = "ball__highlight";
  highlight.setAttribute("aria-hidden", "true");
  host.appendChild(highlight);

  const mark = document.createElement("span");
  mark.className = "mark";
  mark.textContent = ball.mark;
  mark.style.color = ball.color;

  if (ball.logo) {
    const img = document.createElement("img");
    img.className = "ball__logo";
    img.src = ball.logo;
    img.alt = "";
    img.loading = large ? "eager" : "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      img.remove();
      host.classList.remove("ball--logo");
      host.classList.add("ball--stamp");
    });
    img.addEventListener("load", () => {
      host.classList.add("ball--logo");
      host.classList.remove("ball--stamp");
    });
    host.appendChild(img);
  } else {
    host.classList.add("ball--stamp");
  }
  host.appendChild(mark);
}

function scoreMarkup(ball) {
  const scores = typeof scoresForBall === "function" ? scoresForBall(ball) : [];
  if (!scores.length) {
    return `<div class="score-block score-block--empty">
      <span class="badge score-empty">No posted round on file</span>
    </div>`;
  }
  const latest = scores[0];
  const line = latestScoreLine(scores);
  const extra = scores.length > 1
    ? `<span class="score-count">${scores.length} rounds on file</span>`
    : "";
  const diff = latest.differential != null
    ? `<span class="score-diff">Diff ${escapeHtml(String(latest.differential))}</span>`
    : "";
  return `<div class="score-block">
    <span class="badge score-posted">${escapeHtml(line)}</span>
    ${extra}${diff}
  </div>`;
}

// ---------- Rack ----------
function buildRack() {
  for (let r = 1; r <= RACK_ROWS; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "rack-row";
    for (let c = 1; c <= RACK_COLS; c++) {
      const idx = BALLS.findIndex((b) => b.row === r && b.col === c);
      if (idx >= 0) {
        rowEl.appendChild(makeBall(idx));
      } else {
        const slot = document.createElement("div");
        slot.className = "slot";
        rowEl.appendChild(slot);
      }
    }
    rackEl.appendChild(rowEl);
    const shelf = document.createElement("div");
    shelf.className = "rack-shelf";
    rackEl.appendChild(shelf);
  }
}

function makeBall(idx) {
  const ball = BALLS[idx];
  const btn = document.createElement("button");
  btn.className = "ball";
  btn.type = "button";
  let label = ball.name + (ball.city ? ` — ${ball.city}, ${ball.state}` : "");
  if (ball.uncertain) label += " (best guess from the photo)";
  btn.title = label;
  btn.setAttribute("aria-label", label);

  appendBallFace(btn, ball);

  if (ball.uncertain) {
    const flag = document.createElement("span");
    flag.className = "uncertain-flag";
    flag.title = "Best guess from the photo";
    flag.setAttribute("aria-hidden", "true");
    btn.appendChild(flag);
  }

  btn.addEventListener("click", () => selectBall(idx, { flyTo: true }));
  ballEls.set(idx, btn);
  return btn;
}

// ---------- Selection ----------
function selectBall(idx, { flyTo = false, pulse = false } = {}) {
  if (selectedIdx !== null) ballEls.get(selectedIdx)?.classList.remove("selected");
  selectedIdx = idx;
  const el = ballEls.get(idx);
  if (!el) return;
  el.classList.add("selected");
  if (pulse) {
    el.classList.remove("pulse");
    void el.offsetWidth; // restart animation
    el.classList.add("pulse");
    el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "nearest" });
  }

  renderDetail(idx);
  highlightChips(idx);

  const marker = markersByBall.get(idx);
  if (marker && map) {
    if (flyTo) {
      const target = marker.getLatLng();
      const z = Math.max(map.getZoom(), 8);
      if (prefersReduced) map.setView(target, z, { animate: false });
      else map.flyTo(target, z, { duration: 0.8 });
    }
    marker.openPopup();
  }
}

function renderDetail(idx) {
  const b = BALLS[idx];
  detailEl.classList.remove("empty");
  const loc = ballLocation(b);

  detailEl.innerHTML = `
    <div class="detail-ball"></div>
    <div class="detail-body">
      <h3>${escapeHtml(b.name)}</h3>
      <div class="loc">${escapeHtml(loc)}</div>
      ${b.detail ? `<div class="note">${escapeHtml(b.detail)}</div>` : ""}
      ${scoreMarkup(b)}
      ${b.uncertain ? `<span class="badge uncertain">Best guess</span>` : ""}
      ${b.special ? `<span class="badge special">${escapeHtml(b.special)}</span>` : ""}
    </div>`;

  const face = detailEl.querySelector(".detail-ball");
  appendBallFace(face, b, { large: true });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function popupHtml(b) {
  const scores = typeof scoresForBall === "function" ? scoresForBall(b) : [];
  const scoreLine = scores.length ? `<div class="popup-score">${escapeHtml(latestScoreLine(scores))}</div>` : "";
  return (
    `<b>${escapeHtml(b.name)}</b><br>${b.detail ? escapeHtml(b.detail) + "<br>" : ""}` +
    `${escapeHtml(b.city || "")}${b.city ? ", " : ""}${escapeHtml(b.state || "")}` +
    scoreLine
  );
}

// ---------- Map ----------
function buildMap() {
  const mapHost = document.getElementById("map");
  if (!mapHost || typeof L === "undefined") return;

  map = L.map("map", { scrollWheelZoom: false });
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  const located = BALLS.map((b, i) => [b, i]).filter(([b]) => b.lat != null);
  const bounds = L.latLngBounds(located.map(([b]) => [b.lat, b.lng]));

  // Spread markers that share near-identical coordinates so all stay clickable.
  const seen = new Map();
  for (const [b, i] of located) {
    const key = `${b.lat.toFixed(3)},${b.lng.toFixed(3)}`;
    const n = seen.get(key) || 0;
    seen.set(key, n + 1);
    const jitter = n * 0.006;

    const icon = L.divIcon({
      className: "ball-pin",
      html: '<div class="pin-inner">\u26f3</div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const marker = L.marker([b.lat + jitter, b.lng + jitter], { icon }).addTo(map);
    marker.bindPopup(popupHtml(b));
    marker.on("click", () => selectBall(i, { pulse: true }));
    markersByBall.set(i, marker);
  }
  if (located.length) map.fitBounds(bounds.pad(0.12));

  const container = map.getContainer();
  container.addEventListener("focus", () => map.scrollWheelZoom.enable());
  container.addEventListener("blur", () => map.scrollWheelZoom.disable());
  map.on("click", () => {
    map.scrollWheelZoom.enable();
    container.focus({ preventScroll: true });
  });
}

// ---------- Course list ----------
function buildCourseList() {
  const byState = new Map();
  BALLS.forEach((b, i) => {
    const st = b.state || "??";
    if (!byState.has(st)) byState.set(st, new Map());
    const courses = byState.get(st);
    if (!courses.has(b.name)) courses.set(b.name, []);
    courses.get(b.name).push(i);
  });

  const order = [...byState.keys()].sort((a, b) => {
    if (a === "??") return 1;
    if (b === "??") return -1;
    return byState.get(b).size - byState.get(a).size;
  });

  for (const st of order) {
    const courses = byState.get(st);
    const group = document.createElement("div");
    group.className = "state-group";
    const head = document.createElement("div");
    head.className = "state-head";
    head.innerHTML = `${st === "??" ? "Unidentified" : STATE_NAMES[st] || st} <span class="count">&mdash; ${courses.size} course${courses.size > 1 ? "s" : ""}</span>`;
    group.appendChild(head);

    const items = document.createElement("div");
    items.className = "course-items";
    for (const [name, idxs] of [...courses.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "course-chip";
      if (BALLS[idxs[0]].lat == null) chip.classList.add("no-pin");
      chip.dataset.indices = idxs.join(",");
      const hasScore = idxs.some((i) => (typeof scoresForBall === "function" ? scoresForBall(BALLS[i]) : []).length);
      chip.innerHTML = escapeHtml(name)
        + (idxs.length > 1 ? `<span class="n">&times;${idxs.length}</span>` : "")
        + (hasScore ? `<span class="n score-dot" title="Posted round on file">●</span>` : "");
      chip.addEventListener("click", () => selectBall(idxs[0], { flyTo: true, pulse: true }));
      items.appendChild(chip);
    }
    group.appendChild(items);
    listEl.appendChild(group);
  }
}

function highlightChips(idx) {
  const name = BALLS[idx].name;
  document.querySelectorAll(".course-chip").forEach((chip) => {
    const idxs = chip.dataset.indices.split(",").map(Number);
    chip.classList.toggle("selected", idxs.some((i) => BALLS[i].name === name));
  });
}

// ---------- Stats ----------
function buildStats() {
  const courses = new Set(BALLS.filter((b) => !b.special).map((b) => b.name));
  const states = new Set(BALLS.filter((b) => b.state).map((b) => b.state));
  const posted = typeof SCOREBOOK !== "undefined"
    ? SCOREBOOK.length
    : 0;
  const stats = [
    [BALLS.length, "Balls"],
    [courses.size, "Courses"],
    [states.size, "States"],
    [posted, "Posted rounds"],
  ];
  statsEl.innerHTML = stats
    .map(([n, l]) => `<div class="stat"><span class="num">${n}</span><span class="lbl">${l}</span></div>`)
    .join("");
}

buildRack();
try {
  buildMap();
} catch (err) {
  map = undefined;
}
buildCourseList();
buildStats();

function refreshMapSize() {
  if (map) map.invalidateSize();
}

window.addEventListener("load", refreshMapSize);
window.addEventListener("themechange", refreshMapSize);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(refreshMapSize).catch(() => {});
}
