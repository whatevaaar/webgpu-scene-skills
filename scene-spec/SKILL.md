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

### 2.5 Firma visual, referencia y hero elements (clave para que NO salgan todas iguales)
> **Por qué (postmortem sesión 2).** Specs ricos en prosa producían escenas idénticas porque
> `scene-build` colapsaba todo al mismo toolkit (cubos+conos+sprites). Para romper eso, el spec
> debe **dirigir** la calidad y la unicidad, no sólo listar contenido.

Antes de escribir, define (propón tú, el usuario curetea):
- **FIDELITY TARGET** — una DIRECCIÓN elegida por tema en el drill-down. **Ni "stylized" ni
  "realistic" son el default; ninguno es "mejor".** El eje NO es realismo↔low-poly.
  > **Por qué (postmortem sesión 3→4).** Ni "realismo por default" ni "low-poly por default"
  > sirven. Forzar realismo → valle inquietante amateur (realismo a medias). Pero forzar low-poly
  > repite el fallo de la sesión 2 (todo se parece: pez=óvalo, pájaro=triángulo, todo=esfera) y
  > pone un **techo bajo fijo** sin importar cuántos ciclos invirtamos. Los dos fallos reales son
  > independientes del estilo: **(1) medio-compromiso** (el uncanny viene del realismo *a medias*,
  > no del realismo) y **(2) toolkit genérico fijo** (homogeneíza). Diseña contra ESOS, no contra
  > el realismo.
  - **Elige dirección y comprométela entera.** stylized (cel/flat/gradiente, color bold, luz
    fuerte, siluetas limpias) *o* realistic (SDF, shadow map+SSAO, PBR). Ambos válidos. Uncanny =
    a medias → cada efecto se ejecuta convincente o se corta, nunca a mitad.
  - **Modela al sujeto, nunca una primitiva de reemplazo — a cualquier fidelidad.** Koi =
    cuerpo+aletas+cola; grulla = alas+cuello+patas; pagoda = aleros+ménsulas. Low-poly ≠ genérico:
    un koi low-poly sigue siendo inconfundiblemente un koi. Esto es lo que evita que todo se parezca.
  - **CYCLE CEILING:** fija hasta dónde empuja el loop. **El techo escala con los ciclos** — más
    revisiones = geometría/técnica más específica y MÁS ambición; un plateau significa "más craft
    específico del sujeto", nunca "baja la vara". Que un render tarde muchos ciclos está bien.
  Pregunta la dirección Y el techo de ciclos. Esto fija el FIDELITY TARGET del spec y la vara del
  critic en `scene-verify` (que juzga compromiso + especificidad, no cercanía al realismo).
- **VISUAL SIGNATURE** — la(s) **1–2 técnicas de render únicas** que harán esta escena memorable
  e inconfundible de otras (p.ej. submarino → caústicas proyectadas + refracción; desierto →
  heat-shimmer + dunas con ripples de viento; neón-lluvia → reflejos húmedos + roughness mojada).
  Esto es lo que distingue el tema a nivel de *técnica*, no sólo de paleta.
- **ART REFERENCE** — 1 referencia estética concreta que evoque el look buscado ("tipo
  Subnautica", "tipo Moebius", "tipo Blade Runner 2049") para anclar la dirección de arte.
- **HERO ELEMENTS** — los **3–4 elementos que DEBEN verse espectaculares** (el build pondrá su
  esfuerzo ahí). El resto es relleno atmosférico.
- **GEOMETRY PLAN por hero element (obligatorio).** Por cada hero, escribe su **descomposición de
  malla** — las partes del sujeto que el build debe modelar, no sólo su mood/color. Ej.: "rosetón =
  mullions radiales de piedra + lóbulos/foils + plomos oscuros entre vidrios + figura central";
  "retrato = busto (cabeza+cuello+hombros) + planos faciales + marco con moldura"; "koi = cuerpo +
  pectorales + dorsal + cola bífida". Sin este plan, el build colapsa el hero a un quad/disco/abanico
  y el critic lo lee como primitiva (*plateau de primitivas*, postmortem sesión 3).
- **Sujetos sensibles a la primitiva (rostros, manos, texto, tracería, animales reconocibles).** El
  ojo humano los lee como falsos al instante. Por cada hero que caiga aquí, decide UNA de dos y
  anótala en el spec:
  - **(a) Comprometer malla real** — sube su presupuesto de geometría (es donde el build gasta su
    esfuerzo), *o*
  - **(b) Dirigir el arte alrededor de la debilidad** — verlo a **media distancia / en silueta /
    parcialmente ocluido**, nunca en close-up. Elegir esto a nivel spec evita poses que expongan un
    hero que no vas a modelar al detalle. Es gratis y suele rendir más que pelear la malla.
  - **(b) NO exime del presupuesto mínimo de partes (lección sesión 5).** Dirigir el encuadre y
    modelar al sujeto no son excluyentes: aun en silueta, un hero sensible se lee como placeholder si
    le faltan las **partes que definen su silueta**. Por eso el GEOMETRY PLAN de un hero sensible debe
    listar un **mínimo de partes no negociable** (ej.: "cráneo = cráneo alargado + mandíbula + 2
    cuencas"; "esqueleto = N costillas con *taper* de caja torácica + espina conectada + cráneo",
    NO "costillas = tubos iguales"). Un esqueleto con costillas idénticas y un cráneo-esfera leía como
    oruga de juguete hasta que el build le puso taper por costilla + mandíbula + cuencas. Si eliges
    (b), fija igual ese presupuesto mínimo; (b) sólo decide la distancia de cámara, no el detalle cero.
- **Anti-maximalismo (profundidad > amplitud).** Si el usuario quiere "todo", guíalo a priorizar:
  es mejor un spec de 4 elementos ejecutables de forma excelente que 15 a medias. Marca
  explícitamente qué es hero y qué es relleno.

### 3. TARGET (hardware y presupuesto)
El contrato técnico (prioridades, constraints, verificación, controles) es **invariante** —
se copia tal cual para cualquier escena. Lo único parametrizable es el bloque TARGET
(hardware, resolución, presupuesto de ms, duración del fly-through). Default = el del ejemplo:

- Windows 11 25H2, Chrome 157, RTX 5070 Ti, Ryzen 7800X3D, monitor 180 Hz
- 2560×1440 a resolución completa. GPU frame time ≤ 11 ms promedio, ningún frame > 16.7 ms
  durante un fly-through scripteado de 60 s.

Pregunta sólo si el usuario quiere otra máquina/resolución/presupuesto; si no, usa el default.

### 4. Escribir el spec
**Una carpeta por escena (obligatorio).** Cada escena vive en su **propia subcarpeta
dedicada** — nunca escribas los artefactos sueltos en la raíz del directorio de trabajo, y
jamás dentro del repo de skills. Deriva un slug kebab-case del concepto (p.ej. "ciudad
inundada" → `sunken-city`) y crea `scenes/<slug>/` bajo el directorio de trabajo actual (si
ya existe una carpeta de escenas convenida, úsala). Todos los artefactos de esta escena
(`scene-spec.md`, `index.html`, `index.min.html`, renders, logs) van **dentro de esa
carpeta**.

Rellena `reference/spec-template.md` con todo lo recogido y escribe el resultado en
`scenes/<slug>/scene-spec.md`. Muestra al usuario un resumen corto (no el documento entero) y
el path completo de la carpeta. El SCENE va en inglés, denso y concreto, al estilo del
default.

### 5. Entregar
Termina indicando: "Spec listo en `scenes/<slug>/scene-spec.md`. Siguiente paso: `/scene-build`
para generar el index.html en esa misma carpeta." No construyas nada aquí — esta skill sólo
especifica.

## Archivos de apoyo
- `reference/dimensions.md` — las 10 dimensiones del drill-down, con mapeo al ejemplo y
  defaults por dimensión.
- `reference/default-underwater.md` — el spec submarino completo (la vara de riqueza y el
  default si el usuario no da tema).
- `reference/spec-template.md` — la plantilla generalizada del prompt (secciones invariantes
  + huecos de SCENE/TARGET).
