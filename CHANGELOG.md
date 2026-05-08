# Changelog

Todos los cambios notables de este proyecto se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
El versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

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
