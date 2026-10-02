# Blaha Labs scene contract

The first workshop slice is authored by `scripts/build_lab_asset.py` in Blender,
exported as `garage.glb`, and loaded by `assets/js/garage3d/lab.js`.
`garage.blend` is the editable source. Jekyll and the Markdown project collection
remain the content system; no Vite migration is required.

## Required objects

- `projectDispenser` / `projectTerminal`: soda-cabinet geometry from the first
  art pass. Runtime hides the group (no Blender rebuild). Do not delete the
  names until a later bezel pass replaces them.
- `projectTerminalScreen`: retained empty for asset compatibility. Runtime no
  longer copies its pose for the project browser.
- `hologramObject`: turbine mesh with child blades. Runtime replaces its materials
  with the scan-line shader. Keep its origin at its rotational center.
- `printer01`: moving print head and fabrication interaction target.
- `hologramProjector`, `floor`, `garageShell`, `workbench`, `machineRack`,
  `blahaLabsSign`, `neonBlue01`: retained semantic names for future extensions.
- `accessGrantedSign` and `rootOnlineSign`: physical security-status signs. The
  root sign shares its pulse with a magenta runtime point light.
- `static_*`: static meshes batched by material. Do not merge interaction targets
  or animated meshes into these groups.

## Runtime project wall and hologram

The project browser is a landscape wall plane created in `lab.js`, not a Blender
mesh:

- Size: 4.36 × 4.90 metres, covering the +X exterior bulkhead (Blender
    `Side bulkhead` is 4.4 × 5.0 m at `(5.3, 2.5, −0.8)`). Canvas 2560 × 2880,
    ordinary 0–1 UVs. A few centimetres of edge inset avoid z-fighting the
    bulkhead, floor, and ceiling rail.
- Pose: full right exterior side wall (+X), facing the walkway / orbit camera
    (+X), not the workbench or rear shell. World center approximately
    `(5.58, 2.50, −0.80)` with `rotation.y = +π/2`. Stands in for the hidden
    Blaha Cola cabinet.
- Hit target: `userData.action = 'arcade-select'`. Tile picks use canvas UV
  regions `{ id, x, y, w, h, index }` from `vending-screen.js`.
- Camera: `cameraPosition` / `lookTarget` frame this wall, not the hidden CRT.

Clicking a tile spawns a hologram group from that UV → world point
(`hologram-screen.js`):

- Glass panel ~1.4 × 1.8 m with a canvas texture and additive scan-line shader
  (same cyan family as `hologramObject`).
- Optional miniature from `assets/models/miniatures/<slug>.glb` using the same
  hologram material, floating in front of the panel.
- Animates scale 0.05 → 1 and lifts ~0.6 m toward the camera (~500 ms). Orbit is
  off while open. Escape, the CLOSE hit, or an empty-garage click reverses it
  and returns to the wall framing pose.
- This hologram is the project screen. Do not open a DOM overlay or navigate to
  `/p/<slug>/` from the wall or inventory. Standalone posts remain for shared URLs.

## Authoring and export

One unit is one metre. Blender uses Z-up; glTF export converts to Three.js Y-up.
The open front faces Three.js +Z. Apply mesh scale and modifiers on export;
retain intentional animation pivots. Export GLB with materials, normals and UVs.

Run from the repository root:

```
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 -P scripts/build_lab_asset.py
sh scripts/build_garage_3d.sh
bundle exec jekyll build
```

Rebuild `assets/js/garage3d.bundle.js` after any `assets/js/garage3d/` edit.

## Current limits and next art pass

This is a modeled first slice, not the complete master-plan environment. It uses
PBR materials, one shadow-casting directional light, restrained threshold bloom,
four local accent lights, a scan-line turbine shader, a procedural projector grid,
modeled cable runs, hazard rails, and wall diagnostics. It does not yet
include baked GI/AO, dedicated bloom layers, floor reflections, KTX2 textures,
Meshopt compression, point-cloud holograms, or explicit quality selection.
The orbit is intentionally unrestricted horizontally. The exterior rear shell
therefore includes service panels, vents, conduits, utility boxes, and a rear
access marker instead of presenting a blank backing wall.
A later art pass can replace the runtime wall plane with a modeled bezel and
remove the hidden soda cabinet from the GLB.
Mobile caps pixel ratio at 1.5, disables shadows, and renders at 30 fps. Desktop
caps pixel ratio at 1.75 and renders at 45 fps. These are caps, not measured FPS.

For the production art pass: unwrap static groups into non-overlapping UV atlases
with padding, bake direct/indirect lighting and AO into sRGB color maps, and use
MeshBasicMaterial for those baked groups. Keep emissive strips, screen, turbine
and moving machinery separate. Validate compression against this naming contract
and retain the uncompressed Blender source. Target a compressed scene under 5 MB,
under 100 visible draw calls, and test on a physical integrated-GPU laptop and phone.
