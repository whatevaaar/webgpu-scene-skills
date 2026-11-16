# Protocolo de rendimiento

## Qué mide el spec
Del TARGET (default del ejemplo): a 2560×1440 resolución completa, **GPU frame time ≤ 11 ms
promedio** y **ningún frame > 16.7 ms** durante un **fly-through scripteado de 60 s**. Reporta
**avg, p99 y max**. El fly-through es determinista para que las cifras sean comparables entre
iteraciones.

## Fuentes de medida (las deja scene-build)
- **GPU timestamp queries**: tiempo real de GPU por frame, resuelto de forma diferida (lectura
  1–2 frames después, sin stalls). Es la métrica preferente.
- **CPU `performance.now()`** por frame como respaldo si el adaptador no soporta
  `timestamp-query`.
- `window.__frameLog`: ring buffer preasignado con los tiempos.
- `window.__perf()` → `{avg, p99, max, count}` calculado con acumuladores (sin asignar).

## Ejecución
1. Abre `index.html?flythrough=1` en Chrome con WebGPU por GPU (mismos flags que el critic),
   viewport 2560×1440, `deviceScaleFactor: 1`, ventana realmente visible/activa (una pestaña en
   background puede throttlear a 60 Hz y falsear el max).
2. Deja correr los 60 s completos del recorrido.
3. Lee el resultado:
   ```js
   await page.evaluate(() => window.__perf())   // {avg, p99, max, count}
   ```
   Opcional: vuelca `window.__frameLog` para histograma/percentiles propios.
4. Corre 2–3 pasadas y reporta la mediana de las métricas (evita ruido de warm-up; descarta los
   primeros ~1–2 s de calentamiento de pipelines/TAA).

## Criterio de aprobado
- `avg(GPU) ≤ BUDGET_MS` (11 ms por defecto), y
- `max(GPU) ≤ MAX_MS` (16.7 ms por defecto, ≈ un frame a 60 Hz).
- Reporta `p99` como contexto de estabilidad del pacing.

## Si no cumple
- Identifica la capa culpable: `scene-build` debe permitir desactivar capas por query flag
  (p.ej. `?noVolumetrics=1`, `?noParticles=1`) o emitir timings por pase.
- Órdenes de ataque habituales: bajar resolución de volumétricos, recortar pasos de raymarch,
  reforzar culling/LOD de instancias, reducir overdraw, mover simulación a compute.
- Re-mide tras cada cambio. No sacrifiques el frame pacing por densidad visual (prioridad 2 > 3,
  pero 1 > 2: si un recorte mata la calidad, busca otra palanca).

## Nota sobre asignaciones por frame
Un `max` muy por encima del `avg` con picos periódicos suele ser **GC stutter** por
asignaciones en el loop. Antes de culpar a la GPU, revisa en DevTools → Performance que la
traza de memoria JS sea plana durante el fly-through. Si hay sierra, vuelve a `scene-build`
(cero asignaciones por frame).
