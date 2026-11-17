# Critic anclado + verificación de claims + ensemble (palanca #2)

> **Por qué (postmortem).** Un critic de texto single-shot afirma cosas falsas con seguridad —
> en una sesión real dijo "sin fog / sin bloom / sin AA" cuando el código tenía los tres. Lee un
> estilo flat-shaded procedural como "roto" y nunca converge contra un estilo minimalista. Estas
> tres técnicas reducen falsos positivos y hacen el gate confiable **sin** supervisión humana.

Correr **sólo después de que Gate 0 (correctitud mecánica) pase**.

## 1. Anclar el critic al estilo pretendido
El prompt del critic (que sólo ve imágenes) debe incluir:
- El **techo de fidelidad** declarado en el spec (p. ej. "estilizado-minimalista procedural", no
  fotorrealista). Pedile explícitamente **no marcar como defecto lo inherente a ese estilo**
  (materiales mate planos, geometría blocky, ventanas emissive sin textura, etc.).
- Opcional pero potente: una **imagen de referencia / moodboard** del objetivo, para que juzgue
  *relativo a un target* en vez de contra un AAA absoluto.
- Que **cite una región** por cada defecto (qué pose/zona), para poder verificarlo (abajo).

## 2. Verificar cada claim contra el código/métrica (mata falsos positivos)
Antes de "arreglar" cualquier finding, verificá que sea real:
- **Claim de ausencia de feature** ("no hay fog/bloom/AA/tonemap"): `grep` el feature en el
  `index.html`. Si existe → es percepción/estilo, **descartá el claim**. (Esto solo hubiera
  tirado la mayoría de los falsos positivos de la sesión.)
- **Claim medible** ("banding en el cielo", "frame casi negro", "void"): corré la **métrica CV**
  correspondiente (ver `gate0-metrics.js`) sobre esa región. Si la métrica no lo confirma →
  descartá.
- Lo que sobrevive a la verificación es un defecto real y accionable.

## 3. Ensemble (consenso de N critics)
- Lanzá **3 critics aislados independientes** (subagentes `general-purpose`, cada uno ve sólo las
  imágenes + la rúbrica anclada). Sin memoria entre ellos.
- Quedate sólo con los defectos en que **≥2 de 3 coinciden** (misma zona/severidad aproximada).
  Un solo critic alucinando queda filtrado por el voto.
- Para severidad, usá la **mediana** de los tres, no el máximo (evita que un critic pánico
  escale todo a blocker).

## 4. Iteración diferencial (A/B) en vez de scoring absoluto
Contra un estilo minimalista, "¿es suficientemente bueno?" nunca converge. En su lugar:
- Renderizá *el cambio* vs. *el mejor-anterior* y preguntale al juez **"¿cuál es mejor y por
  qué?"** → mejora monótona, converge.
- La "taste" humana se reduce a **una** decisión al inicio (elegir el mejor de N variantes como
  ancla), no supervisión continua.

## 5. Causa raíz automática + presupuesto
- Si un defecto *verificado* reaparece ≥2 rondas, corré el **A/B de aislamiento de capas**
  (`?noVeg`, `?noFlock`, …) automáticamente para atribuir la fuente antes de parchear.
- Fijá un **presupuesto** de rondas/tokens y una definición de "listo" acorde al techo de
  fidelidad. Pará al llegar al tope y reportá honestamente.

## Orden del gate (resumen)
```
Gate 0 (mecánico, gate0-metrics.js)  ──FAIL──►  arreglar, no gastar critic
        │ PASS
        ▼
Critic anclado × N  ─►  verificar claims (grep/métrica)  ─►  consenso ≥2/3
        │
        ▼  defectos reales → A/B diferencial, causa raíz si reinciden, hasta presupuesto
```
