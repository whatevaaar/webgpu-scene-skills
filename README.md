# webgpu-scene-skills

Set de 3 skills de Claude Code para diseñar, construir y verificar **escenas 3D procedurales
en tiempo real para el navegador** (WebGPU, sin motores, un solo `index.html`). Generaliza el
prompt de la escena submarina de fantasía para que sirva con **cualquier tema** (desierto
alienígena, cavernas de cristal, jardín cyberpunk, ruinas flotantes…).

## Origen y atribución

El **prompt y la escena submarina de referencia** (el default de `scene-spec` y la vara de
riqueza, `scene-spec/reference/default-underwater.md`) están basados en **Abyssal Garden**, de
**[Noniv](https://github.com/Noniv)** — una escena submarina WebGPU procedural en un solo HTML:

- 🌐 Demo: https://noniv.github.io/abyssal-garden/
- 💻 Repo: https://github.com/Noniv/abyssal-garden — **Licencia MIT**, © Noniv.

Estas skills son un **trabajo independiente** que *generaliza ese prompt* a un flujo reutilizable
para cualquier escena; **no incluyen ni derivan del código fuente** de Abyssal Garden (que es un
árbol modular compilado a `index.html` vía `npm run build`). Abyssal Garden es un producto
pulido a mano por su autor; aquí se lo cita como inspiración y referencia de calidad. Todo el
crédito del original es de Noniv bajo MIT. Ver [`POSTMORTEM.md`](POSTMORTEM.md) para una
comparación honesta de nivel de polish y por qué una escena generada por este pipeline no lo
alcanza en una sola sesión.

## Flujo

```
/scene-spec   →  scenes/<slug>/scene-spec.md   (drill-down en español → spec técnico en inglés)
/scene-build  →  scenes/<slug>/index.html      (render WebGPU, procedural, 0 asignaciones/frame)
/scene-verify →  veredicto + renders           (critic visual aislado + gate de performance)
```

> **Una carpeta por escena.** Cada escena vive en su propia subcarpeta `scenes/<slug>/` (slug
> derivado del concepto). Spec, `index.html`, renders y logs de esa escena viven ahí dentro;
> nunca sueltos en la raíz del workspace ni dentro del repo de skills.

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

## Licencia

[GPL-3.0](LICENSE) © Emiliano Hidalgo.
