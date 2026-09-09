/* Virtual ball rack: renders the case, the map, and the course list from BALLS. */

const STATE_NAMES = {
  OH: "Ohio", SC: "South Carolina", NC: "North Carolina", MI: "Michigan",
  AL: "Alabama", KY: "Kentucky", AZ: "Arizona", FL: "Florida", DC: "Washington, D.C.",
};

const rackEl = document.getElementById("rack");
const detailEl = document.getElementById("detail");
const statsEl = document.getElementById("stats");
const listEl = document.getElementById("course-list");

let map;
const markersByBall = new Map(); // ball index -> Leaflet marker
const ballEls = new Map();       // ball index -> button element
let selectedIdx = null;

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
  btn.title = ball.name + (ball.city ? ` — ${ball.city}, ${ball.state}` : "");
  btn.setAttribute("aria-label", btn.title);

  const mark = document.createElement("span");
  mark.className = "mark";
  mark.textContent = ball.mark;
  mark.style.color = ball.color;
  btn.appendChild(mark);

  if (ball.uncertain) {
    const flag = document.createElement("span");
    flag.className = "uncertain-flag";
    flag.title = "Best guess from the photo";
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
  el.classList.add("selected");
  if (pulse) {
    el.classList.remove("pulse");
    void el.offsetWidth; // restart animation
    el.classList.add("pulse");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  renderDetail(idx);
  highlightChips(idx);

  const marker = markersByBall.get(idx);
  if (marker) {
    if (flyTo) map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 8), { duration: 0.8 });
    marker.openPopup();
  }
}

function renderDetail(idx) {
  const b = BALLS[idx];
  detailEl.classList.remove("empty");
  const loc = b.city ? `${b.city}, ${STATE_NAMES[b.state] || b.state}` : (b.state ? STATE_NAMES[b.state] : "Location unknown");
  detailEl.innerHTML = `
    <div class="detail-ball" style="color:${b.color}">${escapeHtml(b.mark)}</div>
    <div class="detail-body">
      <h3>${escapeHtml(b.name)}</h3>
      <div class="loc">${escapeHtml(loc)}</div>
      ${b.detail ? `<div class="note">${escapeHtml(b.detail)}</div>` : ""}
      ${b.uncertain ? `<span class="badge uncertain">Best guess</span>` : ""}
      ${b.special ? `<span class="badge special">${b.special}</span>` : ""}
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// ---------- Map ----------
function buildMap() {
  map = L.map("map", { scrollWheelZoom: true });
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
    marker.bindPopup(
      `<b>${escapeHtml(b.name)}</b><br>${b.detail ? escapeHtml(b.detail) + "<br>" : ""}` +
      `${escapeHtml(b.city || "")}${b.city ? ", " : ""}${escapeHtml(b.state || "")}`
    );
    marker.on("click", () => selectBall(i, { pulse: true }));
    markersByBall.set(i, marker);
  }
  map.fitBounds(bounds.pad(0.12));
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
      chip.innerHTML = escapeHtml(name) + (idxs.length > 1 ? `<span class="n">&times;${idxs.length}</span>` : "");
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
  const stats = [
    [BALLS.length, "Balls"],
    [courses.size, "Courses"],
    [states.size, "States"],
  ];
  statsEl.innerHTML = stats
    .map(([n, l]) => `<div class="stat"><span class="num">${n}</span><span class="lbl">${l}</span></div>`)
    .join("");
}

buildRack();
buildMap();
buildCourseList();
buildStats();

window.addEventListener("load", () => {
  map.invalidateSize();
});
