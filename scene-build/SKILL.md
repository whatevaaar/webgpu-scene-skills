---
name: scene-build
description: Construye una escena 3D procedural en tiempo real como un único index.html autocontenido, renderizado con WebGPU, sin motores (nada de Three.js/Babylon), todo procedural (sin archivos de textura/modelo) y con cero asignaciones de JS por frame. Úsala tras tener un scene-spec.md (de /scene-spec) o cuando el usuario diga "construye la escena", "/scene-build", "genera el index.html". Implementa el render, reporta el tamaño minificado, y deja la escena lista para /scene-verify.
---

# scene-build — Constructor de la escena

Toma un `scene-spec.md` y produce un **único `index.html` autocontenido** que cumple el
contrato técnico. La interacción es en español; el código y los comentarios, en inglés.

## Entrada
- **Una carpeta por escena (obligatorio).** Cada escena vive en su propia subcarpeta
  (`scenes/<slug>/`, convención de `scene-spec`). Localiza el `scene-spec.md` de la escena a
  construir dentro de su carpeta y **trabaja ahí dentro**: todos los artefactos (`index.html`,
  `index.min.html`, renders, logs) van en esa misma carpeta, nunca sueltos en la raíz ni en el
  repo de skills. Si hay varias carpetas de escena, pregunta al usuario cuál construir.
- Si no existe ningún `scene-spec.md`, dile al usuario que corra `/scene-spec` primero (o
  ofrécete a correrlo).
- Lee el spec entero. El bloque SCENE define QUÉ construir; CONSTRAINTS/TARGET definen CÓMO; el
  **FIDELITY TARGET** define el nivel de factura visual (default: advanced — ver abajo).

## Contrato técnico (no negociable)
1. **Un solo `index.html`**, autocontenido. Sin dependencias externas, sin CDNs, sin assets.
2. **WebGPU** para render. Detecta ausencia de WebGPU y muestra un mensaje claro.
3. **Todo procedural**: geometría, ruido, "texturas" y materiales se generan en código/shaders.
   Nada de archivos de imagen o modelo (ni base64 de assets pesados).
4. **Cero asignaciones de JS por frame**. Preasigna TODOS los buffers, typed arrays y objetos
   temporales fuera del render loop. Nada de `new`, literales de array/objeto, `.map/.filter`,
   ni concatenación de strings dentro de `requestAnimationFrame`.
5. **Prioridades ante conflicto**: (1) calidad visual, (2) frame pacing estable en el TARGET,
   (3) bundle pequeño.

Lee `reference/webgpu-architecture.md` y `reference/performance.md` antes de escribir código.

## Método de trabajo
1. **Plan de capas**: mapea cada línea del SCENE a un sistema de render (terreno, flora
   instanciada, criaturas, partículas, volumétricos, post). Define el frame graph.
2. **Andamiaje primero**: device/context/swapchain, cámara con controles (WASD + mouse look con
   pointer lock + Q/E + Shift), depth buffer, loop con delta-time fijo y acumulador. Verifica
   que corre en negro antes de añadir capas.
3. **Capa por capa**, de la base a los detalles: terreno/arquitectura → atmósfera/niebla → luz
   y volumétricos → flora/props instanciados → vida animada (flocking en compute) → partículas
   → set pieces → post (tonemap, god rays, antialiasing temporal/espacial). Tras cada capa,
   confirma que compila y que no introduce asignaciones por frame.
4. **Presupuesto**: respeta el TARGET. Usa instancing y compute para multitudes; LOD/culling
   para densidad; evita overdraw en los volumétricos.

## Calidad visual y unicidad (P1 — postmortem sesión 2)
> **Por qué.** Dos escenas de temas distintos (biblioteca borgesiana vs. ciudad inundada)
> salieron **arquitectónicamente idénticas**: cubos (edificios) + conos (vegetación) + sprites
> (partículas) + grid de ventanas + niebla de 2 colores + god rays + ACES/bloom. El tema sólo
> cambió la paleta. Un toolkit fijo produce, inevitablemente, la misma escena con otro color.
> Evitalo deliberadamente:

- **Respetá el FIDELITY TARGET del spec — es una DIRECCIÓN (stylized o realistic), no un piso.**
  > **Por qué (postmortem sesión 3→4).** El eje NO es realismo↔low-poly. Dos fallos reales,
  > independientes del estilo: **(1) medio-compromiso** → uncanny (el realismo *a medias* es lo
  > feo, no el realismo); **(2) toolkit genérico** → todo se parece. No evites el uncanny "yendo
  > más simple": eso solo baja el techo y homogeneíza. Evitá el uncanny **comprometiéndote entero**.
  - **Comprometé la dirección entera.** Sea stylized o realistic, cada efecto se ejecuta
    convincente o se corta — **nunca a medias**. Si no podés hacer un efecto COMPLETO dentro del
    budget, no lo pongas a medias: cortalo o reemplazalo por uno que sí cierre.
  - **Modelá al sujeto, nunca una primitiva de reemplazo — a CUALQUIER fidelidad.** Un pez tiene
    cuerpo+aletas+cola (no un óvalo), un pájaro alas+cuerpo (no un triángulo), un árbol tronco+
    ramas+copa. Low-poly ≠ genérico: un koi low-poly sigue siendo un koi. Esto —no el estilo— es lo
    que hace que dos escenas de temas distintos NO salgan idénticas.
  - **El techo escala con los ciclos del spec (CYCLE CEILING).** Con presupuesto de muchos ciclos,
    subí la ambición ronda a ronda (geometría más específica, técnica firma más lograda). Un
    plateau = más craft específico, no bajar la vara. No hay problema con que un render tarde.
  - Síntomas de medio-compromiso a EVITAR (no porque sean "realismo", sino porque están *a medias*):
    ruido FBM en albedo fingiendo textura, SSS/fresnel a medias en todo, god-rays difusos tipo
    mancha, niebla lechosa que lava el contraste, specular plástico sobre lambert.
- **No colapses todo al mismo toolkit.** Antes de reusar "cubo+cono+sprite/óvalo/triángulo",
  preguntate qué geometría es *específica de ESTE sujeto*. Implementá HERO ELEMENTS, criaturas y
  VISUAL SIGNATURE con geometría propia del tema, no con la primitiva genérica de turno.
- **Ningún hero element es un quad/disco/abanico plano (regla mecánica).** Seguí el GEOMETRY PLAN
  del spec: cada hero se construye de **≥3 partes modeladas del sujeto**. Un rosetón NO es un disco
  de cuñas de color — son mullions + lóbulos + plomos + vidrios; un rostro NO es un óvalo + 2 discos
  — son planos faciales (frente, pómulos, nariz, mentón). Si un hero terminó siendo una primitiva
  plana, no está hecho: es exactamente lo que el critic marca y lo que estanca el loop (plateau).
- **Profundidad > amplitud (hero elements).** Mejor 3–4 elementos específicos y comprometidos que
  15 primitivas genéricas. Si el spec es maximalista, prioridad a los hero elements.
- **Materiales: comprometidos y coherentes con la dirección.** stylized → color cohesivo + banda
  de luz/sombra nítida + AO de contacto. realistic → fresnel/specular/detail-normals COMPLETOS. En
  ambos, nunca a medias, y la **LUZ y la COMPOSICIÓN** hacen el trabajo pesado.
- **Luz con forma.** Más allá de una direccional + ambiente: sombras baratas (shadow map simple
  o contact-shadow), luces locales emisivas que iluminen su entorno, variación de luz por zona.
- **Técnica firma por tema.** Implementá la(s) 1–2 técnicas de la VISUAL SIGNATURE (p.ej.
  submarino → caústicas proyectadas + refracción/distorsión; desierto → heat-shimmer + ripples;
  neón-lluvia → reflejos húmedos + wet roughness). Es lo que hace la escena memorable y distinta.

## Chequeos obligatorios antes de entregar
- [ ] Sólo `index.html`, sin fetch/CDN/assets externos.
- [ ] Cero asignaciones por frame (revisa el cuerpo del rAF: sin `new`, `[]`, `{}`, `map`,
      template strings; scratch vectors/matrices preasignados y reutilizados).
- [ ] Controles completos y pointer lock funcionando. **(P0, bug real)** Ningún overlay
      (`#msg`, `#hud`, loaders a pantalla completa con `position:fixed; inset:0`) debe tapar el
      canvas: TODOS llevan `pointer-events:none`, o se comen el click y `requestPointerLock()`
      nunca dispara → el mouse no gira la vista. Verificá con
      `document.elementFromPoint(innerWidth/2, innerHeight/2) === canvas`.
- [ ] Todos los elementos del SCENE presentes.
- [ ] Hooks para verificación: poses de cámara fijas, modo fly-through scripteado y timestamp
      queries de GPU expuestos para `/scene-verify` (ver abajo).
- [ ] Degradación limpia si falta WebGPU o timestamp-query.
- [ ] **Colisión/clamp aplicada TAMBIÉN al fly-through** (bug real): el spline scripteado debe
      respetar colisión y clamp de suelo igual que la cámara libre, o la cámara atraviesa el
      pabellón/paredes en la grabación. No dejes el recorrido metido dentro de geometría sólida.
- [ ] **HUD/overlays ocultos en modos de captura** (bug real): en `?pose`, `?flythrough` y
      `?calib`, ocultá `#hud`/`#msg` (`display:none`), o el texto de debug queda quemado en los
      renders que ve el critic.
- [ ] **Smoke-test pasado** (ver "Auto-smoke-test" abajo) — NO entregues sin esto.

## Hooks para la verificación
Deja estos ganchos para que `/scene-verify` funcione sin tocar la lógica de render:
- El `<canvas>` debe tener `id="c"` — `record-video.js` de `scene-verify` lo busca por ese id
  (`canvas.captureStream()`); cualquier otro id rompe el deliverable de video.
- `?pose=N` (0–5): coloca la cámara en una de **6 poses fijas** y renderiza estático.
- `?flythrough=1`: ejecuta un **recorrido scripteado de 60 s** determinista (spline de cámara
  fijo, sin input), ideal para grabar y para el log de frame-times.
- `window.__frameLog`: array **preasignado** (ring buffer) con los tiempos de frame; expón
  `window.__perf()` que devuelve `{avg, p99, max, count}`.
- GPU timestamp queries alrededor del frame (si el adaptador lo soporta), promediados en el log.
- `window.__ready`: flag que indica que el primer frame válido ya se dibujó (para que el
  verificador sepa cuándo capturar).

## Hooks de SANITY por defecto (P0 del postmortem — no opcionales)
> **Por qué.** Un bug de orientación de cámara (giro de 180°, 1 línea) sobrevivió ~16 rondas de
> verificación en una sesión real porque el critic estético no verifica corrección. Estos
> ganchos hacen la corrección **barata, mecánica y determinista**, para que `scene-verify` corra
> su Gate 0 ANTES del critic.
- `?calib=1`: **contrato de calibración de orientación** (lo lee `gate0-metrics.js`). Fija la
  cámara en una pose nivelada (pitch 0, por encima del skyline) y dibuja **3 marcadores de color
  puro sin iluminar** delante de la cámara, posicionados en **ejes de MUNDO** (no de cámara, para
  que el check detecte espejos):
  - **verde** en world `+Y` (arriba), **rojo** en world `−Y` (abajo), **amarillo** en world `+X`
    (derecha).
  - Color puro: en el fragment, override al final (`if(kind==marker){ out = col*2.0 }`) **después**
    de todo uso de `fwidth` — un `return` temprano sobre un valor no-uniforme rompe `fwidth`
    (lección aprendida). Exentos de niebla/ambient/floor para que el centroide de color sea limpio.
  - **Fondo neutro en calib (robustez del Gate 0):** en modo `?calib`, renderizá el resto de la
    escena (cielo + geometría no-marcador) en gris neutro-oscuro. Una escena brillante o muy
    saturada (p.ej. piso dorado) puede colar píxeles en el clasificador de color del marcador y
    contaminar su centroide → falso FAIL de orientación. Sólo los 3 marcadores deben llevar color.
  - Mantené los marcadores dentro del FOV (offset angular < medio-FOV vertical) o el verde/rojo se
    recortan contra el borde.
  El harness afirma `verde.y < rojo.y` (arriba sobre abajo) y `amarillo.x > centro.x` (+X a la
  derecha) → atrapa flips verticales y espejos horizontales.
- **Colisión + clamp de suelo por defecto** en cámara libre: la cámara no atraviesa la
  geometría sólida ni cae por debajo del suelo (resuelto con checks de AABB preasignados, cero
  asignaciones por frame). Volar por encima de los techos sigue permitido.
- **Flags de aislamiento de capas**: `?noVeg`, `?noFlock`, `?noRain`, `?noVolumetrics`, … leídos
  **una sola vez al init** (sin costo por frame), para que `scene-verify` haga diagnóstico por
  aislamiento (causa raíz) cuando un defecto reaparece.
- `window.__cam`: expón la cámara para inspección/manejo desde el harness de verificación.
- **Sanity de orientación en el propio código**: la matriz de vista es el punto #1 donde se
  cuela un volteo. Deriva `right = normalize(cross(forward, worldUp))` y `up = cross(right,
  forward)`, y verifica con un caso conocido (cámara mirando a −Z ⇒ right=+X, up=+Y) antes de
  confiar en las poses.

## Auto-smoke-test antes de entregar (P0 — no opcional)
> **Por qué (postmortem sesión 3).** `scene-build` entregó un `index.html` con 4 bugs que dejaban
> la pantalla en NEGRO (`]);` en vez de `]});`, `type` keyword reservada en WGSL, `struct U` vs
> binding `U` redeclarado, calib invertida). Los cazó Gate 0 — pero el build debió cazarlos solo.
> El falso-negativo "lo escribí, debe andar" es caro: una escena que no arranca gasta toda una
> ronda de captura/critic en nada.

Antes de declarar la entrega, corré un smoke-test headless automático (Node + puppeteer-core +
el navegador que usa `/scene-verify`). Mínimo:
1. **Sintaxis JS:** extraé el `<script type="module">` del `index.html` y pasalo por `node --check`.
   Un error acá = el módulo entero muere (pantalla negra). Arreglalo antes de seguir.
2. **Carga + WGSL en runtime:** abrí el `index.html` en el navegador headless, escuchá
   `page.on('console')` y `page.on('pageerror')`, y esperá `window.__ready===true` (timeout ~15 s).
   - CERO `pageerror`. CERO errores de compilación WGSL en consola ("Error while parsing WGSL",
     "reserved keyword", "redeclaration", "no matching overload"). Un warning WGSL que impide crear
     un pipeline = fallo.
   - `window.__ready===true` dentro del timeout (si nunca se pone en true, algo tira antes del
     primer frame).
   - `canvas.width` > 300 (que el resize haya corrido; 300 = default = nunca inicializó).
3. Idealmente un screenshot y un check barato de "no-void" (no todo negro) — pero eso ya lo hace
   Gate 0; el mínimo imprescindible es (1)+(2).

Si el smoke-test falla, **arreglá y repetí hasta que pase**; recién ahí entregás. No le pases a
`/scene-verify` una escena que no arranca.

## Entrega
Escribe `index.html` en la **carpeta de la escena** (`scenes/<slug>/`, junto al
`scene-spec.md`). Luego:
- Minifica mentalmente/realmente para **reportar el tamaño minificado** (y el crudo). Si
  minificas, guarda el minificado como `index.min.html` y conserva `index.html` legible.
- Resume en español: capas implementadas, tamaño (crudo + minificado), y "Siguiente paso:
  `/scene-verify` para pasar los dos gates".

## Archivos de apoyo
- `reference/webgpu-architecture.md` — estructura del render, pipelines, procedural, frame graph.
- `reference/performance.md` — cero asignaciones, instancing/compute, presupuesto de ms, AA.
