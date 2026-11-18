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

FIDELITY TARGET: {{FIDELITY — pick a DIRECTION per theme in the drill-down. Both "stylized" and
"realistic" are legitimate end states; neither is the default and neither is "better". The axis
that matters is NOT realism-vs-low-poly — it is COMMITMENT + THEME-SPECIFICITY. State the chosen
direction AND the cycle ceiling (how far the build/verify loop should push).}}

The two real failure modes to design against (both independent of realism-vs-stylized):
1. HALF-COMMITMENT → uncanny valley. Uncanny comes from realism done partway (fake/half SSS,
   albedo noise faking detail, diffuse god-ray smears, flat lambert with plastic specular), NOT
   from realism itself. Rule: every effect is either executed convincingly or cut — never half.
2. GENERIC FIXED TOOLKIT → homogenization (every theme collapses to box=building, cone=tree,
   sphere/oval=any-creature, triangle=bird). This is what makes all scenes look the same, and it
   happens at ANY fidelity. Rule: model hero elements and creatures TO THE SUBJECT — a koi has a
   body + fins + tail, a crane has wings + neck + legs, a pagoda has eaves + brackets — whether
   low-poly or detailed. Low-poly ≠ generic: a low-poly koi is still unmistakably a koi.

- stylized: a committed graphic look (cel/flat/gradient shading, bold color, strong light, clean
  silhouettes). NOT a license for generic primitives — stylized creatures/props must still be
  specific to the subject, just rendered in a stylized language.
- realistic: SDF/raymarch, shadow mapping + SSAO, PBR (specular/fresnel/reflection), normal detail.
  Legitimate and encouraged when the theme calls for it — but it MUST be committed completely;
  half-realism is the uncanny failure above.

CYCLE CEILING: the ceiling SCALES WITH THE REVIEW BUDGET. More review cycles → pursue MORE specific
geometry and technique and RAISE ambition; a score plateau means "push for more subject-specific
craft", never "lower the bar". A render taking many cycles to reach high fidelity is expected and
fine. Do NOT cap ambition to avoid uncanny — avoid uncanny by committing fully, not by going simpler.

The critic (at any fidelity) must NOT reward realism-proximity and must NOT penalize a chosen style
for being that style. It SHOULD flag: half-commitment/uncanny, generic primitives standing in for
hero elements/creatures, a look indistinguishable from a generic "primitives + fog" scene, and
incoherence. Never demand photorealism.

VISUAL SIGNATURE: {{1-2 render techniques unique to this theme that make it memorable and
unmistakable from other scenes — e.g. projected caustics + refraction, heat-shimmer + dune
ripples, wet reflections + puddle roughness}}

ART REFERENCE: {{one concrete aesthetic reference to anchor art direction — e.g. "Subnautica",
"Moebius", "Blade Runner 2049"}}

HERO ELEMENTS: {{the 3-4 elements that MUST look spectacular — the build spends its effort here;
everything else is atmospheric filler. Depth over breadth. For EACH hero, give a GEOMETRY PLAN: the
subject parts the build must model (e.g. "rose window = radial stone mullions + lobed foils + dark
lead cames between glass + central figure"; "portrait = bust: head+neck+shoulders + facial planes +
molded frame") — NOT a single flat quad/disc/fan, which the critic reads as a generic primitive.
For PRIMITIVE-SENSITIVE subjects (faces, hands, text, tracery, recognizable animals) either (a)
commit a real mesh, or (b) art-direct around it: seen at mid-distance / in silhouette / partially
occluded, never in close-up.}}

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
