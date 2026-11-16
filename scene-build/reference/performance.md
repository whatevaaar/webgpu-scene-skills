# Rendimiento y cero asignaciones

El TARGET manda: en el ejemplo, 2560×1440, GPU frame ≤ 11 ms promedio, ningún frame > 16.7 ms
en un fly-through de 60 s. Diseña para ese presupuesto, no para "a ver si entra".

## Cero asignaciones de JS por frame (crítico — evita el GC stutter)
Dentro de `requestAnimationFrame` NO debe haber:
- `new X()` (incluye `new Float32Array`, `new Date`, vectores, matrices).
- Literales `[]` o `{}`, ni spreads que creen arrays/objetos.
- `.map/.filter/.slice/.concat`, `Array.from`, destructuring que cree objetos.
- Template strings / concatenación de strings (p.ej. para HUD) salvo a baja frecuencia.
- Closures nuevas por frame (callbacks inline que capturan).

En su lugar:
- **Preasigna** todos los scratch (`vec3`, `mat4`, uniform staging `Float32Array`) a nivel de
  módulo y **reescríbelos in-place** cada frame.
- Usa un **ring buffer** preasignado para el frame log.
- Mantén las estructuras de agentes/partículas en typed arrays o GPU buffers, no en arrays de
  objetos.
- Escribe uniforms con `queue.writeBuffer(buf, 0, scratchF32)` reutilizando el mismo array.
- Para el HUD, actualiza texto sólo cada ~250 ms y reusa nodos del DOM.

Verifica con DevTools → Performance → grabar el fly-through: la traza de memoria JS debe ser
**plana** (línea de sierra = asignaciones por frame = fallo).

## GPU: mantenerse en presupuesto
- **Instancing** para todo lo que se repite (flora, boulders, peces, partículas). Un draw por
  tipo, miles de instancias.
- **Compute** para simulación (boids, partículas, deformaciones de olas) — nunca en JS.
- **Culling/LOD**: frustum cull por instancia (en compute, compactando con indirect draw si hace
  falta); baja densidad/geometría a distancia. La niebla ayuda a esconder LOD lejano.
- **Overdraw**: los volumétricos (god rays, niebla fullscreen) son caros; hazlos a media
  resolución y upscale, o limita los pasos del raymarch. Depth prepass para fragmentos opacos.
- **Minimiza cambios de pipeline/bind group**: ordena draws por pipeline; usa un bind group de
  frame-constants y otro por material.
- **Evita stalls**: nada de `mapAsync`/readback síncrono en el loop. Las timestamp queries se
  resuelven de forma diferida (lee el resultado 1–2 frames después, con buffers dedicados).

## Antialiasing (clave para el critic: shimmer/aliasing)
- Preferido: **TAA** — jitter de la proyección por frame (patrón Halton preasignado) +
  reproyección con historial; clamp de vecindario para evitar ghosting. Mitiga shimmer en kelp
  fino, specks y bordes lejanos.
- Alternativa/añadido: MSAA en el pase opaco, FXAA/SMAA espacial en post.
- **Specks/sparkle**: filtra por distancia (apágalos o redúcelos lejos) para no titilar.
- **Banding**: aplica dithering (ruido ordenado/azul) antes de presentar, sobre todo en la
  niebla y el cielo/gradiente.

## Presupuesto por capa (orienta, ajusta al TARGET)
Reparte los ~11 ms: terreno+arquitectura ~2, flora instanciada ~2, criaturas+flocking ~1.5,
partículas ~1, volumétricos ~2.5, post+TAA ~1.5, margen ~0.5. Si una capa se pasa, baja su
densidad/resolución antes que sacrificar el frame pacing.

## Medición (lo que consume /scene-verify)
- `window.__frameLog`: ring buffer preasignado de tiempos (CPU y, si hay, GPU timestamp).
- `window.__perf()` → `{avg, p99, max, count}` calculado sin asignar (acumuladores).
- El fly-through determinista garantiza que avg/p99/max sean comparables entre iteraciones.
