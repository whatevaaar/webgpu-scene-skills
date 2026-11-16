---
name: scene-spec
description: Diseña la especificación de una escena 3D procedural en tiempo real para el navegador (WebGPU, sin motores, un solo index.html). Úsala cuando el usuario quiera definir/especificar una escena para renderizar — p.ej. "quiero una escena submarina/desértica/cyberpunk volable", "/scene-spec", "arma el spec de mi escena". Corre una sesión de drill-down EN ESPAÑOL que extrae detalles ricos a partir de una idea mínima, y produce un spec técnico EN INGLÉS (scene-spec.md) que consume la skill scene-build. Si el usuario no da tema, usa el default submarino.
---

# scene-spec — Generador de especificación de escena

Tu trabajo es convertir una idea de escena (aunque sea una sola palabra) en un **spec
técnico rico y completo**, tan descriptivo como el ejemplo submarino de referencia, listo
para que `scene-build` lo construya sin ambigüedad.

La interacción con el usuario es **en español**. El artefacto final (`scene-spec.md`) va
**en inglés técnico**, porque es un prompt de ingeniería hacia el motor de render.

## Principio rector: EXTRAPOLAR, no interrogar

El usuario casi nunca llega con una escena completa en la cabeza. Tu papel NO es pedirle que
invente cada detalle, sino **proponerle detalles concretos y evocadores** coherentes con su
semilla, y dejar que elija, mezcle o corrija. Partiendo de "bosque alienígena" tú generas la
paleta, las formas, la vida animada y los hitos candidatos; el usuario sólo curetea.

Regla de oro: **toda dimensión que el usuario no quiera decidir, la rellenas tú** con un
default de buen gusto, coherente con el tema. El spec nunca sale pobre. La vara de riqueza es
el ejemplo submarino (ver `reference/default-underwater.md`): ESE nivel de densidad de
detalle es el mínimo aceptable para cada categoría.

## Flujo

### 0. Semilla
Pregunta por el concepto base en una línea (tema + ambiente). Ejemplos que puedes ofrecer:
"fantasía submarina", "desierto alienígena al anochecer", "jardín cyberpunk en una azotea
bajo lluvia neón", "cavernas de cristal bioluminiscente", "ruinas flotantes sobre un mar de
nubes".

- Si el usuario dice "el default", "como el ejemplo", o no da tema → carga
  `reference/default-underwater.md` como spec final y salta al paso 3 (confirmación).
- Si da un tema → continúa el drill-down.

### 1. Drill-down por dimensiones
Recorre las **10 dimensiones** de `reference/dimensions.md`. Para CADA dimensión:

1. Genera 3–4 opciones **concretas, visuales y temáticas** (no genéricas). Mal: "algún tipo
   de planta". Bien: "helechos iridiscentes violeta/rosa, musgo magenta a ras de suelo,
   esponjas barril bioluminiscentes".
2. Preséntalas con `AskUserQuestion` (una pregunta por dimensión, o agrupa 2–4 dimensiones
   afines en una tanda de preguntas). Marca una opción como "(Recomendada)" cuando tengas
   una preferencia estética clara.
3. El usuario elige, combina o escribe la suya. Lo que no conteste, lo rellenas tú.

No hagas las 10 de golpe como interrogatorio plano: agrúpalas en 3–4 tandas temáticas
(p.ej. "forma del mundo", "luz y atmósfera", "vida y detalle", "hitos y límites").

### 2. Enriquecer y cerrar huecos
Antes de escribir el spec, revisa que cada categoría del SCENE tenga **densidad comparable al
default submarino**: varias especies/props por categoría, un gradiente de color definido,
≥1 sistema de partículas, 1–3 set pieces con descripción, y límites del mundo resueltos.
Donde falte, añade tú detalle coherente y anótalo como "(auto)".

### 3. TARGET (hardware y presupuesto)
El contrato técnico (prioridades, constraints, verificación, controles) es **invariante** —
se copia tal cual para cualquier escena. Lo único parametrizable es el bloque TARGET
(hardware, resolución, presupuesto de ms, duración del fly-through). Default = el del ejemplo:

- Windows 11 25H2, Chrome 157, RTX 5070 Ti, Ryzen 7800X3D, monitor 180 Hz
- 2560×1440 a resolución completa. GPU frame time ≤ 11 ms promedio, ningún frame > 16.7 ms
  durante un fly-through scripteado de 60 s.

Pregunta sólo si el usuario quiere otra máquina/resolución/presupuesto; si no, usa el default.

### 4. Escribir el spec
Rellena `reference/spec-template.md` con todo lo recogido y escribe el resultado en
`scene-spec.md` en el directorio de trabajo actual. Muestra al usuario un resumen corto (no
el documento entero) y el path. El SCENE va en inglés, denso y concreto, al estilo del
default.

### 5. Entregar
Termina indicando: "Spec listo en `scene-spec.md`. Siguiente paso: `/scene-build` para
generar el index.html." No construyas nada aquí — esta skill sólo especifica.

## Archivos de apoyo
- `reference/dimensions.md` — las 10 dimensiones del drill-down, con mapeo al ejemplo y
  defaults por dimensión.
- `reference/default-underwater.md` — el spec submarino completo (la vara de riqueza y el
  default si el usuario no da tema).
- `reference/spec-template.md` — la plantilla generalizada del prompt (secciones invariantes
  + huecos de SCENE/TARGET).
