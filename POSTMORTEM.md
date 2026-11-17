# Postmortem — webgpu-scene-skills

Retrospectiva de la sesión en que se construyó **y se ejercitó de punta a punta** el set de
3 skills (`scene-spec` → `scene-build` → `scene-verify`), usando como caso real una escena
"jardín cyberpunk en azotea bajo lluvia neón".

Fecha: 2026-11-16.

---

## 1. Resumen ejecutivo

El pipeline de 3 skills **cumplió su objetivo**: a partir de una frase ("jardín cyberpunk")
un drill-down generó un spec rico, `scene-build` produjo un `index.html` WebGPU correcto,
procedural, cero-asignaciones/frame y rapidísimo (~3 ms GPU @ 2560×1440, presupuesto 11 ms),
y `scene-verify` corrió un critic visual aislado real + perf con GPU timestamps.

Pero la sesión también expuso **fallas de proceso caras**: un bug de orientación de cámara
(giro de 180°) pasó desapercertido ~16 rondas de captura y 6 del critic, y provocó que el loop
persiguiera un síntoma ("confeti en el techo") en vez de la causa raíz. Lo detectó el usuario
a simple vista en segundos. Ese contraste —horas de critic automático vs. un vistazo humano—
es la lección central.

---

## 2. Qué se construyó

- **scene-spec**: drill-down en español sobre 10 dimensiones, con default submarino y una vara
  de riqueza. Produjo un `scene-spec.md` en inglés técnico tan denso como el prompt original.
- **scene-build**: un solo `index.html` autocontenido. WebGPU, geometría/ruido/materiales
  procedurales, MSAA 4× + supersampling 1.5×, bloom, god rays, niebla por absorción, ACES,
  dithering, flocking procedural, lluvia, cero asignaciones por frame, hooks de verificación
  (`?pose=0..5`, `?flythrough=1`, `window.__perf()` con GPU timestamps).
- **scene-verify**: harness de captura en Edge/WebGPU headful (Puppeteer) + critic aislado
  (subagente que sólo ve PNGs) + gate de performance.

---

## 3. Qué funcionó

1. **La descomposición en 3 skills aguantó.** spec/build/verify son fronteras naturales y
   reutilizables; cada una se pudo correr y razonar por separado.
2. **El drill-down es el acierto de diseño.** Extrapolar detalles concretos y temáticos a
   partir de una semilla mínima (con AskUserQuestion) evitó el "dime todo tú" y produjo una
   escena rica sin fricción.
3. **El critic aislado atrapó la sobre-optimismo del builder.** El fork que iteró 13 rondas se
   autoevaluó "sin blockers/majors"; un critic fresco sin acceso al código encontró 1 blocker
   + 9 majors. **Esa independencia es exactamente el valor del gate.**
4. **La medición de perf fue sólida y nunca fue el cuello de botella** (GPU timestamps reales,
   avg/p99/max, fly-through determinista). El presupuesto se cumplió con 3× de margen todo el
   tiempo.
5. **La orquestación con fork** permitió delegar el loop caro sin contaminar el contexto
   principal.

---

## 4. Qué falló (incidentes)

### 4.1 — Incidente mayor: bug de orientación invisible (el "confeti fantasma")
El `viewFrom` tenía el vector *right* negado, lo que arrastraba al *up* (`up = cross(right,
forward)`) → **giro de 180° sobre el eje de vista**. El mundo se renderizaba al revés; el cielo
(screen-space) no, creando la contradicción "techo en el suelo".

- **Por qué no se detectó:** la geometría de cañón es casi simétrica arriba/abajo, así que el
  flip no saltaba. La vegetación del *suelo* aparecía *arriba* y se leía como "confeti/aliasing
  en el techo".
- **El costo:** el fork + el orquestador persiguieron ese "confeti" ~10 rondas — bajando la
  bandada, subiendo el fade de vegetación, metiendo "height haze", diagnosticando con `?noVeg`…
  todos **parches al síntoma**. `noVeg` incluso "confirmó" que era vegetación, reforzando el
  diagnóstico equivocado (no "por qué la vegetación está arriba").
- **La detección:** el usuario lo vio a simple vista ("el techo está en el suelo"). Fix: una
  línea (des-negar *right*).

### 4.2 — El critic aislado afirma cosas falsas con seguridad
En varias rondas el critic reportó "no hay distance fog", "sin bloom", "sin AA/tonemap" —
cuando el código **tenía** niebla exponencial, un pase de bloom, MSAA 4×+SS y ACES. Un critic
de texto lee un estilo *flat-shaded procedural minimalista* como "técnicamente roto".

### 4.3 — El loop nunca convergió solo
~16 rondas de captura + 6 de critic. Cada critic fresco y hostil "resetea" y vuelve a marcar
majors **inherentes al enfoque** (materiales mate sin textura, ventanas como calcomanías, grid
tileado). Sin un criterio que separe "defecto arreglable" de "límite del estilo", el gate
"nada por encima de minor" es inalcanzable y el loop se vuelve un pozo de tokens.

### 4.4 — Economía
El fork autónomo consumió ~330k tokens; cada captura ~3–4 min (Edge headful). El loop
visual es, con diferencia, la parte más cara del pipeline.

---

## 5. Causa raíz y lecciones

1. **Falta una capa de CORRECTITUD antes de la ESTÉTICA.** El critic juzga belleza, no
   corrección. Orientación, escala, "¿hay suelo?, ¿hay cielo?, ¿el arriba es arriba?" son
   checks mecánicos que un critic de belleza no prioriza — y que un humano detecta al instante.
   *Verificar belleza sin antes verificar corrección es construir sobre arena.*
2. **Un síntoma recurrente = señal de causa raíz, no de "parchear más fuerte".** Cuando el
   mismo defecto sobrevive N rondas, hay que **parar de parchear y aislar la causa**, no subir
   la dosis del parche.
3. **Las afirmaciones del critic son hipótesis, no verdad.** Deben verificarse contra el código
   antes de actuar; si no, el builder "arregla" cosas que ya existían y thrashea.
4. **El critic debe estar anclado al estilo pretendido.** Pedirle fotorrealismo a una escena
   procedural minimalista garantiza majors eternos. El spec debería declarar el techo de
   fidelidad y el critic respetarlo.
5. **La autoevaluación del builder no reemplaza un gate independiente** (confirmado), pero el
   gate independiente tampoco es infalible (4.2) — se necesitan *ambos* y contrastarlos.

---

## 6. Mejoras accionables (priorizadas)

### P0 — `scene-verify`: gate de CORRECTITUD antes del critic
Antes de gastar un solo token de critic estético, correr checks mecánicos automáticos:
- **Orientación**: renderizar un objeto de calibración asimétrico conocido (flecha "UP",
  o verificar que un objeto con ápice-arriba proyecta su ápice arriba) y afirmar que el mundo
  no está volteado/espejado.
- **Frame no-negro / no-vacío**: histograma de cada pose; si >X% es casi-negro o el frame es
  casi uniforme → fallo mecánico (void / cámara enterrada / apuntando al cielo).
- **Suelo y cielo presentes** en las poses que deberían tenerlos.
Estos checks son baratos, deterministas y hubieran atrapado el flip y los frames vacíos en la
primera ronda.

### P0 — `scene-build`: hooks de sanity por defecto
- **Orientación**: un `?calib=1` que dibuje ejes/flecha UP, y colisión + clamp de suelo por
  defecto (ya aplicado en esta sesión) para que la cámara libre no atraviese geometría ni caiga
  al vacío.
- Exponer `window.__cam` y flags de aislamiento de capas (`?noVeg`, `?noFlock`, …) como parte
  estándar del contrato de verificación (ya presentes; formalizarlos en la skill).

### P1 — `scene-verify`: disciplina de causa raíz y anti-thrash
- Si el critic repite un defecto ≥2 rondas, **forzar diagnóstico por aislamiento de capas**
  (flags `?noX`) en vez de re-parchear.
- Tratar cada claim del critic como **hipótesis**: el builder la verifica contra el código
  (grep del feature) antes de "arreglarla". Si el feature existe, es percepción/estilo, no bug.
- Pasar al critic el **estilo pretendido** y una lista de "no marcar como defecto lo inherente
  a este estilo".

### P1 — presupuesto y convergencia
- Fijar un **presupuesto de rondas/tokens** explícito para el loop visual, y una definición de
  "suficientemente bueno" por estilo, no "nada por encima de minor" en abstracto.
- Clasificar findings en: *arreglable* / *inherente-al-estilo* / *falso-positivo del critic*.

### P2 — `scene-spec`
- Capturar el **techo de fidelidad/estilo** (minimalista-estilizado vs. fotoreal) como
  dimensión, para calibrar al critic aguas abajo.

---

## 7. Métricas de la sesión

- Rondas de captura: ~16. Rondas de critic aislado: 6. Rondas del fork autónomo: 13 (~330k
  tokens).
- Bug de mayor costo: 1 línea (orientación), ~10 rondas persiguiendo su síntoma.
- Perf final: avg ~3.1–3.8 ms, p99 ~4.6–5.3 ms, max ~5 ms @ 2560×1440 (presupuesto 11/16.7).
- Bundle final: ~36 KB crudo / ~12 KB gzip.
- Gate de perf: **PASÓ** siempre, con holgura. Gate visual: orientación correcta; quedan
  majors inherentes al enfoque flat-shaded procedural.

---

## 8. Por qué no alcanzamos el polish del original (Abyssal Garden)

El prompt que generalizamos venía de **Abyssal Garden** de Noniv
(https://noniv.github.io/abyssal-garden/ · MIT): un solo HTML ~96 KB, WebGPU/WGSL, **compilado
desde un árbol modular** (`source/` + `npm run build`), con ~2 millones de hojas de kelp, shadow
casting, Web Audio procedural y escalado adaptativo de resolución/draw-distance. Nuestra escena
cyberpunk (one-shot, ~36 KB) no llegó a ese nivel. Por qué, honestamente:

1. **La calidad del loop de feedback es la diferencia central.** El autor del original itera con
   un **viewport en vivo**: ve la escena en movimiento, ajusta con su criterio y re-ve en
   segundos. Nosotros iteramos **a ciegas** vía capturas estáticas (~4 min por ronda) + un critic
   de texto que **no ve movimiento y malinterpreta el estilo** (afirmó "sin fog/bloom/AA"
   existiendo los tres). El polish del último 20% vive en micro-ajustes de ver-y-tocar que un
   proxy lento y ruidoso no habilita.
2. **Gastamos el presupuesto de iteración en un bug fantasma.** El flip de orientación se comió
   ~10 rondas. Un humano con sus ojos no pelea contra su propia tooling.
3. **Producto maduro vs. one-shot.** 96 KB compilados desde código modular, con densidad masiva
   (2M hojas vs. nuestros miles de instancias), shadows, audio, LOD adaptativo y touch →
   representa **mucho más trabajo deliberado y features** que un `index.html` generado en una
   sesión.
4. **El pipeline optimiza "spec rico + renderer correcto y rápido", no el long tail de dirección
   de arte.** Densidad, materiales texturizados, AA/shadows afinados y caminos de cámara
   compuestos a mano son **taste + tiempo humano**, justo donde los loops automáticos son más
   débiles.
5. **Un critic estético hostil no converge contra un estilo minimalista** — exige fotorrealismo
   y nunca da "pasa", así que no sirve como criterio de "listo" para este tipo de escena.
6. **Faltó la capa de correctitud** (orientación, suelo/cielo, frame-no-vacío) que un humano
   tiene gratis — ver P0. Sin ella, el loop pulía sobre una base torcida.

En una frase: **el original lo pulió una persona con criterio y un viewport en tiempo real; el
nuestro lo pulió un loop automático a través de un proxy lento, caro y a veces equivocado.** El
pipeline es excelente para llegar al 80% (spec rico, render correcto, perf en presupuesto); el
20% final de polish estético sigue necesitando ojo humano y/o un feedback loop en vivo.

## 9. Conclusión

Las skills son un buen andamiaje y el gate independiente demostró su valor. La lección que
vale la pena institucionalizar: **verificar corrección (mecánica, barata, determinista) ANTES
de verificar belleza (estética, cara, subjetiva)** — y cuando un síntoma reaparece, buscar la
causa raíz en vez de subir la dosis del parche. Un check de orientación de 10 líneas habría
ahorrado la parte más cara de esta sesión.

---

# Sesión 2 — "Ciudad inundada" (2026-11-16)

Segunda corrida de punta a punta con un tema nuevo (metrópolis submarina). Gate 0 y Gate 2
pasaron limpio; el critic convergió de *blocker + 6 majors* a pulido en 6 rondas. Pero el
usuario señaló tres problemas de fondo que el pipeline **no** está resolviendo: los resultados
son **(a) low-quality, (b) parecidos entre sí, y (c) de baja calidad visual pese a buen
frame-time**. Esta sección documenta la causa raíz y los cambios aplicados a los skills.

## S2.1 — Hallazgo central: TODAS las escenas salen iguales

Comparando el `index.html` de la biblioteca borgesiana (sesión 1.5) con el de la ciudad
inundada, son **arquitectónicamente idénticos**: cubos instanciados (edificios), conos
instanciados (coral/vegetación), quads sprite (partículas), shader de grid de ventanas
emisivas, flock + criatura hero + partículas, niebla de 2 colores, god rays, ACES + bloom +
dither. **El tema sólo cambia la paleta y unos parámetros.** Cualquier prompt —submarino,
desierto, cyberpunk— colapsa al mismo *"cajas brillantes + conos + niebla"*.

Causa raíz: `scene-build` tiene un **toolkit fijo de primitivas** y un pipeline genérico, y su
único listón es "cero asignaciones/frame + todos los elementos del SCENE presentes" — **verifica
presencia, no belleza ni unicidad**. Reusar el andamiaje anterior es, de hecho, lo que el skill
invita a hacer.

## S2.2 — El "techo de fidelidad" es una profecía autocumplida

El `spec-template` hace que cada escena declare *"stylized-minimalist, flat-shaded"*, y luego
`scene-verify` le PROHÍBE al critic marcar justamente lo que subiría la calidad (textura,
material, detalle geométrico, sombras). Resultado: el loop converge a *"no está roto"*, nunca a
*"es hermoso"*. El techo, pensado para evitar que un critic exija fotorrealismo imposible, se
convirtió en **licencia para esfuerzo bajo**.

## S2.3 — El critic amnésico hace whack-a-mole

Cada ronda usa un critic nuevo (bien, para imparcialidad) pero **sin ledger persistente**: cada
ronda inventa majors nuevos en vez de confirmar que el piso de calidad sube. Tras 6 rondas
seguía encontrando "majors" distintos. Mide **ausencia de defectos**, no **presencia de
calidad** (dirección de arte, composición, riqueza material, unicidad frente a otras escenas).

## S2.4 — Incidente: el mouse nunca giró la vista (bug del patrón generado)

En AMBAS escenas el pointer-lock no funcionaba. Causa raíz: el overlay `#msg`
(`position:fixed; inset:0`) **sin `pointer-events:none`** cubre todo el viewport y se come el
click del canvas → `requestPointerLock()` nunca se dispara. Confirmado con
`document.elementFromPoint(centro)` → devolvía `#msg`, no el `<canvas>`. Un check de 1 línea
(elementFromPoint en el centro === canvas) lo hubiera atrapado. Es un bug del **patrón que
genera `scene-build`**, no de una escena puntual — otra vez, correctitud mecánica barata que el
critic estético jamás iba a priorizar.

## S2.5 — Cambios aplicados a los skills (P0/P1 de esta sesión)

- **scene-spec**: nueva sección obligatoria **VISUAL SIGNATURE** (1–2 técnicas de render únicas
  del tema) + **ART REFERENCE** + **HERO ELEMENTS** (3–4 elementos que deben verse
  espectaculares), y anti-maximalismo (profundidad > amplitud).
- **spec-template**: el FIDELITY CEILING se reformula — flat-shading es aceptable **sólo si**
  composición, color, luz y movimiento son excelentes; NO es licencia para esfuerzo bajo.
  Añadidos campos VISUAL SIGNATURE / ART REFERENCE / HERO ELEMENTS.
- **scene-build**: (P0) overlays con `pointer-events:none` + check de `elementFromPoint`; (P1)
  **no colapsar todo al mismo toolkit** — geometría específica del tema, materiales reales
  (fresnel/spec/AO barato, texturas procedurales triplanares), 1–2 técnicas firma, y principio
  de **hero elements** (pocos elementos excelentes > muchos crudos).
- **scene-verify**: (P1) **rúbrica de calidad POSITIVA** en Gate 1 (arte, composición,
  materiales, unicidad) con score que debe SUBIR ronda a ronda; **ledger de defectos
  persistente** entre rondas; **check de similitud entre escenas**; y el techo de fidelidad
  reformulado igual que en el template.

## S2.6 — Lección central de la sesión 2

La sesión 1 institucionalizó *"correctitud antes que belleza"*. La sesión 2 añade: **el pipeline
optimiza lo que mide, y sólo mide corrección y presencia — no unicidad ni riqueza.** Para que
las escenas dejen de parecerse y suban de calidad, hay que **medir calidad positiva y unicidad
explícitamente**, y **quitar el techo de fidelidad como excusa**. Un renderer con toolkit fijo
produce, inevitablemente, la misma escena con otra paleta.
