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
- Lee el spec entero. El bloque SCENE define QUÉ construir; CONSTRAINTS/TARGET definen CÓMO.

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

## Chequeos obligatorios antes de entregar
- [ ] Sólo `index.html`, sin fetch/CDN/assets externos.
- [ ] Cero asignaciones por frame (revisa el cuerpo del rAF: sin `new`, `[]`, `{}`, `map`,
      template strings; scratch vectors/matrices preasignados y reutilizados).
- [ ] Controles completos y pointer lock funcionando.
- [ ] Todos los elementos del SCENE presentes.
- [ ] Hooks para verificación: poses de cámara fijas, modo fly-through scripteado y timestamp
      queries de GPU expuestos para `/scene-verify` (ver abajo).
- [ ] Degradación limpia si falta WebGPU o timestamp-query.

## Hooks para la verificación
Deja estos ganchos para que `/scene-verify` funcione sin tocar la lógica de render:
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
