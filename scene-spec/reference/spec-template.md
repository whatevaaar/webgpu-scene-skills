# Plantilla generalizada del spec

Rellena los `{{...}}`. Las secciones PRIORITIES, CONSTRAINTS, CONTROLS, VERIFICATION y DONE
WHEN son **invariantes** — cópialas tal cual. Sólo SCENE y TARGET cambian por escena.

El SCENE debe quedar en inglés, denso y concreto, con la densidad de `default-underwater.md`:
una línea por elemento, cada una con color/forma/comportamiento específico.

---

Build a real-time {{THEME}} scene that runs in the browser. It only needs to look beautiful
and let me fly a free camera through it.

PRIORITIES (in this order when they conflict)
1. Visual quality
2. Stable frame pacing at the target spec
3. Small bundle size

CONSTRAINTS
- No Three.js/Babylon.js or other engines.
- WebGPU rendered.
- Everything procedural: no texture/model files. Deliverable is a single self-contained
  index.html. Report minified size.
- Zero per-frame JS allocations (no GC stutter). Preallocate all buffers.

TARGET
- {{OS_BROWSER}}, {{GPU}}, {{CPU}}, {{REFRESH}} monitor
- {{RESOLUTION}} at full resolution. GPU frame time ≤ {{BUDGET_MS}} ms average, no frame >
  {{MAX_MS}} ms during a scripted {{DURATION}} fly-through.

SCENE
- {{TERRAIN_AND_ARCHITECTURE — large forms: canyons/arches/columns/floating elements, with a
  traversable feature}}
- {{ATMOSPHERE_AND_DEPTH — fog/absorption, explicit near→far color gradient}}
- {{LIGHT_AND_VOLUMETRICS — key light direction, god rays, caustics/dappling, animated
  surface/sky/canopy}}
- {{FLORA_AND_PROPS — 3+ vegetation/prop types with specific colors, ground cover, an
  iridescent/glowing accent}}
- {{ANIMATED_LIFE — 1+ hero creature, 1 flocking school/flock, particle systems (bubbles/
  spores/ash/pollen/motes)}}
- {{SET_PIECES — 1–3 described hero landmarks}}
- {{FLORA/MOTION cadence — swaying/drifting/sparkling behavior}}
- World: {{WORLD_BOUNDS — bounded size, boundaries hidden from the starting area, starting
  vantage}}

CONTROLS
WASD move, mouse look (pointer lock), Q/E up/down, Shift to accelerate

VERIFICATION
- Visual critic: a separate subagent that sees ONLY the renders, never the code or reasoning.
  Give it 6 fixed camera poses, rendered at {{RESOLUTION}} in GPU-accelerated Chrome, plus a
  short recording of the fly-through to catch shimmer, aliasing, popping and banding. It
  returns prioritized, concrete defects. Iterate until it reports nothing above "minor".
- Performance: GPU timestamp queries plus a frame-time log from the scripted fly-through.
  Report average, 99th percentile and max.

DONE WHEN: both verification gates pass. Deliver index.html, the bundle size, the perf report
and the critic's final review.
