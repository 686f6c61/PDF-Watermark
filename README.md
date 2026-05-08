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
- **Aplicación web instalable (PWA):** manifiesto, icono y service worker para funcionamiento offline tras la primera carga.
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

- Node.js 22 o superior (Astro 6 lo exige).
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
| PWA | Web App Manifest + Service Worker (cache-first para assets, network-first para HTML) |
| Tests unitarios | Vitest 3.x |
| Tests end-to-end | Playwright 1.x (no se ejecutan en CI; ver sección «Tests E2E manualmente») |

Bundle de JavaScript inicial: menos de 200 KB. `pdfjs-dist` y `pdf-lib` se cargan bajo demanda solo cuando el usuario sube su primer PDF.

---

## Estructura del proyecto

```
pdf-watermark/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Página principal: hero, isla editor, footer
│   │   └── privacidad.astro     # Política de privacidad (RGPD art. 13)
│   ├── components/
│   │   ├── Editor.svelte        # Isla principal: orquesta todos los componentes
│   │   ├── FileDropzone.svelte  # Zona de arrastre y selección de archivos
│   │   ├── FileList.svelte      # Lista lateral de archivos con estado
│   │   ├── WatermarkControls.svelte  # Panel de ajustes del watermark
│   │   ├── PreviewSlider.svelte # Divisor arrastrable antes/después
│   │   ├── PageSelector.svelte  # Chips de selección de páginas para PDFs
│   │   ├── ProgressBar.svelte   # Barra de progreso del procesamiento por lotes
│   │   └── PrivacyBadge.svelte  # Mensaje permanente de procesamiento local
│   ├── lib/
│   │   ├── watermark/
│   │   │   ├── types.ts         # Tipos compartidos: WatermarkConfig, FileItem…
│   │   │   ├── patterns.ts      # Cálculo de posiciones por patrón (función pura)
│   │   │   ├── image.ts         # Motor de watermark para imágenes (Canvas API)
│   │   │   └── pdf.ts           # Motor de watermark para PDFs (pdf-lib)
│   │   ├── state/
│   │   │   ├── editor.svelte.ts # Store reactivo global (EditorStore)
│   │   │   └── validation.ts    # Validación de WatermarkConfig
│   │   ├── zip.ts               # Empaquetado ZIP y descarga de resultados
│   │   └── storage.ts           # Persistencia opcional en localStorage
│   └── styles/
│       └── global.css           # Tokens del tema neobrutalista
├── public/
│   ├── _headers                 # Cabeceras HTTP de seguridad (Cloudflare Pages)
│   ├── pdf.worker.min.mjs       # Worker de pdfjs-dist servido desde el propio origen
│   └── favicon.svg
├── tests/
│   ├── unit/
│   │   ├── patterns.test.ts     # Tests de los cuatro patrones de posicionamiento
│   │   └── config-validation.test.ts  # Tests de validación de WatermarkConfig
│   └── e2e/
│       ├── image-flow.spec.ts   # Flujo completo con imágenes
│       ├── pdf-flow.spec.ts     # Flujo completo con PDFs multipágina
│       └── batch-flow.spec.ts   # Procesamiento por lotes y descarga ZIP
├── docs/                        # Documentación del proyecto
├── CHANGELOG.md
├── SECURITY.md
└── package.json
```

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm run build` | Build de producción en `dist/` (genera 4 páginas: ES + EN) |
| `npm run preview` | Previsualización del build antes de desplegar |
| `npm test` | Ejecuta los 161 tests unitarios con Vitest |
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

El sitio se despliega como HTML estático en cualquier CDN o servidor web. La opción recomendada es Cloudflare Pages.

Consulta la guía detallada en [`docs/deployment.md`](docs/deployment.md), que incluye instrucciones paso a paso para Cloudflare Pages, Netlify, Vercel y despliegue self-hosted con Nginx.

---

## Privacidad y seguridad

Este proyecto aplica un modelo de privacidad estructural, no una promesa de política:

- Sin backend, sin endpoints, sin subidas de archivos.
- Google Analytics 4 solo se carga si el usuario acepta el banner de cookies (Consent Mode v2, default denied). Sin consentimiento, cero peticiones de terceros.
- `Content-Security-Policy` estricta con `default-src 'self'`, sin `unsafe-inline` ni `unsafe-eval`.
- El worker de pdfjs-dist se sirve desde el propio origen, sin CDNs externos.
- `localStorage` solo guarda la configuración del watermark (texto, números y colores), nunca los archivos.

Para más detalles, consulta [`SECURITY.md`](SECURITY.md) y la [política de privacidad](/privacidad) publicada en la propia aplicación.

---

## Licencia

MIT. Consulta el fichero [`LICENSE`](LICENSE) para el texto completo.

---

## Contribuir

Si quieres proponer mejoras, corregir errores o añadir funcionalidades, consulta [`docs/contributing.md`](docs/contributing.md) para conocer la estructura del proyecto, cómo ejecutar los tests y las convenciones de código que sigue el equipo.
