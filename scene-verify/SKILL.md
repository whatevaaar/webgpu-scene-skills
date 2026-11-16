---
name: scene-verify
description: Verifica una escena WebGPU (index.html) contra los dos gates del spec — un critic visual (subagente que ve SÓLO los renders, nunca el código) sobre 6 poses fijas a 2560×1440 + grabación del fly-through, y rendimiento vía GPU timestamp queries y log de frame-times (avg/p99/max). Úsala tras /scene-build, o cuando el usuario diga "verifica la escena", "/scene-verify", "pasa los gates". Itera hasta que el critic no reporte nada por encima de "minor" y la perf cumpla el TARGET.
---

# scene-verify — Verificación de la escena

Corre los **dos gates** del spec sobre el `index.html` construido y entrega el veredicto.
Interacción en español. El critic trabaja en el idioma que prefiera; traduce su salida.

## Entradas
- `index.html` (o `index.min.html`) en el directorio de trabajo, con los hooks de
  `scene-build` (`?pose=N`, `?flythrough=1`, `window.__perf()`, `window.__frameLog`,
  `window.__ready`).
- `scene-spec.md` para leer el TARGET (resolución, presupuesto de ms, duración) — pero **nunca
  se lo pases al critic**.

Si faltan los hooks, pídele a `scene-build` que los añada antes de verificar.

## Gate 1 — Critic visual (independiente del código)
Objetivo: detección imparcial de defectos. El critic **sólo ve imágenes/vídeo**, jamás el
código ni tu razonamiento ni el spec.

1. **Capturar** (ver `reference/critic-protocol.md` para comandos concretos):
   - Las **6 poses fijas** a la resolución del TARGET (2560×1440 por defecto), en Chrome con
     WebGPU acelerado por GPU. Guarda `pose0.png … pose5.png`.
   - Una **grabación corta del fly-through** (`?flythrough=1`), p.ej. MP4/GIF o una tira de
     frames cada ~0.5 s, para cazar shimmer, aliasing, popping y banding en movimiento.
2. **Lanzar el critic como subagente aislado** (Agent, `general-purpose`): el prompt contiene
   SÓLO las imágenes + la rúbrica de `reference/critic-protocol.md`. No incluyas rutas de
   código, ni el spec, ni qué intentabas lograr. Pídele defectos **priorizados y concretos**
   con severidad (blocker / major / minor) y ubicación (qué pose / qué momento).
3. **Iterar**: lleva los defectos ≥ major a `scene-build` (o arréglalos), re-renderiza y
   re-evalúa con un critic **nuevo** (sin memoria de la ronda anterior). Repite hasta que el
   critic no reporte **nada por encima de "minor"**.

## Gate 2 — Rendimiento
Objetivo: frame pacing estable en el TARGET.

1. Ejecuta el **fly-through determinista de 60 s** (`?flythrough=1`) a resolución completa del
   TARGET, en Chrome acelerado (ver `reference/perf-protocol.md`).
2. Recoge `window.__perf()` → **avg, p99, max** (preferir GPU timestamp; si no hay, CPU
   `performance.now`). Opcionalmente vuelca `window.__frameLog`.
3. **Criterio de aprobado** (del spec, por defecto): GPU frame time **≤ 11 ms promedio** y
   **ningún frame > 16.7 ms**. Reporta también p99.
4. Si no cumple: identifica la capa culpable (desactiva capas vía query flags o pide profiling a
   `scene-build`), optimiza y vuelve a medir.

## Entrega (DONE WHEN)
Ambos gates deben pasar. Entrega en español:
- Veredicto del critic final (resumen + que no hay nada > minor).
- Reporte de perf: avg / p99 / max, y si cumple el TARGET.
- Confirmación de tamaño minificado del `index.html` (de `scene-build`).
- Lista de defectos corregidos durante la iteración.

## Archivos de apoyo
- `reference/critic-protocol.md` — comandos de captura, aislamiento del critic, rúbrica y
  escala de severidad.
- `reference/perf-protocol.md` — ejecución del fly-through, lectura de timestamps, criterios.
