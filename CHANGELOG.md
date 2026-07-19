# Changelog

Todos los cambios notables de este proyecto se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
El versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

## [1.3.0] - 2026-07-18

### Added

- Layout compartido `src/layouts/BaseLayout.astro` (con `SiteHeader.astro` y `SiteFooter.astro`) usado por las cuatro páginas (ES/EN × index/privacidad): elimina la duplicación de header, footer, `<head>` SEO y estilos, y con ella la deriva entre idiomas. El enlace a X/Twitter, el header sticky y el guardado de la preferencia de idioma son ahora consistentes en las cuatro páginas.
- Scripts estáticos en `public/js/` (`gtag-init.js`, `lang-redirect.js`, `lang-pref.js`, `sw-register.js`) que sustituyen a los snippets inline de las páginas.
- Test `tests/unit/security-headers.test.ts` que verifica en CI que la CSP es idéntica en las cuatro plataformas (nginx, Netlify, Vercel y Cloudflare Pages), que ninguna envía `Cross-Origin-Embedder-Policy` y que los hashes SHA-256 de los scripts de hidratación de Astro siguen vigentes.
- Configuración de Dependabot (`.github/dependabot.yml`): actualizaciones semanales de npm (grupos `astro-svelte` y `testing`), GitHub Actions y Docker.
- Variables dinámicas en el texto de la marca: `{fecha}`, `{nombre}`, `{pagina}` y `{total}`, con indicación visible junto al campo de texto.
- Modo de tamaño «Proporcional al lienzo»: la marca escala con el ancho de cada página o imagen en lugar de usar siempre un tamaño fijo en píxeles.
- Tamaño de la marca de imagen como porcentaje del lienzo (`imageScale`, 5-100 %): en modo imagen el deslizador manda sobre el mayor tamaño que cabe bajo el techo del patrón conservando la proporción del logo, así que el control responde de forma monótona en todo su rango — con `fontSize` el tope de lienzo colapsaba la mayor parte del recorrido al mismo tamaño, sobre todo con logos apaisados en mosaico. El deslizador en píxeles y el conmutador «Proporcional al lienzo» se reservan a texto y lote, donde siguen igual.
- Texto de marca multilínea (hasta 3 líneas).
- Presets de configuración: guardar, aplicar y borrar combinaciones habituales, persistidos en el navegador.
- Rangos de páginas en el selector (`1, 3-5, 8-`), junto a los atajos «Todas»/«Ninguna».
- Rejilla de posición 3×3 para colocar la marca en las nueve posiciones habituales sin arrastrar.
- Inputs numéricos junto a los deslizadores y botones de restablecer (rotación a 0°, posición al centro, configuración completa); los controles solo se muestran cuando aplican al patrón o modo elegido.
- Funcionamiento offline real (service worker v3): precache de iconos, manifiesto, worker de pdf.js, las cuatro rutas HTML y todos los assets hasheados del build (inyectados en `dist/sw.js` por `scripts/inject-precache.mjs` al final de `npm run build`, necesario porque las islas de Astro se declaran como `component-url` y no son descubribles parseando el HTML); HTML network-first con caída a caché y assets en cache-first con guardado en runtime. Las respuestas se guardan sin la cabecera `Vary` (los servidores que envían `Vary: Origin` rompían el match de la Cache API para los módulos JS, que sí envían `Origin`). Tras la primera carga, la aplicación completa funciona sin conexión —también en `localhost`, donde el SW se registra para poder probarlo—, como promete la landing. Un guard exige `Content-Type` JavaScript en los scripts cacheados para evitar la repetición del incidente histórico de MIME types.
- Copy de la landing y de la descripción SEO que nombra explícitamente las marcas de «texto o imagen» (ES/EN).
- Versión visible en el footer (`v{versión} · Changelog`, leída de `package.json` en build) que abre un popup con el historial de cambios: el contenido es el propio `CHANGELOG.md` compilado por Astro, así que nunca se desincroniza. Implementado con `<dialog>` nativo (Esc cierra, foco atrapado) con cierre por botón y por clic en el backdrop, estilos acordes al diseño y textos en ES/EN.
- Imagen Open Graph renovada y por idioma: `scripts/generate-og.mjs` (script npm `generate:og`) renderiza la plantilla con los tokens de marca en un navegador headless y genera `public/og-image.png` (ES) y `public/og-image-en.png` (EN, nueva) a 1200×630; cada página enlaza la de su idioma en `og:image` y `twitter:image`. Metadatos de compartir completados: `twitter:site`/`twitter:creator` (`@686f6c61`), `og:image:type` y `og:image:alt`/`twitter:image:alt` en las cuatro páginas (antes solo en los index), `site` declarado en `astro.config.mjs` y `lastmod` del sitemap al día.

### Changed

- Reglas de `Cache-Control` para HTML corregidas en Netlify, Vercel y Cloudflare Pages: los patrones `/*.html` estaban muertos porque las URLs reales son limpias; ahora se aplica `Cache-Control: no-cache` explícitamente a `/`, `/privacidad/`, `/en/` y `/en/privacy/`.
- `vercel.json` deja de enviar `Cross-Origin-Embedder-Policy: require-corp`, alineado con el resto de plataformas (retirada deliberada documentada en `nginx.conf`).
- Google Analytics pasa a carga condicional real: `gtag-init.js` (Consent Mode v2, todo denegado por defecto) ya no descarga el script de googletagmanager.com al entrar; solo lo inyecta tras el «Aceptar» del banner —o si ya se aceptó en una visita anterior— concediendo únicamente `analytics_storage`. Sin consentimiento no hay ninguna petición a terceros: ni script, ni pings, ni cookies. La sección 5 de la política de privacidad se reescribe en ES/EN para describir este modelo.
- README corregido para reflejar el estado real del proyecto: estructura de `src/` y `public/`, requisito de Node 20.3+ y formulación exacta de la CSP.

### Fixed

- Sección de promesas de la landing: ampliada a seis tarjetas (nuevas «Tus archivos, solo en memoria» y «Código abierto», ES/EN) con rejilla 3×2 (antes 3+1 con una tarjeta huérfana), texto alineado al inicio (heredaba `text-align: center` de la sección hero, lo que descompensaba las tarjetas con más texto), cabecera de tarjeta con badge y título en fila centrada y cuerpo a todo el ancho (ritmo visual uniforme aunque un título ocupe dos líneas), segunda promesa reestructurada con título corto (mismo texto, repartido entre título y cuerpo) y dos colores de acento nuevos (`--accent-sky`, `--accent-yellow`).
- Marcas de imagen: tamaño máximo limitado (60 % de la dimensión de página en marca única, 25 % en mosaico), espaciado calculado a partir del tamaño real de la imagen en lugar de una constante, patrón de esquina con margen interior y hueco equivalente a una marca entre logos en el mosaico para que nunca se solapen.
- Selector de páginas movido a la columna izquierda, bajo la lista de archivos (ancho fijo de 320 px en escritorio, 100 % en móvil): antes iba encima de la vista previa y la desplazaba hacia abajo al aparecer; la preview mantiene ahora siempre su posición.
- Panel de configuración sin desbordes: el selector de imagen de marca ya no se sale de la columna — el input de archivo nativo (botón + «Ningún archivo seleccionado») se sustituye por un botón brutalista y el nombre de fichero truncado con elipsis, manteniendo el input oculto pero accesible — y la fila de presets deja de sobresalir 35 px (Blink aplica `min-inline-size: min-content` a `fieldset` en su hoja de estilos interna y el input de nombre, con ancho intrínseco por `size=20`, impedía encoger; se anula con `min-width: 0` en la cadena fieldset → fila → input).

### Security

- CSP endurecida: `script-src` sin `'unsafe-inline'` en las cuatro plataformas. Los dos únicos scripts inline que quedan (los que Astro inyecta siempre para hidratar las islas) se autorizan por hash SHA-256. Eliminada además la directiva obsoleta `block-all-mixed-content`, redundante con `upgrade-insecure-requests`.
- Actualizaciones de dependencias con advisories: astro 6.3.1 → 6.4.8 (3 high), svelte 5.55.5 → 5.56.6 (moderados de XSS/ReDoS), vitest 3.2.4 → 3.2.7 (critical) y transitivas vía `npm audit fix` (devalue, undici, vite, js-yaml, yaml). Quedan 3 vulnerabilidades low en esbuild 0.27.x cuyo fix exige astro 7 (breaking); se retomará con la migración a Astro 7.

---

## [1.2.0] - 2026-05-08

### Added

- Modo «Lote» en los controles de marca de agua: tercera pestaña junto a «Texto» e «Imagen» para generar un PDF/imagen por destinatario en una única operación.
- Textarea con contador `N/50` para introducir hasta 50 nombres (uno por línea), con soporte de comentarios (`#`) y filtrado de líneas vacías.
- Carga de nombres desde fichero `.txt` o `.csv` y descarga de plantilla TXT generada en cliente (`plantilla-marcas.txt` / `watermark-template.txt`) sin servir ningún asset estático adicional.
- Selector «Vista previa para» que cambia el nombre mostrado en la vista en vivo sin reprocesar todo el lote.
- Generación de un único ZIP `marcas-personalizadas-YYYY-MM-DD.zip` con una subcarpeta por destinatario (slug ASCII estable) y un `manifest.json` en la raíz que lista nombre, carpeta y archivos generados.
- Validaciones del lote (mínimo 1 nombre, máximo 50, longitud por nombre, deduplicación case-insensitive) con mensajes accesibles vía `aria-live`.
- 34 tests nuevos (`batch.test.ts`, `batch-template.test.ts`, `editor-batch.test.ts`) que cubren parseo, slugify, deduplicación, generación del ZIP y privacidad del estado.

### Changed

- El botón inferior «Aplicar y descargar» cambia su texto a «Generar lote (N×M archivos)» y su acción a `runWatermarkBatchPersonalized` cuando el modo lote está activo.
- `WatermarkControls.svelte` admite tres modos mutuamente excluyentes; el toggle imagen ↔ texto gana un tercer estado «Lote».

### Security

- El estado del lote (nombres y raw text) se mantiene exclusivamente en memoria del navegador. No se persiste en `localStorage`, `sessionStorage` ni cookies. Al recargar la página los nombres desaparecen, alineado con la naturaleza potencialmente sensible de los datos (empleados, clientes, destinatarios de un documento confidencial).

---

## [1.0.0] - 2026-05-08

### Added

- Banner de cookies con Consent Mode v2 (default denied) y persistencia en localStorage.
- Carga condicional de Google Analytics 4 solo tras consentimiento explícito del usuario.
- Botón «Configurar cookies» en el footer para revocar o cambiar el consentimiento en cualquier momento.
- Sección «Cómo funciona» con SVG explicativo del flujo client-side en la página principal.
- Política de privacidad ampliada con 13 secciones (RGPD art. 13), incluyendo base legal, plazos de conservación, transferencias internacionales y autoridad de control (AEPD).
- SVG explicativo del flujo de datos en la página de privacidad (dos flujos separados: archivo local y analítica opcional).
- Icono de GitHub en el footer de ambas páginas con enlace al repositorio público.
- Página de privacidad detallada accesible en `/privacidad`.

### Changed

- Copy de hero, footer y mensajes ajustado a las normas RAE (acentos diacríticos, eliminación de latinismos, ortografía actualizada).
- Diagrama de HowItWorks rediseñado para evitar solapamientos de texto en distintas resoluciones.
- Patrón diagonal del watermark recalibrado para considerar el ancho real del texto y no solo el número de caracteres.
- Patrón espiral con `maxStep` para que arranque correctamente desde el centro sin saltar al exterior.
- Render del texto con espacio implícito al final para evitar marcas pegadas entre sí.
- PageSelector separado en dos botones independientes: navegación entre páginas y toggle de marcado, eliminando ambigüedad de interacción.
- Preview respeta `selectedPages` y avisa si la página visible no se va a marcar.
- PreviewSlider muestra la página correcta en PDFs multipágina (corregido bug `getPage(1)` hardcodeado).
- PDFs cifrados se rechazan con mensaje claro en lugar de procesarse silenciosamente con resultado incorrecto.

### Fixed

- Offset vertical en el motor PDF: se usa cap-height en lugar de altura total del glifo, corrigiendo el posicionamiento de las marcas.
- Fugas de event listeners en PreviewSlider durante drag activo al desmontar el componente.
- `aria-valuemin` faltante en ProgressBar que invalidaba el rol `progressbar`.
- `<legend>` semánticamente correcto en grupos de controles en lugar de `<span class="legend">`.

### Security

- CSP relajada con precisión solo para `googletagmanager.com` y `google-analytics.com`, sin añadir `unsafe-inline` ni `unsafe-eval`.
- Banner de cookies cumple RGPD (consentimiento previo, revocable) y directrices AEPD (botones aceptar/rechazar visibles y opción de revocar desde el footer).

---

## [0.1.0] - 2026-05-06

Primera versión pública. Implementación completa de la spec aprobada en
`docs/plans/2026-05-06-pdf-image-watermark-design.md`.

### Added

- Carga de archivos por arrastre y soltar o selector del sistema. Acepta PDF, PNG, JPG, JPEG y WebP.
- Procesamiento por lotes: hasta 50 archivos con una única configuración de watermark.
- Cuatro patrones de distribución de la marca de agua: diagonal en rejilla, único centrado, esquina inferior derecha y espiral de Arquímedes.
- Selección de páginas en PDFs: chips numerados para elegir qué páginas reciben la marca; el resto se mantiene intacto.
- Vista previa en vivo con divisor arrastrable antes/después. Debounce de 150 ms para no saturar el hilo principal.
- Motor de imágenes basado en `OffscreenCanvas` con fallback a `HTMLCanvasElement` en navegadores sin soporte.
- Motor de PDFs basado en pdf-lib con fuentes embebidas (Helvetica, Times Roman, Courier).
- Ajustes del watermark: texto (máx. 60 caracteres), tipografía (sans/serif/mono), tamaño (12-120 px), color con presets y selector libre, opacidad (5-100 %), rotación (-180 a 180°) y densidad (1-10).
- Descarga individual directa cuando el lote tiene un solo archivo; descarga en ZIP (`watermarked-YYYY-MM-DD.zip`) cuando hay más de uno.
- Persistencia opcional de la última configuración en `localStorage`; borrable desde la propia interfaz.
- Carga progresiva de dependencias pesadas: `pdfjs-dist` y `pdf-lib` se cargan bajo demanda al subir el primer PDF; `JSZip` se carga al pulsar «Aplicar y descargar» con más de un archivo.
- Barra de progreso accesible (`role="progressbar"`, `aria-live`) durante el procesamiento del lote.
- Página de política de privacidad (`/privacidad`) conforme al artículo 13 del RGPD.
- 66 tests en verde: unitarios con Vitest (patrones, validación de configuración, persistencia) y end-to-end con Playwright (flujo de imagen, flujo de PDF multipágina, lote mixto con ZIP).

### Security

- `Content-Security-Policy` estricta: `default-src 'self'`, sin `unsafe-inline` ni `unsafe-eval`, con `worker-src 'self' blob:`.
- `X-Frame-Options: DENY` para impedir embebido en iframes.
- `Permissions-Policy` que deshabilita cámara, micrófono, geolocalización y sensores de movimiento.
- `Strict-Transport-Security` con `max-age=63072000; includeSubDomains; preload`.
- `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`.
- Worker de pdfjs-dist servido desde el propio origen; sin CDNs externos.
- Cero peticiones de red salientes con datos del usuario (verificado en auditoría de fase 4).
- SBOM CycloneDX 1.5 generado en `docs/security/sbom.cdx.json`.
- Política de divulgación de vulnerabilidades publicada en `SECURITY.md`.
- Auditoría OWASP Top 10 completada: sin hallazgos de severidad alta ni crítica.
