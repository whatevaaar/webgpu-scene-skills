# Arquitectura WebGPU para la escena

Guía de implementación. Todo en un `index.html`: un `<canvas>`, un `<script type="module">`
con WGSL embebido en template strings (los shaders se definen UNA vez al inicio, no por frame).

## Boot
1. `navigator.gpu.requestAdapter()` → `requestDevice()` (pide features: `timestamp-query` si
   está, opcional). Si falta WebGPU, pinta un mensaje y sal.
2. Configura el contexto del canvas con `getPreferredCanvasFormat()`, `alphaMode: 'opaque'`.
3. Maneja resize: recrea depth/targets sólo en resize (nunca por frame). Devuélvelos del pool.

## Recursos (todo preasignado al arranque)
- **Uniforms**: un buffer por frame-constants (viewProj, cámara, tiempo, parámetros de niebla,
  dirección de luz). Escríbelo con un `Float32Array` scratch reutilizado + `queue.writeBuffer`.
- **Geometría procedural**: genera vértices/índices en JS al inicio (o en compute). Formas base:
  - Terreno/arquitectura: heightfield o SDF marcheado a malla; cañones/arcos vía ruido + dominio
    deformado; boulders flotantes como icosaedros ruidosos instanciados.
  - Flora/props: unas pocas mallas base (tira para kelp/alga, cono/cilindro para troncos, quad
    para hojas) **instanciadas** miles de veces con per-instance transform+phase+color.
  - Criaturas: malla base (manta = plano deformado, pez = elipsoide) deformada en el vertex
    shader por tiempo; multitudes vía instancing.
- **Ruido**: value/Perlin/simplex y FBM implementados en WGSL (sin texturas). Para caústicas,
  sum de ondas o Worley animado. Para "specks"/sparkle, hash por-instancia.

## Pipelines (frame graph típico)
1. **Depth prepass** (opcional) para ayudar al overdraw de volumétricos.
2. **Opaque**: terreno + arquitectura + set pieces (un pipeline, varios draws instanciados).
3. **Instanced flora/props**: pipeline con per-instance buffer; alpha-test para hojas.
4. **Creatures**: pipeline instanciado con deformación temporal en vertex.
5. **Particles**: puntos/quads instanciados; posiciones avanzadas en un **compute pass**
   (ping-pong de buffers), nunca en JS.
6. **Flocking**: compute pass (boids: separación/alineación/cohesión) sobre buffer de agentes;
   el render de peces lee ese buffer.
7. **Volumetrics**: god rays (radial blur desde la luz / raymarch ligero), niebla por
   absorción aplicada en los shaders de superficie y/o en un fullscreen pass usando depth.
8. **Post**: tonemapping (ACES/filmic), exposición, dithering para evitar banding, y
   antialiasing (TAA con jitter de proyección + reproyección, o al menos FXAA/SMAA espacial).

## Cámara y controles
- Cámara libre: posición + yaw/pitch. Pointer lock en click; `movementX/Y` para mirar.
- WASD en el plano de vista, Q/E para subir/bajar, Shift multiplica la velocidad.
- Integra con delta-time; clampa pitch. Matriz view/proj recalculada en scratch arrays.
- **Poses fijas** (`?pose=0..5`): array de 6 {pos, yaw, pitch} preasignado, elegidas para
  mostrar: (0) vista de apertura del claro, (1) a través de un arco/túnel, (2) un set piece de
  cerca, (3) el banco/bandada en movimiento, (4) contraluz con god rays, (5) panorámica a
  distancia (test de niebla/aliasing lejano).
  **≥2 de las 6 DEBEN ser close-ups de hero elements** (no sólo vistas generales): es donde
  `scene-verify` detecta el *plateau de primitivas*. Encuadra cada hero de cerca en alguna pose, a
  menos que el spec lo marque como "ver a distancia/silueta" (sujeto sensible dirigido).
- **Fly-through** (`?flythrough=1`): spline Catmull-Rom determinista por 60 s que pasa por los
  puntos de interés; sin input; usado para grabar y para el log de frames.

## Niebla / profundidad
Implementa absorción exponencial por distancia con el **gradiente near→far del spec**
(mezcla de dos colores según distancia). Es la herramienta principal para ocultar los límites
del mundo desde el área inicial.

## Reglas de robustez
- Nada de assets externos. WGSL inline. Cero `await` dentro del loop.
- Si `timestamp-query` no está, el log cae a `performance.now()` por frame (sigue siendo útil).
- Degradación: si el adaptador es débil, permite un `?scale=0.75` interno (render a menor res y
  upscale) — pero el default es resolución completa del TARGET.
