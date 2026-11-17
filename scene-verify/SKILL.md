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

## Gate 0 — Correctitud (mecánico, ANTES del critic estético)
> **Lección del postmortem (P0).** Verificar belleza sin antes verificar corrección es
> construir sobre arena. Un critic estético juzga belleza, no corrección: en una sesión real un
> bug de orientación de cámara (giro de 180°, 1 línea) sobrevivió ~16 rondas de captura porque
> el critic nunca lo priorizó y la vegetación del suelo se leía como "confeti en el techo". Un
> humano lo vio de un vistazo. **Estos checks son baratos, deterministas y van primero.**

Antes de gastar un solo token de critic, corré **`reference/gate0-metrics.js`** (Node +
Puppeteer + pngjs, sin LLM, ~1 min, gratis):
```
node reference/gate0-metrics.js "file:///ABS/PATH/index.html"
```
Verifica mecánicamente, de forma determinista:
1. **Orientación**: con `?calib=1` el motor dibuja 3 marcadores de color (verde=UP, rojo=DOWN,
   amarillo=+X derecha). El script lee sus centroides y afirma que arriba está arriba y que +X
   está a la derecha → **atrapa flips verticales Y espejos horizontales**. (Probado: con el bug
   de 180° reintroducido, falla en ~5 s.)
2. **Void / frame-vacío** por pose: `darkFrac` (histograma de luminancia) + `varr` (varianza
   espacial). Atrapa voids negros, cámara enterrada en pared, y cámara apuntando al cielo vacío.

Exit 0 = PASS (seguí al critic). Exit ≠ 0 = **fallo mecánico: arreglalo primero, no gastes
tokens de critic.** Esto hubiera atrapado el flip y los frames vacíos en la primera ronda.

## Gate 1 — Critic visual (independiente del código)
Objetivo: detección imparcial de defectos. El critic **sólo ve imágenes/vídeo**, jamás el
código ni tu razonamiento ni el spec.

> **Los claims del critic son HIPÓTESIS, no verdad (P1).** Un critic de texto puede afirmar con
> seguridad "no hay fog / sin bloom / sin AA" cuando el código SÍ los tiene — lee un estilo
> flat-shaded procedural como "roto". Antes de "arreglar" un claim, **verificalo contra el
> código** (grep del feature). Si el feature existe, es percepción/estilo, no bug → no lo
> persigas. Pasale al critic el **estilo pretendido** y qué NO marcar como defecto por ser
> inherente a ese estilo (ver el techo de fidelidad en el spec).

1. **Capturar** (ver `reference/critic-protocol.md` para comandos concretos):
   - Las **6 poses fijas** a la resolución del TARGET (2560×1440 por defecto), en Chrome con
     WebGPU acelerado por GPU. Guarda `pose0.png … pose5.png`.
   - Una **grabación corta del fly-through** (`?flythrough=1`), p.ej. MP4/GIF o una tira de
     frames cada ~0.5 s, para cazar shimmer, aliasing, popping y banding en movimiento.
2. **Lanzar el critic como subagente aislado** (Agent, `general-purpose`): el prompt contiene
   SÓLO las imágenes + la rúbrica de `reference/critic-protocol.md`. No incluyas rutas de
   código, ni el spec, ni qué intentabas lograr. Pídele defectos **priorizados y concretos**
   con severidad (blocker / major / minor) y ubicación (qué pose / qué momento).
3. **Iterar** (con disciplina anti-thrash):
   - Clasificá cada finding en: *arreglable* / *inherente-al-estilo* / *falso-positivo del
     critic* (ver nota de hipótesis). Sólo actuá sobre los *arreglables*.
   - **Causa raíz, no parche repetido**: si el mismo defecto reaparece ≥2 rondas, **parar de
     parchear y aislar la capa** con los flags `?noX` (`?noVeg`, `?noFlock`, …) para encontrar
     la fuente. Un síntoma recurrente es señal de causa raíz, no de "subir la dosis del parche".
   - Llevá los *arreglables* ≥ major a `scene-build`, re-renderizá y re-evaluá con un critic
     **nuevo** (sin memoria de la ronda anterior).
   - **Presupuesto explícito**: fijá un tope de rondas/tokens para el loop visual y una
     definición de "suficientemente bueno" acorde al **techo de fidelidad del spec** (un
     renderer procedural minimalista no va a pasar un critic que exige fotorrealismo — eso es
     límite del estilo, no defecto). Pará al llegar al tope y reportá honestamente.

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
Los **tres** gates deben pasar (0 mecánico → 1 critic → 2 perf). Entrega en español:
- Veredicto del critic final (resumen + que no hay nada > minor).
- Reporte de perf: avg / p99 / max, y si cumple el TARGET.
- Confirmación de tamaño minificado del `index.html` (de `scene-build`).
- Lista de defectos corregidos durante la iteración.

## Archivos de apoyo
- `reference/gate0-metrics.js` — **Gate 0**: checks mecánicos de correctitud (orientación vía
  `?calib` + void/frame-vacío), sin LLM. Se corre ANTES del critic.
- `reference/critic-ensemble.md` — **Gate 1 robusto**: anclar el critic al estilo, verificar
  cada claim contra código/métrica (mata falsos positivos), ensemble ≥2/3, A/B diferencial,
  causa raíz automática y presupuesto.
- `reference/critic-protocol.md` — comandos de captura, aislamiento del critic, rúbrica y
  escala de severidad.
- `reference/perf-protocol.md` — ejecución del fly-through, lectura de timestamps, criterios.
