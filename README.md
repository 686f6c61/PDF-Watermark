# PDF Watermark

Marcas de agua para PDFs e imágenes, sin perder la privacidad.

---

## Por qué esta herramienta

La mayoría de servicios web que añaden marcas de agua suben tus archivos a un servidor externo. PDF Watermark funciona de forma diferente: **todo el procesamiento ocurre en tu navegador**, sin servidores, sin subidas, sin telemetría. Tus documentos nunca salen de tu dispositivo.

Esto la hace especialmente útil para documentación sensible: DNIs, contratos, facturas, certificados médicos, nóminas o cualquier archivo que no quieras que pase por manos de terceros.

---

## Características

- **Cuatro patrones de distribución:** diagonal en rejilla, único centrado (arrastrable con el ratón en el preview), esquina inferior derecha y espiral de Arquímedes.
- **Tres modos de marca:** texto personalizable, **imagen** (PNG/WebP con transparencia) o **lote** (hasta 50 destinatarios distintos en una sola operación).
- **Modo lote para trazabilidad:** subes un PDF y un fichero `.txt`/`.csv` con nombres; la app genera un PDF por destinatario con su nombre como marca. Útil para auditar filtraciones: el nombre identifica el origen.
- **Plantilla descargable** del fichero de nombres con una sola pulsación (`plantilla-marcas.txt`).
- **Internacionalización ES + EN** con detección automática del idioma del navegador y selector manual en el header.
- **Aplicación web instalable (PWA) y funcional sin conexión:** manifiesto e iconos para instalación en escritorio y móvil. El service worker precachea iconos, manifiesto y el worker de pdf.js, y guarda en runtime los assets hasheados de cada build (HTML network-first, assets cache-first), así que tras la primera carga la aplicación completa funciona offline; todo el procesamiento es siempre local.
- **Formatos de entrada:** PDF, PNG, JPG/JPEG y WebP.
- **Procesamiento por lotes:** hasta 50 archivos en una sola operación con configuración común.
- **Selección de páginas en PDF:** elige qué páginas reciben la marca y deja el resto intactas.
- **Vista previa en vivo:** divisor arrastrable que muestra el original a la izquierda y el resultado a la derecha. Se actualiza en menos de 250 ms tras cada ajuste.
- **Descarga inteligente:** un solo archivo se descarga directamente; varios o lotes personalizados se empaquetan en un ZIP fechado con `manifest.json` cuando aplica.
- **Persistencia controlada:** texto, color y patrón se guardan en `localStorage` del navegador y se pueden borrar desde la interfaz; los nombres del modo lote NO se persisten nunca (caso de uso sensible).
- **Accesibilidad completa:** navegación por teclado, etiquetas ARIA, contraste AA, anuncios `aria-live` en el progreso del lote.
- **Sin instalación:** funciona directamente en el navegador; no requiere extensiones ni plugins.

---

## Aspecto de la interfaz

La interfaz sigue un estilo neobrutalista con paleta pastel: bordes negros sólidos, sombras duras sin desenfoque y tipografía Space Grotesk en peso 600 y 800. Fondo crema (`#FFF8E7`), acentos en lima (`#C6F5A6`), lavanda (`#C5B4FF`) y melocotón (`#FFCDA8`).

La pantalla principal tiene tres zonas verticales:

- **Lista lateral (izquierda):** miniaturas de los archivos cargados, estado de cada uno y botón para añadir más.
- **Vista previa (centro):** divisor antes/después con controles de paginación para PDFs.
- **Panel de controles (derecha):** todos los ajustes del watermark.

Una barra inferior fija muestra el recuento de archivos y el botón «Aplicar y descargar».

---

## Inicio rápido

### Requisitos previos

- Node.js 20.3 o superior (mínimo que admite Astro 6; se recomienda Node 22, que es el que usa CI).
- npm 10 o superior.

### Instalación

```bash
git clone https://github.com/686f6c61/PDF-Watermark.git pdf-watermark
cd pdf-watermark
npm install
```

### Modo desarrollo

```bash
npm run dev
```

Abre `http://localhost:4321` en el navegador.

### Build de producción

```bash
npm run build
```

Los ficheros estáticos se generan en `dist/`. Puedes previsualizar el resultado antes de desplegar:

```bash
npm run preview
```

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework estático | Astro 6 (`output: "static"`) con i18n nativo (`/`, `/en/`) |
| Isla interactiva | Svelte 5 con runas (`$state`, `$derived`, `$effect`) |
| Estilos | Tailwind CSS 4 |
| Procesamiento de imágenes | Canvas API (`OffscreenCanvas` cuando está disponible) |
| Procesamiento de PDFs | pdf-lib 1.17.1 (escritura) + pdfjs-dist 5.x (renderizado de previews) |
| Empaquetado de resultados | JSZip 3.x + file-saver 2.x |
| PWA | Web App Manifest + Service Worker con offline real: precache de iconos/manifiesto/worker de pdf.js y cacheo en runtime de los assets hasheados (HTML network-first, assets cache-first) |
| Tests unitarios | Vitest 3.x |
| Tests end-to-end | Playwright 1.x (no se ejecutan en CI; ver sección «Tests E2E manualmente») |

Bundle de JavaScript inicial: menos de 200 KB. `pdfjs-dist` y `pdf-lib` se cargan bajo demanda solo cuando el usuario sube su primer PDF.

---

## Estructura del proyecto

```
pdf-watermark/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Página principal (ES): isla editor + footer
│   │   ├── privacidad.astro     # Política de privacidad ES (RGPD art. 13)
│   │   └── en/
│   │       ├── index.astro      # Página principal (EN)
│   │       └── privacy.astro    # Política de privacidad EN
│   ├── layouts/
│   │   ├── BaseLayout.astro     # Layout compartido: <head> SEO, scripts y estilos comunes
│   │   ├── SiteHeader.astro     # Cabecera: marca, badge de privacidad y selector de idioma
│   │   └── SiteFooter.astro     # Pie: privacidad, cookies, GitHub y X
│   ├── components/
│   │   ├── Editor.svelte        # Isla principal: orquesta todos los componentes
│   │   ├── FileDropzone.svelte  # Zona de arrastre y selección de archivos
│   │   ├── FileList.svelte      # Lista lateral de archivos con estado
│   │   ├── WatermarkControls.svelte  # Panel de ajustes del watermark (texto/imagen/lote)
│   │   ├── PreviewSlider.svelte # Divisor arrastrable antes/después
│   │   ├── PageSelector.svelte  # Chips de selección de páginas para PDFs
│   │   ├── ProgressBar.svelte   # Barra de progreso del procesamiento por lotes
│   │   ├── PrivacyBadge.svelte  # Mensaje permanente de procesamiento local
│   │   ├── PrivacyContent.svelte # Contenido de la política de privacidad
│   │   ├── HowItWorks.svelte    # Sección «Cómo funciona» con diagrama del flujo local
│   │   ├── CookieBanner.svelte  # Banner de cookies con Consent Mode v2
│   │   └── LanguageSwitcher.svelte # Selector de idioma ES/EN
│   ├── i18n/
│   │   ├── es.json / en.json    # Cadenas localizadas
│   │   └── t.ts                 # Helper mínimo de traducción por clave
│   ├── lib/
│   │   ├── watermark/
│   │   │   ├── types.ts         # Tipos compartidos: WatermarkConfig, FileItem…
│   │   │   ├── patterns.ts      # Cálculo de posiciones por patrón (función pura)
│   │   │   ├── image.ts         # Motor de watermark para imágenes (Canvas API)
│   │   │   ├── pdf.ts           # Motor de watermark para PDFs (pdf-lib)
│   │   │   ├── image-watermark.ts # Helpers puros para marcas de agua de tipo imagen
│   │   │   └── preview-decision.ts # Decide si la vista previa renderiza marca u original
│   │   ├── state/
│   │   │   ├── editor.svelte.ts # Store reactivo global (EditorStore)
│   │   │   └── validation.ts    # Validación de WatermarkConfig
│   │   ├── ui/
│   │   │   └── pointer-drag.ts  # Drag con pointer events sin fugas de listeners
│   │   ├── batch.ts             # Modo lote: parseo, slugify y deduplicación de nombres
│   │   ├── batch-template.ts    # Plantilla TXT del lote generada en cliente
│   │   ├── analytics.ts         # Wrapper de GA4 (Consent Mode v2 + carga condicional)
│   │   ├── zip.ts               # Empaquetado ZIP y descarga de resultados
│   │   └── storage.ts           # Persistencia opcional en localStorage
│   └── styles/
│       └── global.css           # Tokens del tema neobrutalista
├── public/
│   ├── js/                      # Scripts estáticos referenciados desde el HTML
│   │   ├── gtag-init.js         # Consent Mode v2 + carga condicional de gtag.js (defer)
│   │   ├── lang-redirect.js     # Redirect / → /en/ en primera visita (bloqueante)
│   │   ├── lang-pref.js         # Guarda la preferencia de idioma según la ruta
│   │   └── sw-register.js       # Registro del service worker (defer)
│   ├── _headers                 # Cabeceras HTTP de seguridad (Cloudflare Pages)
│   ├── pdf.worker.min.mjs       # Worker de pdfjs-dist servido desde el propio origen
│   ├── sw.js                    # Service worker (offline: precache + cacheo en runtime)
│   ├── manifest.webmanifest     # Manifiesto PWA
│   └── *.png / favicon.ico      # Iconos, favicons y og-image
├── tests/
│   ├── unit/                    # Tests unitarios con Vitest
│   └── e2e/                     # Specs de Playwright + fixtures (manual, no en CI)
├── nginx.conf                   # Despliegue self-hosted (junto a Dockerfile)
├── netlify.toml                 # Build y cabeceras para Netlify
├── vercel.json                  # Cabeceras y URLs limpias para Vercel
├── Dockerfile
├── CHANGELOG.md
├── SECURITY.md
└── package.json
```

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm run build` | Build de producción en `dist/` (genera 4 páginas: ES + EN) e inyecta en `dist/sw.js` la lista de assets a precachear para el offline |
| `npm run preview` | Previsualización del build antes de desplegar |
| `npm test` | Ejecuta los 278 tests unitarios con Vitest |
| `npm run test:watch` | Tests unitarios en modo observador |
| `npm run test:e2e` | Tests end-to-end con Playwright (manual, no en CI) |
| `npm run typecheck` | Comprobación de tipos con `astro check` |

### Tests E2E manualmente

Los tests end-to-end con Playwright no se ejecutan en CI por inestabilidad del runner gestionado (cambios de imágenes Ubuntu, navigator.language, etc.). Para correrlos en local antes de un release:

```bash
npx playwright install chromium --with-deps
npm run build && npm run test:e2e
```

---

## Despliegue

El sitio se despliega como HTML estático en cualquier CDN o servidor web. El repositorio incluye la configuración lista para cuatro alternativas equivalentes:

- **Cloudflare Pages:** cabeceras en `public/_headers`.
- **Netlify:** build y cabeceras en `netlify.toml`.
- **Vercel:** cabeceras y URLs limpias en `vercel.json`.
- **Self-hosted con Nginx:** `Dockerfile` + `nginx.conf`.

Las cabeceras de seguridad son idénticas en las cuatro plataformas; `tests/unit/security-headers.test.ts` lo verifica en CI para evitar deriva entre ellas.

---

## Privacidad y seguridad

Este proyecto aplica un modelo de privacidad estructural, no una promesa de política:

- Sin backend, sin endpoints, sin subidas de archivos.
- Google Analytics 4 solo se carga si el usuario acepta el banner de cookies: el script de `googletagmanager.com` se inyecta dinámicamente tras el consentimiento (Consent Mode v2, todo denegado por defecto; al aceptar se concede únicamente `analytics_storage` —solo medición de visitas—). Sin consentimiento, cero peticiones de terceros: ni script, ni ping, ni cookie.
- `Content-Security-Policy` estricta con `default-src 'self'`: `script-src` sin `unsafe-inline` (los dos únicos scripts inline, que Astro inyecta siempre para hidratar las islas, se autorizan por hash SHA-256); `style-src` sí permite `'unsafe-inline'` por los estilos que generan los componentes.
- El worker de pdfjs-dist se sirve desde el propio origen, sin CDNs externos.
- `localStorage` solo guarda la configuración del watermark (texto, números y colores), nunca los archivos.

Para más detalles, consulta [`SECURITY.md`](SECURITY.md) y la [política de privacidad](/privacidad) publicada en la propia aplicación.

---

## Licencia

MIT. Consulta el fichero [`LICENSE`](LICENSE) para el texto completo.

---

## Contribuir

Las contribuciones son bienvenidas: abre un issue o un pull request en GitHub. Antes de enviar, ejecuta `npm run typecheck` y `npm test`, y sigue las convenciones del código existente (componentes Svelte 5 con runas, textos localizados en `src/i18n/`, versiones exactas en `package.json`). Para reportar fallos de seguridad, usa los canales privados descritos en [`SECURITY.md`](SECURITY.md).
