---
name: scene-verify
description: Verifica una escena WebGPU (index.html) contra los dos gates del spec — un critic visual (subagente que ve SÓLO los renders, nunca el código) sobre 6 poses fijas a 2560×1440 + grabación del fly-through, y rendimiento vía GPU timestamp queries y log de frame-times (avg/p99/max). Úsala tras /scene-build, o cuando el usuario diga "verifica la escena", "/scene-verify", "pasa los gates". Itera hasta que el critic no reporte nada por encima de "minor" y la perf cumpla el TARGET.
---

# scene-verify — Verificación de la escena

Corre los **dos gates** del spec sobre el `index.html` construido y entrega el veredicto.
Interacción en español. El critic trabaja en el idioma que prefiera; traduce su salida.

## Entradas
- **Una carpeta por escena (obligatorio).** La escena vive en su propia subcarpeta
  (`scenes/<slug>/`, convención de `scene-spec`/`scene-build`). Opera dentro de esa carpeta:
  lee el `index.html` de ahí y **escribe todos los artefactos de verificación** (renders
  `pose0.png`…`pose5.png`, grabación del fly-through, logs de perf) **dentro de esa misma
  carpeta** — nunca sueltos en la raíz ni en el repo de skills. Si hay varias carpetas de
  escena, pregunta al usuario cuál verificar.
- `index.html` (o `index.min.html`) en la carpeta de la escena, con los hooks de
  `scene-build` (`?pose=N`, `?flythrough=1`, `window.__perf()`, `window.__frameLog`,
  `window.__ready`).
- `scene-spec.md` (en la misma carpeta) para leer el TARGET (resolución, presupuesto de ms,
  duración) — pero **nunca se lo pases al critic**.

Si faltan los hooks, pídele a `scene-build` que los añada antes de verificar.

## Gate 0 — Correctitud (mecánico, ANTES del critic estético)
> **Lección del postmortem (P0).** Verificar belleza sin antes verificar corrección es
> construir sobre arena. Un critic estético juzga belleza, no corrección: en una sesión real un
> bug de orientación de cámara (giro de 180°, 1 línea) sobrevivió ~16 rondas de captura porque
> el critic nunca lo priorizó y la vegetación del suelo se leía como "confeti en el techo". Un
> humano lo vio de un vistazo. **Estos checks son baratos, deterministas y van primero.**

Antes de gastar un solo token de critic, corre **`reference/gate0-metrics.js`** (Node +
Puppeteer + pngjs, sin LLM, ~1 min, gratis):
```
node reference/gate0-metrics.js "file:///ABS/PATH/index.html"
```
> **Deps/entorno (Windows).** `gate0-metrics.js` y `record-video.js` necesitan `puppeteer-core`
> + `pngjs` y un navegador (Edge por defecto; override con `BROWSER_PATH`). Si el dir de skills es
> un symlink, Node resuelve `node_modules` desde la ruta real del script: instala las deps en la
> carpeta de la escena y corre con `NODE_PATH=<escena>/node_modules …`, o instálalas junto al
> script en el repo de skills.
Verifica mecánicamente, de forma determinista:
1. **Orientación**: con `?calib=1` el motor dibuja 3 marcadores de color (verde=UP, rojo=DOWN,
   amarillo=+X derecha). El script lee sus centroides y afirma que arriba está arriba y que +X
   está a la derecha → **atrapa flips verticales Y espejos horizontales**. (Probado: con el bug
   de 180° reintroducido, falla en ~5 s.)
2. **Void / frame-vacío** por pose: `darkFrac` (histograma de luminancia) + `varr` (varianza
   espacial). Atrapa voids negros, cámara enterrada en pared, y cámara apuntando al cielo vacío.

Exit 0 = PASS (sigue al critic). Exit ≠ 0 = **fallo mecánico: arréglalo primero, no gastes
tokens de critic.** Esto hubiera atrapado el flip y los frames vacíos en la primera ronda.

## Gate 1 — Critic visual (independiente del código)
Objetivo: detección imparcial de defectos. El critic **sólo ve imágenes/vídeo**, jamás el
código ni tu razonamiento ni el spec.

> **Los claims del critic son HIPÓTESIS, no verdad (P1).** Un critic de texto puede afirmar con
> seguridad "no hay fog / sin bloom / sin AA" cuando el código SÍ los tiene — lee un estilo
> flat-shaded procedural como "roto". Antes de "arreglar" un claim, **verifícalo contra el
> código** (grep del feature). Si el feature existe, es percepción/estilo, no bug → no lo
> persigas. Pásale al critic el **FIDELITY TARGET (dirección) del spec** como ancla, pero el critic
> NO juzga "cuán realista": juzga **compromiso + especificidad temática**. Reglas, a CUALQUIER
> fidelidad: (a) NO marcar un estilo elegido (stylized o realista) como defecto por ser ese estilo;
> (b) NO exigir fotorrealismo; (c) SÍ marcar como defecto el **medio-compromiso/uncanny** (realismo
> a medias: ruido en albedo, SSS/god-rays difusos, niebla lechosa, specular plástico sobre lambert)
> y la **geometría genérica de reemplazo** (pez=óvalo, pájaro=triángulo, edificio=caja sin rasgos,
> todo=esfera) que hace que la escena se parezca a cualquier otra. Un estilizado comprometido y uno
> realista completo son ambos válidos; un medio-realismo o un genérico, no.

1. **Capturar** (ver `reference/critic-protocol.md` para comandos concretos):
   - Las **6 poses fijas** a la resolución del TARGET (2560×1440 por defecto), en Chrome con
     WebGPU acelerado por GPU. Guarda `pose0.png … pose5.png`.
   - **Close-ups de cada hero element (clave — detección temprana del plateau).** Además de las 6
     poses generales, captura un **primer plano de cada hero element** (reposicionando la cámara vía
     `window.__cam`, o usando las poses que el build dedicó a heroes). El plateau de primitivas se
     delata DE CERCA: si sólo ves los heroes a media distancia, el critic no lo marca hasta rondas
     tardías (postmortem sesión 3: la mansión gastó ~4 rondas antes de que el close-up delatara que
     rosetón/retratos eran primitivas). Guárdalos como `hero_<nombre>.png` y pásaselos al critic
     junto a las poses. **Excepción:** si el spec marcó ese hero como "ver a distancia/silueta"
     (sujeto sensible, opción (b)), NO le saques close-up — respeta la decisión de dirección de arte.
   - Una **grabación corta del fly-through** (`?flythrough=1`), p.ej. MP4/GIF o una tira de
     frames cada ~0.5 s, para cazar shimmer, aliasing, popping y banding en movimiento.
2. **Lanzar el critic como subagente aislado** (Agent, `general-purpose`): el prompt contiene
   SÓLO las imágenes + la rúbrica de `reference/critic-protocol.md`. No incluyas rutas de
   código, ni el spec, ni qué intentabas lograr. Pídele defectos **priorizados y concretos**
   con severidad (blocker / major / minor) y ubicación (qué pose / qué momento).
   **Rúbrica de calidad POSITIVA (P1 — postmortem sesión 2).** Medir sólo "ausencia de defectos"
   hace que el loop converja a *"no está roto"*, nunca a *"es hermoso"* — y que distintas escenas
   salgan iguales. Además de defectos, pídele al critic un **score 1–10 en cada eje**: dirección
   de arte, composición/legibilidad, **compromiso y factura** (¿está todo ejecutado entero, sin
   efectos a medias? — NO "cuán realista es"), y **especificidad/unicidad** (¿las criaturas y hero
   elements están modelados al sujeto, y la escena se ve distinta de un genérico "primitivas +
   niebla"?). El gate no sólo exige "nada > minor", también que el **score suba ronda a ronda**.
   **El techo escala con los ciclos:** no conviertas el loop en converger a un piso — con ciclos
   disponibles, empuja MÁS ambición/especificidad. Si el score se estanca dos rondas, NO bajes la
   vara: es falta de craft específico → vuelve a `scene-build` con un cambio estructural (geometría
   firma), no cosmético.
   **Check de similitud entre escenas.** Si hay escenas previas, comprueba que ESTA no sea la
   anterior con otra paleta (mismo toolkit de primitivas). Si se parecen, es un fallo de unicidad
   (major): exige a `scene-build` geometría/material/técnica específicos del tema.
3. **Iterar** (con disciplina anti-thrash):
   - **Disparador estructural para heroes (anti-plateau).** Si un hero element se marca como
     genérico/primitiva **≥2 rondas**, O la **especificidad no sube en 2 rondas**, PARA el tuning
     cosmético: manda a `scene-build` una **directiva de malla explícita** — "reemplaza la primitiva
     X (quad/disco/abanico) por geometría modelada: partes a, b, c" (saca las partes del GEOMETRY
     PLAN del spec). Un hero que rebota NO se arregla con color/luz; es cambio de geometría.
     > **Por qué (postmortem sesión 3).** La mansión embrujada gastó ~4 rondas en tuning (exposición,
     > niebla, saturación del vitral) antes de que quedara claro que rosetón/retratos/criaturas
     > necesitaban malla, no parches. Los scores rebotaban (especificidad 4→3→5→3) en vez de subir:
     > ESA es la firma del plateau. El fix es estructural y temprano, no otra ronda cosmética.
   - **Ledger persistente de defectos (no critic amnésico).** Mantén una lista acumulada entre
     rondas (defecto → estado: abierto/arreglado/inherente/falso-positivo). El critic nuevo de
     cada ronda da imparcialidad, pero TÚ llevas el ledger: confirma que los de la ronda previa
     se cerraron y que no reaparecen. Sin ledger, el loop hace whack-a-mole (cada ronda inventa
     majors nuevos y el piso de calidad nunca sube).
   - Clasifica cada finding en: *arreglable* / *inherente-al-estilo* / *falso-positivo del
     critic* (ver nota de hipótesis). Sólo actúa sobre los *arreglables*.
   - **Causa raíz, no parche repetido**: si el mismo defecto reaparece ≥2 rondas, **parar de
     parchear y aislar la capa** con los flags `?noX` (`?noVeg`, `?noFlock`, …) para encontrar
     la fuente. Un síntoma recurrente es señal de causa raíz, no de "subir la dosis del parche".
   - Lleva los *arreglables* ≥ major a `scene-build`, re-renderiza y re-evalúa con un critic
     **nuevo** (sin memoria de la ronda anterior).
   - **Presupuesto de ciclos = techo, no tope de ambición.** Usa el CYCLE CEILING del spec: con
     muchos ciclos, "listo" exige MÁS especificidad y compromiso ronda a ronda, no menos. "Listo" =
     la dirección elegida ejecutada ENTERA (sin efectos a medias), criaturas/hero elements modelados
     al sujeto (no primitivas genéricas), y nada > minor — a la fidelidad que el spec pidió. Si se
     estanca primitivo/genérico o a-medias, es cambio estructural pendiente en `scene-build`, no un
     techo de la herramienta. Un render que necesita muchos ciclos para llegar alto es esperable y
     válido; no bajes la vara para cerrar rápido. Para sólo al agotar el presupuesto de ciclos del
     spec, y reporta honestamente qué quedó.

## Gate 2 — Rendimiento
Objetivo: frame pacing estable en el TARGET.

1. Ejecuta el **fly-through determinista de 60 s** (`?flythrough=1`) a resolución completa del
   TARGET, en Chrome acelerado (ver `reference/perf-protocol.md`).
2. Recoge `window.__perf()` → **avg, p99, max** (preferir GPU timestamp; si no hay, CPU
   `performance.now`). Opcionalmente vuelca `window.__frameLog`.
3. **CONSCIENCIA DE HARDWARE (obligatorio).** El budget (≤11 ms avg / ≤16.7 ms max) es para la
   **GPU del TARGET del spec** (p.ej. RTX 5070 Ti). Antes de dar un veredicto, determina la GPU de
   la máquina de verificación (`adapter.info`/`requestAdapterInfo`, o reporta "desconocida"):
   - Si la GPU de verificación **es** la del TARGET → aplica el criterio tal cual (PASS/FAIL).
   - Si **no lo es** → NO declares FAIL contra un budget de otra GPU. Reporta los números crudos +
     la GPU real + la resolución, marca **"no verificable en este hardware"**, y si quieres una
     señal, compara contra un budget escalado o reporta FPS. Lo que SÍ es válido en cualquier
     hardware: **estabilidad de pacing** (max/avg, p99, picos periódicos = GC stutter) y el
     **ranking relativo** entre iteraciones. No gastes ciclos "optimizando" para una GPU que no es
     la del spec salvo que el pacing (no el promedio absoluto) esté roto.
4. **Criterio de aprobado** (en el hardware del TARGET): GPU frame time **≤ 11 ms promedio** y
   **ningún frame > 16.7 ms**. Reporta también p99.
5. Si no cumple (en hardware del target): identifica la capa culpable (desactiva capas vía query
   flags o pide profiling a `scene-build`), optimiza y vuelve a medir. Recuerda: un efecto que no
   entra en budget se **corta o reemplaza**, no se deja a media resolución feo.

## Entrega (DONE WHEN)
Los **tres** gates deben pasar (0 mecánico → 1 critic → 2 perf). Entrega en español:
- Veredicto del critic final (resumen + que no hay nada > minor).
- Reporte de perf: avg / p99 / max, y si cumple el TARGET.
- Confirmación de tamaño minificado del `index.html` (de `scene-build`).
- Lista de defectos corregidos durante la iteración.

## Extra — Video deliverable (vertical / horizontal, duración parametrizable)
Para entregar un clip del procedural (showreel, redes, preview), usa
**`reference/record-video.js`**: graba el fly-through determinista vía `MediaRecorder` sobre
`canvas.captureStream()` (sin ffmpeg) y escribe un `.webm` (VP9).
```
node reference/record-video.js "file:///ABS/PATH/index.html" horizontal 5 video_h.webm
node reference/record-video.js "file:///ABS/PATH/index.html" vertical  5 video_v.webm
```
- Orientación: `horizontal` (1920×1080) o `vertical` (1080×1920).
- Duración: segundos (default 5, parametrizable).
- Requiere `puppeteer-core` resoluble (mismo setup que `gate0-metrics.js`) y usa el fly-through
  (`?flythrough=1`), así que funciona con cualquier escena que tenga los hooks de `scene-build`.
- Guarda el clip en la carpeta de la escena (`scenes/<slug>/`).

## Archivos de apoyo
- `reference/record-video.js` — graba un clip `.webm` (vertical/horizontal, duración param.) del
  fly-through vía MediaRecorder. Deliverable de video, sin dependencias de encoder externo.
- `reference/gate0-metrics.js` — **Gate 0**: checks mecánicos de correctitud (orientación vía
  `?calib` + void/frame-vacío), sin LLM. Se corre ANTES del critic.
- `reference/critic-ensemble.md` — **Gate 1 robusto**: anclar el critic al estilo, verificar
  cada claim contra código/métrica (mata falsos positivos), ensemble ≥2/3, A/B diferencial,
  causa raíz automática y presupuesto.
- `reference/critic-protocol.md` — comandos de captura, aislamiento del critic, rúbrica y
  escala de severidad.
- `reference/perf-protocol.md` — ejecución del fly-through, lectura de timestamps, criterios.
