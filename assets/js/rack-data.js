/*
 * Ball collection data — transcribed from the physical display case photo.
 * Rack layout: 9 columns x 13 rows (rows 1–8 full with 9 balls,
 * row 9 has 6 balls centered-right, rows 10–13 empty).
 *
 * Each ball:
 *   mark      — short text shown on the ball face (like the logo stamp)
 *   color     — logo ink color
 *   name      — course / club name
 *   detail    — course or note detail
 *   city / state / lat / lng — location (omitted when unknown)
 *   uncertain — logo was hard to read in the photo; best guess
 *   special   — "photo" | "autograph" | "novelty"
 */
const BALLS = [
  // ---- Row 1 ----
  { row: 1, col: 1, mark: "Barefoot", color: "#a8842c", name: "Barefoot Resort & Golf", detail: "Norman Course", city: "North Myrtle Beach", state: "SC", lat: 33.8161, lng: -78.7159 },
  { row: 1, col: 2, mark: "Port Royal", color: "#b03a2e", name: "Port Royal Golf Club", detail: "Barony Course", city: "Hilton Head Island", state: "SC", lat: 32.2163, lng: -80.6857 },
  { row: 1, col: 3, mark: "?", color: "#6b4fa0", name: "Mystery Ball", detail: "Small purple logo — help me identify it!", uncertain: true },
  { row: 1, col: 4, mark: "Links", color: "#1e5631", name: "New Albany Links Golf Club", detail: "", city: "New Albany", state: "OH", lat: 40.0961, lng: -82.7752 },
  { row: 1, col: 5, mark: "MV", color: "#14432a", name: "Muirfield Village Golf Club", detail: "Home of the Memorial Tournament", city: "Dublin", state: "OH", lat: 40.1279, lng: -83.1450 },
  { row: 1, col: 6, mark: "Brick Landing", color: "#b03a2e", name: "The Links at Brick Landing", detail: "", city: "Ocean Isle Beach", state: "NC", lat: 33.9110, lng: -78.4807 },
  { row: 1, col: 7, mark: "OSU", color: "#8c1515", name: "Ohio State University Golf Club", detail: "Scarlet & Gray Courses", city: "Columbus", state: "OH", lat: 40.0093, lng: -83.0862 },
  { row: 1, col: 8, mark: "Woodland", color: "#5a4a1f", name: "Woodland Golf Club", detail: "Oak tree logo", uncertain: true },
  { row: 1, col: 9, mark: "Golden Bear", color: "#a8842c", name: "Golden Bear Golf Club at Indigo Run", detail: "", city: "Hilton Head Island", state: "SC", lat: 32.2400, lng: -80.7210 },

  // ---- Row 2 ----
  { row: 2, col: 1, mark: "Dye Club", color: "#a8842c", name: "The Dye Club at Barefoot Resort", detail: "", city: "North Myrtle Beach", state: "SC", lat: 33.8210, lng: -78.7080 },
  { row: 2, col: 2, mark: "Barefoot", color: "#a8842c", name: "Barefoot Resort & Golf", detail: "Fazio Course", city: "North Myrtle Beach", state: "SC", lat: 33.8130, lng: -78.7220 },
  { row: 2, col: 3, mark: "Dublin", color: "#7a1f2b", name: "Golf Club of Dublin", detail: "", city: "Dublin", state: "OH", lat: 40.1113, lng: -83.1319 },
  { row: 2, col: 4, mark: "Ohio", color: "#d4a017", name: "Mystery Ohio Course", detail: "Yellow Ohio-outline logo with flagstick", state: "OH", uncertain: true },
  { row: 2, col: 5, mark: "Blackhawk", color: "#4a2c1a", name: "Blackhawk Golf Club", detail: "", city: "Galena", state: "OH", lat: 40.2039, lng: -82.8544 },
  { row: 2, col: 6, mark: "Red Oaks", color: "#2f5d3a", name: "Red Oaks", detail: "Oak-leaf shield logo", uncertain: true },
  { row: 2, col: 7, mark: "100th", color: "#a8842c", name: "100th Anniversary Ball", detail: "Club centennial commemorative", uncertain: true },
  { row: 2, col: 8, mark: "Links", color: "#8c2f4e", name: "The Links at Echo Springs", detail: "", city: "Johnstown", state: "OH", lat: 40.1297, lng: -82.6629 },
  { row: 2, col: 9, mark: "The Pearl", color: "#8a7b4f", name: "The Pearl Golf Links", detail: "", city: "Sunset Beach", state: "NC", lat: 33.8880, lng: -78.5430 },

  // ---- Row 3 ----
  { row: 3, col: 1, mark: "Elks Run", color: "#a8842c", name: "Elks Run Golf Club", detail: "", city: "Batavia", state: "OH", lat: 39.0834, lng: -84.1350 },
  { row: 3, col: 2, mark: "K", color: "#1e5631", name: "Kinsale Golf & Fitness Club", detail: "Green K-shield logo", city: "Powell", state: "OH", lat: 40.1926, lng: -83.0900, uncertain: true },
  { row: 3, col: 3, mark: "CT", color: "#2c2c2c", name: "Cumberland Trail Golf Club", detail: "", city: "Pataskala", state: "OH", lat: 40.0329, lng: -82.7350 },
  { row: 3, col: 4, mark: "Denison", color: "#8c1515", name: "Denison Golf Club", detail: "Granville Inn course", city: "Granville", state: "OH", lat: 40.0730, lng: -82.5350 },
  { row: 3, col: 5, mark: "Tiger's Eye", color: "#5a4a1f", name: "Tiger's Eye Golf Links", detail: "Big Cats — Ocean Ridge Plantation", city: "Sunset Beach", state: "NC", lat: 33.9100, lng: -78.4330 },
  { row: 3, col: 6, mark: "Timberview", color: "#2e6da4", name: "Timberview Golf Club", detail: "", city: "Marysville", state: "OH", lat: 40.2360, lng: -83.3670, uncertain: true },
  { row: 3, col: 7, mark: "SCC 1896", color: "#3a3a3a", name: "Springfield Country Club", detail: "Est. 1896", city: "Springfield", state: "OH", lat: 39.9300, lng: -83.8500 },
  { row: 3, col: 8, mark: "K", color: "#2c3e6b", name: "Mystery 'K' Ball", detail: "Navy square K monogram", uncertain: true },
  { row: 3, col: 9, mark: "1927", color: "#1e6e50", name: "Brookside Golf & Country Club", detail: "Est. 1927", city: "Columbus", state: "OH", lat: 40.0850, lng: -83.0930, uncertain: true },

  // ---- Row 4 ----
  { row: 4, col: 1, mark: "Shaker Run", color: "#1e5631", name: "Shaker Run Golf Club", detail: "Apple-tree logo", city: "Lebanon", state: "OH", lat: 39.4680, lng: -84.2700 },
  { row: 4, col: 2, mark: "A.J. Jolly", color: "#2f5d3a", name: "A.J. Jolly Golf Course", detail: "", city: "Alexandria", state: "KY", lat: 38.9170, lng: -84.3830 },
  { row: 4, col: 3, mark: "Darby Creek", color: "#1e5631", name: "Darby Creek Golf Course", detail: "", city: "Marysville", state: "OH", lat: 40.1830, lng: -83.3000 },
  { row: 4, col: 4, mark: "Bent Tree", color: "#2c2c2c", name: "Bent Tree Golf Club", detail: "", city: "Sunbury", state: "OH", lat: 40.2510, lng: -82.8620 },
  { row: 4, col: 5, mark: "The Vineyard", color: "#2e8b9a", name: "The Vineyard Golf Course", detail: "", city: "Cincinnati", state: "OH", lat: 39.0530, lng: -84.3310 },
  { row: 4, col: 6, mark: "Aston Oaks", color: "#3a3a3a", name: "Aston Oaks Golf Club", detail: "", city: "North Bend", state: "OH", lat: 39.1580, lng: -84.7450 },
  { row: 4, col: 7, mark: "Foxfire", color: "#b03a2e", name: "Foxfire Golf Club", detail: "", city: "Lockbourne", state: "OH", lat: 39.8100, lng: -82.9770 },
  { row: 4, col: 8, mark: "NACC", color: "#7a1f2b", name: "New Albany Country Club", detail: "", city: "New Albany", state: "OH", lat: 40.0710, lng: -82.8020 },
  { row: 4, col: 9, mark: "Arrowhead", color: "#8c1515", name: "Arrowhead Country Club", detail: "", city: "Myrtle Beach", state: "SC", lat: 33.7270, lng: -78.9330, uncertain: true },

  // ---- Row 5 ----
  { row: 5, col: 1, mark: "Legendary Run", color: "#1e3a6b", name: "Golf Club at Legendary Run", detail: "", city: "Cincinnati", state: "OH", lat: 39.0620, lng: -84.2720 },
  { row: 5, col: 2, mark: "Shepherd's Hollow", color: "#8c1515", name: "Shepherd's Hollow Golf Club", detail: "", city: "Clarkston", state: "MI", lat: 42.7720, lng: -83.4430 },
  { row: 5, col: 3, mark: "Glenross", color: "#8a7b4f", name: "Glenross Golf Club", detail: "", city: "Delaware", state: "OH", lat: 40.2580, lng: -83.0520 },
  { row: 5, col: 4, mark: "Leopard's Chase", color: "#5a4a1f", name: "Leopard's Chase Golf Club", detail: "Big Cats — Ocean Ridge Plantation", city: "Ocean Isle Beach", state: "NC", lat: 33.9180, lng: -78.4430 },
  { row: 5, col: 5, mark: "Reunion", color: "#2f5d3a", name: "Reunion Resort & Golf Club", detail: "Palm-tree logo", city: "Kissimmee", state: "FL", lat: 28.2720, lng: -81.6020, uncertain: true },
  { row: 5, col: 6, mark: "Panther's Run", color: "#1e5631", name: "Panther's Run Golf Links", detail: "Big Cats — Ocean Ridge Plantation", city: "Ocean Isle Beach", state: "NC", lat: 33.9210, lng: -78.4380 },
  { row: 5, col: 7, mark: "Glen Dornoch", color: "#7a1f2b", name: "Glen Dornoch Waterway Golf Links", detail: "", city: "Little River", state: "SC", lat: 33.8710, lng: -78.6440 },
  { row: 5, col: 8, mark: "Clover Valley", color: "#3bb143", name: "Clover Valley Golf Club", detail: "Shamrock logo", city: "Johnstown", state: "OH", lat: 40.1010, lng: -82.7180 },
  { row: 5, col: 9, mark: "King's North", color: "#1e5631", name: "King's North at Myrtle Beach National", detail: "Arnold Palmer design", city: "Myrtle Beach", state: "SC", lat: 33.7490, lng: -78.9700 },

  // ---- Row 6 — Robert Trent Jones Golf Trail, Alabama ----
  { row: 6, col: 1, mark: "PHOTO", color: "#5a7a9a", name: "Custom Photo Ball", detail: "A round with the crew — printed keepsake", special: "photo" },
  { row: 6, col: 2, mark: "RTJ Valley", color: "#2c2c2c", name: "RTJ Trail — Oxmoor Valley", detail: "Valley Course", city: "Birmingham", state: "AL", lat: 33.4240, lng: -86.8570 },
  { row: 6, col: 3, mark: "RTJ Lake", color: "#2c2c2c", name: "RTJ Trail — Grand National", detail: "Lake Course", city: "Opelika", state: "AL", lat: 32.6800, lng: -85.4210 },
  { row: 6, col: 4, mark: "RTJ Links", color: "#2c2c2c", name: "RTJ Trail — Grand National", detail: "Links Course", city: "Opelika", state: "AL", lat: 32.6770, lng: -85.4160 },
  { row: 6, col: 5, mark: "RTJ Short", color: "#2c2c2c", name: "RTJ Trail — Grand National", detail: "Short Course", city: "Opelika", state: "AL", lat: 32.6750, lng: -85.4250 },
  { row: 6, col: 6, mark: "Backbreaker", color: "#2c2c2c", name: "RTJ Trail Novelty Ball", detail: "\u201cBackbreaker \u2022 Heartbreaker \u2022 Mindbreaker\u201d", state: "AL", special: "novelty" },
  { row: 6, col: 7, mark: "The Senator", color: "#2c2c2c", name: "RTJ Trail — Capitol Hill", detail: "The Senator", city: "Prattville", state: "AL", lat: 32.4850, lng: -86.4440 },
  { row: 6, col: 8, mark: "RTJ Ridge", color: "#2c2c2c", name: "RTJ Trail — Oxmoor Valley", detail: "Ridge Course", city: "Birmingham", state: "AL", lat: 33.4200, lng: -86.8640 },
  { row: 6, col: 9, mark: "\u270d", color: "#1e3a6b", name: "Autographed Ball", detail: "Signed by a pro — signature ball", special: "autograph" },

  // ---- Row 7 — Northern Michigan (Boyne country) ----
  { row: 7, col: 1, mark: "The Patriot", color: "#1e3a6b", name: "The Patriot Golf Club", detail: "Eagle & flag logo", uncertain: true },
  { row: 7, col: 2, mark: "Chikaming", color: "#1e5631", name: "Chikaming Country Club", detail: "Clubhouse logo", city: "Lakeside", state: "MI", lat: 41.8480, lng: -86.6650, uncertain: true },
  { row: 7, col: 3, mark: "Doon Brae", color: "#c9a227", name: "Doon Brae at The Highlands", detail: "9-hole short course", city: "Harbor Springs", state: "MI", lat: 45.4700, lng: -84.9280 },
  { row: 7, col: 4, mark: "Boyne Mtn", color: "#2e6da4", name: "Boyne Mountain Resort", detail: "The Alpine / The Monument", city: "Boyne Falls", state: "MI", lat: 45.1630, lng: -84.9300 },
  { row: 7, col: 5, mark: "The Highlands", color: "#2f5d3a", name: "The Highlands", detail: "Formerly Boyne Highlands", city: "Harbor Springs", state: "MI", lat: 45.4680, lng: -84.9330 },
  { row: 7, col: 6, mark: "Boyne Highlands", color: "#2c2c2c", name: "Boyne Highlands Resort", detail: "Heather \u2022 Moor \u2022 Donald Ross Memorial", city: "Harbor Springs", state: "MI", lat: 45.4660, lng: -84.9370 },
  { row: 7, col: 7, mark: "Bay Harbor", color: "#1e3a6b", name: "Bay Harbor Golf Club", detail: "Links \u2022 Quarry \u2022 Preserve", city: "Bay Harbor", state: "MI", lat: 45.3620, lng: -85.0520 },
  { row: 7, col: 8, mark: "Boyne Mtn", color: "#c0392b", name: "Boyne Mountain Resort", detail: "Resort-crest ball", city: "Boyne Falls", state: "MI", lat: 45.1650, lng: -84.9280 },
  { row: 7, col: 9, mark: "Crooked Tree", color: "#2f5d3a", name: "Crooked Tree Golf Club", detail: "", city: "Petoskey", state: "MI", lat: 45.3640, lng: -85.0270 },

  // ---- Row 8 — Pinehurst area & Arizona ----
  { row: 8, col: 1, mark: "Pinehurst 1895", color: "#1e5631", name: "Pinehurst Resort", detail: "Putter Boy — est. 1895", city: "Pinehurst", state: "NC", lat: 35.1890, lng: -79.4690 },
  { row: 8, col: 2, mark: "Tobacco Road", color: "#5a4a1f", name: "Tobacco Road Golf Club", detail: "Mike Strantz design", city: "Sanford", state: "NC", lat: 35.3620, lng: -79.1310 },
  { row: 8, col: 3, mark: "Legacy", color: "#c9a227", name: "Legacy Golf Links", detail: "Jack Nicklaus II design", city: "Aberdeen", state: "NC", lat: 35.1030, lng: -79.4280 },
  { row: 8, col: 4, mark: "Southern Pines", color: "#2c2c2c", name: "Southern Pines Golf Club", detail: "Donald Ross design", city: "Southern Pines", state: "NC", lat: 35.1620, lng: -79.4030 },
  { row: 8, col: 5, mark: "St. Albans", color: "#8c1515", name: "St. Albans Golf Club", detail: "", city: "Alexandria", state: "OH", lat: 40.0840, lng: -82.6000 },
  { row: 8, col: 6, mark: "The Ridge", color: "#2f5d3a", name: "The Ridge Golf & Gardens", detail: "", uncertain: true },
  { row: 8, col: 7, mark: "Coronado", color: "#a8842c", name: "Coronado Golf Course", detail: "", city: "Scottsdale", state: "AZ", lat: 33.4640, lng: -111.9170 },
  { row: 8, col: 8, mark: "Phoenician", color: "#3a3a3a", name: "The Phoenician Golf Club", detail: "", city: "Scottsdale", state: "AZ", lat: 33.5010, lng: -111.9440 },
  { row: 8, col: 9, mark: "P", color: "#c9a227", name: "Mystery 'P' Ball", detail: "Gold flame P logo — Arizona trip?", uncertain: true },

  // ---- Row 9 (6 balls) ----
  { row: 9, col: 3, mark: "Ross Bridge", color: "#2f5d3a", name: "RTJ Trail — Ross Bridge", detail: "Renaissance Ross Bridge", city: "Hoover", state: "AL", lat: 33.3630, lng: -86.8710 },
  { row: 9, col: 4, mark: "Eagle's Pointe", color: "#5a4a1f", name: "Eagle's Pointe Golf Club", detail: "Davis Love III design", city: "Bluffton", state: "SC", lat: 32.2620, lng: -80.9280 },
  { row: 9, col: 5, mark: "East Potomac", color: "#b03a2e", name: "East Potomac Golf Links", detail: "Hains Point", city: "Washington", state: "DC", lat: 38.8650, lng: -77.0230 },
  { row: 9, col: 6, mark: "Stonelick Hills", color: "#1e6e50", name: "Stonelick Hills Golf Club", detail: "", city: "Batavia", state: "OH", lat: 39.1050, lng: -84.0610, uncertain: true },
  { row: 9, col: 7, mark: "Chippewa", color: "#5a4a1f", name: "Chippewa Golf Club", detail: "", city: "Doylestown", state: "OH", lat: 40.9620, lng: -81.7100, uncertain: true },
  { row: 9, col: 8, mark: "Crow Creek", color: "#2c2c2c", name: "Crow Creek Golf Club", detail: "", city: "Calabash", state: "NC", lat: 33.9040, lng: -78.5940 },
];

const RACK_COLS = 9;
const RACK_ROWS = 13; // 9 filled + 4 empty, like the physical case
