# Blaha Labs — Master 3D Portfolio Build Prompt

You are the lead real-time 3D graphics engineer, technical artist, interaction designer, and performance engineer for an immersive web portfolio called **BLAHA LABS**.

Your job is to build a futuristic interactive maker-garage experience inspired by high-end Three.js portfolio worlds, but with an original visual identity:

- hard-sci-fi spacecraft maintenance bay
- futuristic maker garage
- orbital workshop
- advanced fabrication lab
- restrained holographic interfaces
- cinematic lighting
- believable engineering detail
- interactive project discovery

The garage itself is the website.

Do **not** build this as a normal webpage with a 3D background.
Do **not** make the entire environment procedurally from primitive `BoxGeometry`.
Use Blender for the world and Three.js for interactivity, rendering effects, shaders, camera choreography, and runtime systems.

---

## Core Architecture

Use this production model:

```text
Blender
   ↓
garage.glb
   ↓
Three.js
   ├── camera movement
   ├── holograms
   ├── screens
   ├── bloom
   ├── interactions
   ├── project content
   └── audio / ambient animation
```

Blender authors the environment.
Three.js turns it into an interactive world.

---

## Tech Stack

Prefer a modern stack built around:

- Three.js
- Vite
- GSAP
- GLSL shaders
- GLTFLoader
- DRACO or Meshopt compression
- KTX2 / Basis compressed textures
- EffectComposer
- UnrealBloomPass
- Raycaster
- OrbitControls
- lil-gui for debugging
- optional Howler or Web Audio API
- Blender for modeling, baking, UVs, lightmaps, and animation

Use WebGL first unless WebGPU creates a clear benefit without hurting compatibility.

---

## Initial Project Setup

Create the project:

```bash
npm create vite@latest blaha-labs -- --template vanilla
cd blaha-labs

npm install
npm install three gsap postprocessing lil-gui

npm run dev
```

Recommended structure:

```text
blaha-labs/
├── public/
│   ├── models/
│   │   └── garage.glb
│   ├── textures/
│   ├── videos/
│   ├── audio/
│   └── draco/
│
├── src/
│   ├── Experience/
│   │   ├── Experience.js
│   │   ├── Renderer.js
│   │   ├── CameraDirector.js
│   │   ├── Resources.js
│   │   ├── PerformanceManager.js
│   │   │
│   │   ├── World/
│   │   │   ├── Garage.js
│   │   │   ├── HologramSystem.js
│   │   │   ├── ScreenSystem.js
│   │   │   ├── Materials.js
│   │   │   └── AnimationSystem.js
│   │   │
│   │   ├── Interaction/
│   │   │   └── InteractionManager.js
│   │   │
│   │   ├── Effects/
│   │   │   └── PostProcessing.js
│   │   │
│   │   └── Audio/
│   │       └── AudioSystem.js
│   │
│   ├── shaders/
│   │   ├── hologram/
│   │   ├── screens/
│   │   ├── bloom/
│   │   └── transitions/
│   │
│   ├── main.js
│   └── style.css
│
├── AGENTS.md
├── index.html
└── package.json
```

---

## Visual Direction

The scene should feel like:

**a private maker garage upgraded into a near-future spacecraft engineering bay**

Blend:

- NASA / aerospace engineering
- advanced robotics lab
- compact fabrication workshop
- spacecraft maintenance bay
- premium industrial design
- restrained holographic UI
- slightly stylized architectural diorama

Avoid generic cyberpunk.

Do not flood the scene with RGB neon.

### Palette

Environment:

- charcoal
- graphite
- gunmetal
- dark aluminum
- carbon composite
- matte black

Lighting:

- cool white
- icy blue
- soft cyan

Accent lighting:

- warm amber
- small red/orange status lights

Holograms:

- cyan
- pale blue
- near-white cores

Primary hologram color:

```text
#42F2FF
```

---

## Environment Zones

### Center

- large fabrication workbench
- ultrawide monitor
- CAD workstation
- electronics projects
- robot prototypes
- tools
- parts trays
- holographic display

### Left Wall

- pegboard tools
- tool chest
- FDM 3D printer
- resin printer
- filament storage
- electronics components
- soldering tools
- calipers
- hand tools

### Right Wall

- golf engineering area
- golf clubs
- ferrules
- putter prototypes
- club-building tools
- launch-monitor-style equipment
- shaft / grip storage

### Rear Wall

- BLAHA LABS identity
- large holographic engineering model
- technical diagrams
- status screens
- spacecraft-like wall panels
- equipment racks

### Ceiling

- structural rails
- cable trays
- ventilation
- linear lights
- small robotic gantry
- suspended sensors
- exposed hard-sci-fi mechanical details

---

## Modeling Rules

Use Blender as the primary environment-authoring tool.

Do not model the finished garage entirely in JavaScript.

The environment must contain real visual detail:

- bevels
- panel seams
- inset surfaces
- recessed lighting
- fasteners
- vents
- cable routing
- service hatches
- layered panels
- structural ribs
- realistic wall thickness
- shelves
- rails
- mounts
- connectors
- labels
- storage bins
- machine housings

Avoid giant featureless cubes.

Every important edge should catch light.

If an object looks generic, improve it with:

- bevels
- chamfers
- mounting hardware
- seams
- vents
- cabling
- connectors
- labels
- fasteners
- layered construction

---

## Blender Naming Contract

Names are critical because the runtime will find objects by name.

Use predictable names such as:

```text
garageShell
floor
ceiling
workbench
projectTerminal
projectTerminalScreen
hologramProjector
hologramObject
printer01
printer02
golfRack
robotPrototype01
aboutTerminal
buildLogsTerminal
blahaLabsSign
neonBlue01
neonAmber01
mainMonitor
toolWall
machineRack
```

Three.js should be able to do:

```js
const terminal = model.getObjectByName('projectTerminal')
const hologram = model.getObjectByName('hologramObject')
```

Use grouped static meshes where possible.

Recommended top-level groups:

```text
garageShell
workbench
machines
floor
storage
graphics
props
screens
neon
interactiveObjects
```

---

## Blender Export Pipeline

Export from Blender as:

```text
File
→ Export
→ glTF 2.0
```

Use GLB whenever practical.

Recommended export options:

```text
Format: GLB
Apply Modifiers: ON
UVs: ON
Normals: ON
Materials: ON
Animations: ON
```

Save to:

```text
public/models/garage.glb
```

Three.js should load it with GLTFLoader.

Example:

```js
const loader = new GLTFLoader()

loader.load('/models/garage.glb', (gltf) => {
  scene.add(gltf.scene)
})
```

Compress final geometry with DRACO or Meshopt.

Compress textures with KTX2 / Basis.

---

## Lighting Strategy

This is one of the most important rules.

Do **not** rely on dozens of realtime lights and realtime shadows.

Prefer:

- Blender-authored lighting
- baked global illumination
- baked ambient occlusion
- baked indirect light
- baked shadows
- baked emissive contribution

Use baked textures on static geometry.

For most architecture, use:

```text
MeshBasicMaterial + baked texture
```

This keeps the scene rich while staying performant.

Reserve realtime materials and lights for:

- holograms
- screens
- glass
- hero objects
- moving machinery
- interactive highlights
- reflective surfaces
- status indicators

---

## Material Strategy

Use:

- baked `MeshBasicMaterial` for static environment groups
- `MeshMatcapMaterial` for selected mechanical props
- custom `ShaderMaterial` for holograms and screens
- PBR materials only where realtime material response actually matters

Avoid unnecessary physically-based materials on every static object.

---

## Selective Bloom

Bloom should be selective, not global.

Only designated objects should glow:

- cyan signs
- hologram projector
- hologram object
- screen edges
- small status LEDs
- selected light strips
- BLAHA LABS sign

Use:

- EffectComposer
- UnrealBloomPass
- a dedicated bloom layer

Initial tuning can start around:

```text
strength: 1.0–1.4
radius: 0.5–1.0
threshold: tune to scene
```

Do not use bloom to hide poor geometry or weak composition.

---

## Hologram System

Build a reusable `HologramSystem`.

Support:

1. point-cloud mode
2. wireframe mode
3. scan-line mode
4. grid projection
5. animated materialization
6. dematerialization
7. subtle glitch
8. opacity flicker
9. scan band
10. slow rotation

A hologram should be able to take an imported GLB mesh and convert it to a point representation.

Recommended technique:

- traverse the hologram model
- collect `position` buffers
- combine them
- create `THREE.Points`
- store `initialPosition`
- animate points away from and toward their initial positions

Expose shader uniforms such as:

```text
uTime
uColor
uSpeed
uGridFrequency
uGridThickness
uNoiseAmount
uOpacity
uScanPosition
```

The hologram base should use a custom GLSL grid shader.

Do not use a static PNG for the projector grid.

---

## Screen System

Screens are physical parts of the world.

Support:

- static textures
- animated textures
- video textures
- canvas textures
- dynamic project content

Create custom shader transitions:

- radial reveal
- horizontal wipe
- scanline transition
- noise dissolve
- boot-up flicker

Screens should be mounted in believable housings.

Do not make them look like floating web pages.

---

## Reflection Strategy

Use restrained polished-floor reflections.

Do not make the floor a perfect mirror.

Possible approaches:

- Three.js Reflector
- environment reflections
- screen-space reflection where practical

Keep opacity subtle.

Approximate target:

```text
0.03–0.08
```

The purpose is to catch:

- neon
- silhouettes
- major bright forms

not duplicate the entire world.

---

## Camera System

Build a `CameraDirector`.

The initial camera should reveal the garage as a premium interactive diorama.

Do not start with full free-flight controls.

Use constrained OrbitControls.

Define named camera poses such as:

```text
garageOverview
workbench
projects
about
golfEngineering
robotics
fabrication
buildLogs
```

Each camera pose should define:

```text
position
target
FOV
minDistance
maxDistance
minPolarAngle
maxPolarAngle
minAzimuthAngle
maxAzimuthAngle
```

Use GSAP transitions.

Typical transition duration:

```text
1.0–1.8 seconds
```

Suggested easing:

```text
power2.inOut
```

Camera movement should feel intentional and cinematic.

---

## Interaction System

Create a centralized `InteractionManager`.

Use:

```text
THREE.Raycaster
```

Each interactive object should register:

```text
mesh
hover behavior
click behavior
camera target
action
```

Hover feedback should be restrained:

- slight emissive increase
- subtle outline
- tiny holographic marker
- cursor change
- small screen response

Avoid cartoonish scaling unless it makes sense.

Clicking an object may:

- move camera
- activate a hologram
- change a screen
- open project details
- start machinery
- trigger sound
- play an animation

The majority of navigation should exist physically inside the world.

---

## Portfolio Navigation Concept

Examples:

### Projects Terminal

Click:

```text
projectTerminal
```

Then:

- camera flies toward workstation
- monitor boots into project selector
- project categories become available

### 3D Printer

Click:

```text
printer01
```

Then:

- camera moves toward fabrication area
- printer screen displays 3D printing projects
- selected model appears as hologram

### Golf Rack

Click:

```text
golfRack
```

Then:

- camera moves to golf engineering area
- project list includes ferrules, club builds, putters, launch-monitor tools, etc.

### Robot Prototype

Click:

```text
robotPrototype01
```

Then:

- camera focuses on robot
- engineering data appears
- robot performs a subtle idle movement

### About Terminal

Click:

```text
aboutTerminal
```

Then:

- camera moves toward personal workstation
- screen becomes an interactive About section

---

## Ambient Animation

The garage should feel alive without becoming visually noisy.

Use small animations such as:

- ventilation fan rotation
- tiny LEDs blinking
- hologram rotation
- subtle scanner movement
- robot-arm idle adjustment
- screen activity
- printer head movement
- diagnostic sequences
- slow machine motion
- small servo movement

Avoid constant exaggerated movement.

---

## Sound

Optional spatial audio:

- ventilation hum
- low electronics ambience
- servo sounds
- UI clicks
- printer motion
- hologram startup

Rules:

- no loud autoplay audio
- include a global mute control
- keep ambience subtle

---

## Performance Rules

Target smooth performance on:

- modern laptops
- modern phones
- integrated GPUs

Use:

- pixel ratio capped around 2
- compressed textures
- geometry compression
- joined static meshes
- texture atlases
- baked lighting
- frustum culling
- instancing for repeated props
- lazy loading
- LOD where useful
- minimal realtime lights
- minimal transparency
- optimized post-processing

Create three quality tiers:

```text
HIGH
MEDIUM
LOW
```

Reduce on lower tiers:

- bloom resolution
- reflection resolution
- texture resolution
- particle count
- shader complexity

Do not destroy the scene composition on low settings.

---

## Responsive Behavior

Desktop:

- full guided exploration
- wider camera movement
- richer effects

Mobile:

- more constrained camera
- simplified navigation
- lower particle count
- lower reflection quality
- fewer post-processing passes

Portrait mode should use dedicated camera compositions.

Do not simply shrink desktop coordinates.

---

## Loading Screen

Keep DOM UI minimal.

The loading screen may say:

```text
BLAHA LABS

INITIALIZING LAB
LOADING GEOMETRY
CALIBRATING SYSTEMS
ONLINE
```

Keep it clean and restrained.

---

## First Milestone — Vertical Slice

Do not build the whole garage first.

Build one polished vertical slice containing:

- garage shell
- central workbench
- BLAHA LABS sign
- one project terminal
- one hologram projector
- one holographic engineering model
- one animated machine
- selective bloom
- subtle floor reflection
- overview camera
- project closeup camera
- raycast interaction
- loading screen

The first experience should work like this:

```text
load page
    ↓
garage appears
    ↓
cyan lights bloom
    ↓
hologram materializes
    ↓
hover project terminal
    ↓
terminal highlights
    ↓
click
    ↓
camera flies toward it
    ↓
project UI appears on screen
```

Do not expand the environment until this vertical slice looks excellent.

---

## Build Order

After the vertical slice is polished, expand in this order:

```text
GARAGE SHELL
     ↓
WORKBENCH
     ↓
LIGHTING
     ↓
HOLOGRAM
     ↓
PROJECT TERMINAL
     ↓
3D PRINTING AREA
     ↓
ROBOTICS AREA
     ↓
GOLF ENGINEERING AREA
     ↓
SMALL DETAILS / PROPS
```

---

## Agent Workflow

Before writing large amounts of code:

1. inspect the existing codebase
2. identify the current framework and rendering setup
3. define scene architecture
4. define Blender / GLB asset contract
5. define object naming standards
6. define camera compositions
7. define interaction zones
8. define material categories
9. define performance budget
10. build the vertical slice

Do not attempt to solve missing 3D art with hundreds of primitive Three.js meshes.

Whenever something would be significantly better authored in Blender, say so clearly and specify exactly what Blender asset is needed.

---

## First Coding Task

Start with this implementation target:

```text
Read this entire prompt before coding.

Create the core Three.js architecture for Blaha Labs.

Build:

- Experience architecture
- renderer
- camera director
- GLB resource loader
- Garage scene loader
- InteractionManager using Raycaster
- selective bloom
- hologram shader system
- GSAP camera transitions
- responsive canvas
- debug controls

For temporary development, create simple placeholder geometry representing:

- garage shell
- workbench
- project terminal
- hologram projector

Architect everything so the placeholders can later be replaced by:

public/models/garage.glb

without rewriting the application.

Do not procedurally build the finished garage yet.

Run the project and fix all errors before finishing.

After the engine is working, document exactly what the first Blender garage.glb should contain, including:

- object names
- mesh groups
- UV requirements
- baked texture requirements
- materials
- interaction meshes
- scale
- origins
- transforms
- export settings
```

---

## Quality Bar

This must not look like:

- a generic Three.js demo
- a room made from cubes
- a cyberpunk template
- a portfolio with a 3D background
- a bloom-heavy neon toy

It should feel like:

**a believable hard-sci-fi maker garage that happens to be an interactive portfolio.**

The visual message should be:

> I design things.  
> I prototype them.  
> I code them.  
> I build them.

You are not just implementing graphics.

You are the technical-art director responsible for making the Blaha Labs world feel exceptional.
