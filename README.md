# webgpu-scene-skills

Set de 3 skills de Claude Code para diseñar, construir y verificar **escenas 3D procedurales
en tiempo real para el navegador** (WebGPU, sin motores, un solo `index.html`). Generaliza el
prompt de la escena submarina de fantasía para que sirva con **cualquier tema** (desierto
alienígena, cavernas de cristal, jardín cyberpunk, ruinas flotantes…).

## Flujo

```
/scene-spec   →  scene-spec.md   (drill-down en español → spec técnico en inglés)
/scene-build  →  index.html      (render WebGPU, procedural, 0 asignaciones/frame)
/scene-verify →  veredicto        (critic visual aislado + gate de performance)
```

1. **`/scene-spec`** — Sesión de *drill-down*: a partir de una idea mínima (hasta una palabra),
   propone detalles concretos y temáticos en 10 dimensiones y **extrapola** una escena tan rica
   como el ejemplo submarino. Si no das tema, usa el default submarino. Produce `scene-spec.md`.
2. **`/scene-build`** — Construye un único `index.html` autocontenido: WebGPU, todo procedural
   (sin texturas/modelos), cero asignaciones de JS por frame. Reporta el tamaño minificado y
   deja hooks de verificación (6 poses fijas, fly-through de 60 s, timestamp queries).
3. **`/scene-verify`** — Corre los dos gates: un *critic visual* (subagente que ve **sólo** los
   renders, nunca el código) sobre 6 poses a 2560×1440 + grabación del fly-through, y
   *performance* (GPU timestamp queries, avg/p99/max). Itera hasta que el critic no reporte nada
   > "minor" y la perf cumpla el TARGET.

## Qué es invariante vs. parametrizable

- **Invariante** (se copia tal cual a cualquier escena): prioridades, constraints (WebGPU, un
  solo `index.html`, procedural, 0 asignaciones/frame), controles (WASD + mouse look + Q/E +
  Shift), y el protocolo de verificación.
- **Parametrizable**: el bloque **SCENE** (lo llena el drill-down) y el **TARGET** (hardware,
  resolución, presupuesto de ms, duración del fly-through; el default es el del ejemplo).

## Instalación

Las skills viven aquí (fuente) y se enlazan a `~/.claude/skills` con *junctions* de directorio
(no requieren admin ni modo desarrollador):

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Reinicia Claude Code o abre una sesión nueva; luego usa `/scene-spec`, `/scene-build`,
`/scene-verify`. Para desinstalar, borra los enlaces en `~/.claude/skills` (son junctions; no
afectan la fuente).

## Estructura

```
webgpu-scene-skills/
  install.ps1
  scene-spec/
    SKILL.md
    reference/ dimensions.md · default-underwater.md · spec-template.md
  scene-build/
    SKILL.md
    reference/ webgpu-architecture.md · performance.md
  scene-verify/
    SKILL.md
    reference/ critic-protocol.md · perf-protocol.md
```

## Idioma

La interacción con el usuario es en **español**; los artefactos técnicos (`scene-spec.md`,
código, comentarios) en **inglés**, porque son prompts/código de ingeniería.
