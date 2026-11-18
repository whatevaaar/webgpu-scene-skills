# Protocolo del critic visual

## Principio de aislamiento (lo que da validez al gate)
El critic es un **subagente separado** que recibe EXCLUSIVAMENTE las imágenes y la rúbrica.
Nunca ve: el código, el `scene-spec.md`, tus intenciones, ni los defectos de rondas previas.
Esto evita que "sepa" qué debería ver y lo sesgue. Cada ronda usa un critic **nuevo**.

Cómo lanzarlo: usa la tool **Agent** con `subagent_type: "general-purpose"` y un prompt que
contenga sólo (a) las rutas de las 6 imágenes + los frames del fly-through, y (b) la rúbrica de
abajo. No pegues nada más.

## Captura de renders
Requiere Chrome con WebGPU por GPU. En Windows, un enfoque robusto es un pequeño harness de
Puppeteer-core apuntando al Chrome instalado, con los flags de WebGPU. Ejemplo de flags:

```
--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=default
--force-color-profile=srgb --hide-scrollbars
```

Flujo por pose (0..5):
1. Abre `file:///.../index.html?pose=N` con viewport 2560×1440, `deviceScaleFactor: 1`.
2. Espera a `window.__ready === true` y 2–3 frames extra para que TAA converja.
3. Screenshot PNG → `poseN.png`.

Fly-through:
1. Abre `index.html?flythrough=1`.
2. Graba la pestaña (o captura un frame cada ~500 ms durante el recorrido) a `flythrough/`.
3. Un GIF/MP4 corto o una tira de ~12–20 frames basta para juzgar movimiento.

Si no hay Puppeteer disponible, el usuario puede abrir las URLs manualmente y capturar; pídele
las imágenes. Si WebGPU headless falla, usa `--headless=new` con los flags anteriores o modo
con ventana real.

## Rúbrica que recibe el critic (pégala tal cual al subagente)
> Eres un crítico visual de gráficos en tiempo real. Sólo ves estas imágenes y una grabación.
> No tienes acceso al código ni a la intención. Evalúa la calidad visual y lista **defectos
> concretos y accionables**, priorizados. Para cada defecto indica: severidad
> (**blocker/major/minor**), en qué imagen/momento aparece, y una descripción específica.
> Revisa especialmente:
> - **Aliasing / shimmer**: bordes dentados, titileo en geometría fina, specks que parpadean.
> - **Banding**: escalones de color en nieblas/gradientes/cielo.
> - **Popping / LOD**: aparición brusca de objetos o cambios de detalle en el fly-through.
> - **Profundidad/niebla**: ¿se lee la distancia? ¿se ven límites del mundo que no deberían?
> - **Iluminación**: god rays/cáusticas creíbles, sin artefactos de banda ni doble imagen.
> - **Composición y legibilidad**: foco, contraste, silueta, sensación de escala.
> - **Coherencia de movimiento** (vídeo): ghosting de TAA, stepping, deriva no natural.
> - **Materiales**: coherentes y COMPLETOS para la dirección elegida; sin efectos a medias.
> - **Factura — NO juzgues "cuán realista" (te paso la DIRECCIÓN: stylized o realista aparte).**
>   A cualquier fidelidad, NO marques un estilo como defecto por ser ese estilo (ni el flat/cel/
>   low-poly, ni el realista), y NO exijas fotorrealismo. SÍ marca, como defectos de primer orden:
>   - **Medio-compromiso / uncanny:** realismo a medias — ruido en albedo fingiendo textura, SSS/
>     fresnel/god-rays difusos, niebla lechosa que lava el contraste, specular plástico sobre lambert.
>     (El uncanny viene de hacerlo *a medias*, no del realismo.)
>   - **Geometría genérica de reemplazo (homogeneización):** criaturas/objetos que son una primitiva
>     en vez del sujeto — pez=óvalo, pájaro=triángulo, edificio=caja sin rasgos, árbol=cono, todo=
>     esfera. Pide que cada criatura/hero element se lea como ESE sujeto (aletas, alas, aleros…),
>     sea estilizado o detallado. Low-poly NO es excusa para genérico.
>   - **Incoherencia / look genérico:** una escena que se ve como cualquier "primitivas + niebla".
> Devuelve: lista priorizada (severidad + ubicación + fix sugerido) y un veredicto global.

## Escala de severidad y criterio de salida
- **blocker**: rompe la ilusión (p.ej. z-fighting generalizado, niebla que corta objetos,
  banding masivo). Hay que arreglarlo sí o sí.
- **major**: defecto claramente visible que baja la calidad (shimmer notable, popping, borde
  visible del mundo). Hay que arreglarlo.
- **minor**: pulido fino perceptible sólo al buscarlo.

**Gate aprobado** cuando el critic no reporta **nada por encima de "minor"**. Lleva cada
blocker/major a `scene-build`, re-renderiza, y re-evalúa con un critic nuevo hasta converger.
