# Blaha Labs scene contract

The first workshop slice is authored by `scripts/build_lab_asset.py` in Blender,
exported as `garage.glb`, and loaded by `assets/js/garage3d/lab.js`.
`garage.blend` is the editable source. Jekyll and the Markdown project collection
remain the content system; no Vite migration is required.

## Required objects

- `projectTerminal`: the red Blaha Cola dispenser housing outside the right wall;
  raycast opens the project browser.
- `projectTerminalScreen`: empty at the center of the screen. Runtime creates a
  0.74 × 1.46 metre plane with ordinary 0–1 UVs. Runtime copies both its world
  position and rotation so the screen follows the outward-facing dispenser.
- `hologramObject`: turbine mesh with child blades. Runtime replaces its materials
  with the scan-line shader. Keep its origin at its rotational center.
- `printer01`: moving print head and fabrication interaction target.
- `hologramProjector`, `floor`, `garageShell`, `workbench`, `machineRack`,
  `blahaLabsSign`, `neonBlue01`: retained semantic names for future extensions.
- `accessGrantedSign` and `rootOnlineSign`: physical security-status signs. The
  root sign shares its pulse with a magenta runtime point light.
- `static_*`: static meshes batched by material. Do not merge interaction targets
  or animated meshes into these groups.

## Authoring and export

One unit is one metre. Blender uses Z-up; glTF export converts to Three.js Y-up.
The open front faces Three.js +Z. Apply mesh scale and modifiers on export;
retain intentional animation pivots. Export GLB with materials, normals and UVs.
The screen anchor's local +Z axis defines the approach direction for the camera.

Run from the repository root:

```
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 -P scripts/build_lab_asset.py
sh scripts/build_garage_3d.sh
bundle exec jekyll build
```

## Current limits and next art pass

This is a modeled first slice, not the complete master-plan environment. It uses
PBR materials, one shadow-casting directional light, restrained threshold bloom,
four local accent lights, a scan-line turbine shader, a procedural projector grid,
modeled cable runs, hazard rails, and wall diagnostics. It does not yet
include baked GI/AO, dedicated bloom layers, floor reflections, KTX2 textures,
Meshopt compression, point-cloud materialization, or explicit quality selection.
The orbit is intentionally unrestricted horizontally. The exterior rear shell
therefore includes service panels, vents, conduits, utility boxes, and a rear
access marker instead of presenting a blank backing wall.
Mobile caps pixel ratio at 1.5, disables shadows, and renders at 30 fps. Desktop
caps pixel ratio at 1.75 and renders at 45 fps. These are caps, not measured FPS.

For the production art pass: unwrap static groups into non-overlapping UV atlases
with padding, bake direct/indirect lighting and AO into sRGB color maps, and use
MeshBasicMaterial for those baked groups. Keep emissive strips, screen, turbine
and moving machinery separate. Validate compression against this naming contract
and retain the uncompressed Blender source. Target a compressed scene under 5 MB,
under 100 visible draw calls, and test on a physical integrated-GPU laptop and phone.
