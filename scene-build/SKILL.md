---
name: scene-build
description: Construye una escena 3D procedural en tiempo real como un único index.html autocontenido, renderizado con WebGPU, sin motores (nada de Three.js/Babylon), todo procedural (sin archivos de textura/modelo) y con cero asignaciones de JS por frame. Úsala tras tener un scene-spec.md (de /scene-spec) o cuando el usuario diga "construye la escena", "/scene-build", "genera el index.html". Implementa el render, reporta el tamaño minificado, y deja la escena lista para /scene-verify.
---

# scene-build — Constructor de la escena

Toma un `scene-spec.md` y produce un **único `index.html` autocontenido** que cumple el
contrato técnico. La interacción es en español; el código y los comentarios, en inglés.

## Entrada
- Busca `scene-spec.md` en el directorio de trabajo. Si no existe, dile al usuario que corra
  `/scene-spec` primero (o ofrécete a correrlo).
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

## Entrega
Escribe `index.html` en el directorio de trabajo. Luego:
- Minifica mentalmente/realmente para **reportar el tamaño minificado** (y el crudo). Si
  minificas, guarda el minificado como `index.min.html` y conserva `index.html` legible.
- Resume en español: capas implementadas, tamaño (crudo + minificado), y "Siguiente paso:
  `/scene-verify` para pasar los dos gates".

## Archivos de apoyo
- `reference/webgpu-architecture.md` — estructura del render, pipelines, procedural, frame graph.
- `reference/performance.md` — cero asignaciones, instancing/compute, presupuesto de ms, AA.
