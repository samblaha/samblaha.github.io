# Blaha Labs — Digital Maker Garage Redesign Plan

## North star

Turn the portfolio into one authored, explorable digital workshop where the room itself is the navigation. A visitor should feel as if Sam has just stepped away from a late-night build: the soldering iron is still warm, a printer is mid-job, monitors show active agents, parts are labeled in drawers, and each real project exists as a specific object with signs of use.

This is not an open-world game and not a traditional page decorated like a garage. It is a focused, cinematic portfolio interface built around one richly detailed space.

## What changes

- Remove the arcade experience, season pass, game navigation, game scripts, and game-specific tests.
- Remove the constellation, sky language, star-map navigation, and world/map metaphors.
- Replace the homepage card grid and long section stack with a single garage scene plus an accessible project index.
- Keep the existing Jekyll project collection, project URLs, write-ups, media, RSS, metadata, and the virtual golf ball rack.
- Preserve the best parts of the current identity: warm after-hours energy, phosphor/copper accents, tactile instruments, real build data, and playful engineering details.
- Treat the Retro Pi entry as a maker project rather than a playable site game. It remains in the archive unless explicitly removed later.

## Experience model

### Arrival

The page opens at a partially raised garage door. A short, skippable power-up moment reveals the bench in layers: overhead task light, monitor glow, printer status light, then small ambient motion. The visitor immediately sees Sam's name, a one-line positioning statement, and a clear `Enter the garage` action.

No long fake terminal log and no mandatory wait. Returning visitors enter instantly. Reduced-motion visitors get a clean static reveal.

### The main scene

The desktop experience is one room-sized tableau viewed from a human-height, slightly off-center camera. Movement is constrained and intentional: pointer movement creates shallow parallax; scroll or wheel moves between three camera positions; clicking an object performs a close-up. There is no free-roaming avatar, horizon, sky, map, or game-like HUD.

The scene has three readable depths:

1. Foreground workbench — newest and most tactile builds.
2. Midground tool wall and monitor stack — project archive, software, AI agents, experiments.
3. Background archive shelf and garage details — older projects, biography, process, contact, and hidden moments.

### Past-project archive shelf

A dedicated `Past Projects / Build Archive` shelf makes the full portfolio visible inside the room. Older builds live in labeled cubbies as recognizable artifacts—small enclosures, laptops, boards, jigs, tins, and build-log binders—with year/name tags and quiet status lights. Selecting a cubby opens its project close-up; a physical `Open full project inventory` control opens `/portfolio/` for fast browsing. This keeps the newest work active on the main bench while giving shipped and older work a permanent, obvious home.

### Project interactions

Projects appear as believable workshop artifacts, not cards:

- DIY Delta 3D Printer: the physical printer, with a looping toolhead and a clipped build label.
- Golf Ball Printer: a marked ball held in a small jig; rotate or inspect it to reveal the write-up.
- Virtual Golf Ball Rack: the actual wall rack, retaining the dedicated interactive rack experience.
- Guppy: a small Raspberry Pi voice-assistant enclosure with a breathing status LED and waveform.
- Pi-Pentester: the opened portable tin beside a coiled cable and a tiny terminal readout.
- Rebuilt Kali MacBook: a scarred laptop on a side shelf, booted to a restrained diagnostic screen.
- Quantum RNG: a breadboard/prototype module under a clear parts-bin lid with changing output.
- OpenPage e-reader: the current work-in-progress on the center bench with notes and parts around it.
- Caesar Cipher: a label-maker or terminal utility on a compact secondary monitor.
- Retro Pi: a finished Raspberry Pi build in the archive shelf, with no playable game attached to the site.

Hover/focus gives an immediate label and status. Click/tap creates an object close-up with title, one-sentence story, role, year, and `Open build log`. The full project article remains a real route, so the scene never has to carry dense reading.

### Secondary navigation

A compact tool-tag rail provides direct access to `Garage`, `All builds`, `About Sam`, and `Contact`. It is visually integrated into the scene but remains normal semantic navigation. A `Project drawer` opens a fast, filterable list for visitors who want efficiency over exploration.

Mobile uses a composed vertical tour of the same garage rather than shrinking or forcing 3D navigation. Each scene crop contains one or two interactive artifacts. All content and project links remain available without WebGL.

## Three visual directions to explore

### Workbench POV

The most intimate direction. The camera is seated at the main bench, with tools and projects within arm's reach. Macro detail, shallow depth of field, warm practical lighting, and layered monitor glow make the space feel real and personal. Navigation happens through object close-ups and a small physical label rail.

### Sectioned Garage Cutaway

A wider architectural composition showing several zones at once: fabrication bench, electronics wall, agent monitors, golf-tech shelf, and archive storage. The scene reads quickly and offers stronger wayfinding, while still feeling like a lived-in room rather than a menu floating in space.

### Diagnostic Rail

A cinematic side-on bench that the camera tracks along. Projects sit in stations connected by real cables, pegboard rails, and power strips. Scrolling feels like sliding a workshop inspection camera, with close-up vignettes and transitions instead of free navigation.

## Visual language

- Materials: scratched black powder-coated steel, birch plywood, pegboard, translucent parts bins, braided cables, masking-tape labels, resin prints, fingerprints, dust, and worn rubber mats.
- Light: tungsten task lamps and cool monitor/phosphor spill, with a restrained orange status accent. Avoid generic neon-purple cyberpunk.
- Color: charcoal, warm wood, aged cream, oxidized copper, phosphor mint, safety orange, and occasional tool-brand colors.
- Type: one confident grotesk for interface copy plus one technical mono for labels and readouts. Handwritten notes appear sparingly as texture, not body text.
- Motion: fans drift, LEDs breathe, a printer head moves, oscilloscope traces respond, cable shadows shift, and labels lift subtly on hover. No constant spectacle.
- Imperfection: asymmetry, half-finished assemblies, labeled drawers, coffee ring, spare fasteners, a crooked sticker, and one or two personal Easter eggs.

## Information architecture

- `/` — immersive garage and direct project drawer.
- `/portfolio/` — accessible full archive, reframed as the parts/project inventory.
- `/p/<slug>/` — existing build logs, visually updated but content-preserved.
- `/rack/` — existing golf-ball rack experience, linked from its physical object.
- `/#about` — concise bio and working philosophy, surfaced from the back wall or shop notebook.
- `mailto`/contact — a clearly visible, real contact action with the placeholder address replaced before launch.

Retire `/arcade/`, `/constellation/`, and `/lab/`. Add explicit redirect or tombstone handling if inbound traffic exists; do not leave orphaned navigation.

## Technical approach

Keep Jekyll as the content and routing layer. Build the garage as progressive enhancement so project write-ups and links remain durable.

- Add a dedicated `garage` homepage layout and a structured scene-data include derived from `site.projects`.
- Use a lightweight Three.js scene for the desktop hero/tableau, with locally hosted compressed GLB assets and textures.
- Use authored camera stops, ray-cast hotspots, and DOM-based accessible labels rather than free movement or a canvas-only interface.
- Use real project photography as monitor textures, pinned photos, and close-up media; reserve generated 3D assets for the room shell and missing props.
- Keep interface text and project detail in HTML overlays so it is selectable, indexable, responsive, and screen-reader friendly.
- Provide a static scene image and complete DOM inventory when WebGL is unavailable or data-saver/reduced-motion is active.
- Lazy-load the 3D runtime after the initial poster and essential HTML. Load higher-detail textures only when a camera stop is approached.

### Performance budgets

- Useful first paint under 2 seconds on a typical mobile connection.
- Initial scene payload target under 2.5 MB compressed; deferred detail budget under 8 MB.
- Stable 30+ FPS on mid-range mobile and 50–60 FPS on modern desktop.
- Cap device pixel ratio, pause rendering when hidden, and avoid per-frame DOM layout reads.
- Use KTX2/Basis textures, Draco or Meshopt geometry compression, instancing for repeated bins/tools, and baked lighting where possible.

## Accessibility and usability guardrails

- Every interactive prop has a keyboard-focusable DOM counterpart with the same name and action.
- `Skip scene` and `View all builds` are visible from the first screen.
- No essential information depends on hover, sound, color, or WebGL.
- Respect reduced motion, data saver, contrast preferences, and touch input.
- Preserve predictable browser back behavior when entering and leaving project close-ups.
- Announce selected project details without moving keyboard focus unexpectedly.

## Content and asset work

1. Audit every project entry for accurate titles, dates, status, media, links, and missing hero assets.
2. Photograph the actual workspace, tools, unfinished assemblies, parts bins, notes, and prototypes where possible.
3. Create a project-to-prop inventory with dimensions, materials, interaction, and required 3D/media assets.
4. Replace placeholder contact information and resolve the `laser-timing-gates` filename/title mismatch for OpenPage without breaking its public URL.
5. Write concise object labels and one-sentence project hooks; keep detailed writing in the build logs.

## Delivery phases

### Phase 1 — Direction and prototype

- Choose one of the three visual directions.
- Produce a desktop hero frame, a project close-up state, and a mobile composition.
- Prototype camera movement, one project object, project drawer, reduced-motion mode, and keyboard flow.
- Validate legibility, novelty, and interaction cost before modeling the full room.

### Phase 2 — Scene foundation

- Build the room shell, lighting, camera stops, input model, HTML overlay system, and fallback poster.
- Connect scene hotspots to real Jekyll project data.
- Implement performance monitoring and device-quality tiers early.

### Phase 3 — Project objects

- Ship the five strongest props first: OpenPage, Delta printer, Golf Ball Printer, Guppy, and Pi-Pentester.
- Add remaining projects as recognizable shelf and bench artifacts.
- Integrate real photos, videos, and the existing rack route.

### Phase 4 — Site-wide migration

- Restyle project articles and portfolio inventory around the new garage system.
- Remove arcade, constellation, lab gate, dead CSS/JS, local-storage game data, and related tests.
- Add redirects/tombstones and update metadata, README, feed links, navigation, and analytics events.

### Phase 5 — Polish and launch

- Add sound only as an opt-in ambient layer after the silent experience is complete.
- Add two or three hidden interactions that reward curiosity but never block content.
- Test real devices, keyboard and screen readers, slow networks, WebGL failure, reduced motion, and touch.
- Run visual QA at desktop, tablet, and mobile sizes; then deploy behind a reversible launch commit.

## Success criteria

- A visitor can describe the site as “Sam's digital maker garage,” not “a portfolio with a workshop theme.”
- The first meaningful project is discoverable within 10 seconds without instructions.
- All projects are reachable in two actions through either the scene or project drawer.
- The experience is memorable without requiring gameplay, free-roam navigation, or a sky/world metaphor.
- The room communicates range—hardware, AI, fabrication, golf tech, security, software—while still feeling like one person's real workspace.
- Mobile and accessibility fallbacks feel intentionally designed, not like reduced versions of the desktop scene.

## First implementation slice

Build only the arrival, primary bench camera, OpenPage object, Guppy object, project drawer, and static fallback. This slice is enough to prove the interaction model, visual tone, performance envelope, content pipeline, and mobile strategy before committing to the complete 3D asset set.
