// Service Worker de PDF Watermark — soporte offline real (v3).
//
// La landing promete "una vez cargada la pagina, puedes desconectar
// Internet". Esta version lo hace cierto:
//
// - PRECache: iconos, manifest, worker de pdf.js, las 4 rutas HTML y TODOS
//   los assets hasheados del build (/_astro/*), inyectados por
//   scripts/inject-precache.mjs tras `astro build`. Asi el offline funciona
//   desde la primera visita: las islas de Astro se declaran como
//   `component-url` en <astro-island> y no se pueden descubrir parseando
//   solo src/href del HTML.
// - NAVEGACIONES (HTML): network-first. Con red siempre se sirve la version
//   fresca y se guarda una copia; sin red se sirve la copia cacheada de esa
//   pagina (o la de la home como ultimo recurso).
// - ASSETS same-origin de rutas estaticas (/_astro/ hasheado, /js/ y el
//   precache): cache-first con guardado en runtime. Los assets de Astro van
//   hasheados por build, asi que una respuesta cacheada nunca queda
//   obsoleta: un deploy nuevo genera URLs nuevas que se piden a la red.
//   Cualquier otra ruta (modulos /src/ de Vite en desarrollo, etc.) pasa
//   directa a la red sin tocar la cache.
// - ACTIVATE: calienta la cache con la pagina abierta y sus assets
//   (/_astro/ y /js/). Cubre el hueco del primer load en desarrollo, donde
//   el precache de build va vacio.
// - Solo se cachean respuestas 200 del mismo origen. Para .js/.mjs se exige
//   ademas Content-Type JavaScript: el incidente historico de v1 fue un
//   .mjs servido con MIME incorrecto y cacheado; este guard lo impide.
// - Toda respuesta se guarda SIN la cabecera `Vary`: algunos servidores
//   (entre ellos `astro preview`) mandan `Vary: Origin` y, como las
//   peticiones de modulos JS llevan `Origin` y las del SW no, el algoritmo
//   de match de la Cache API descartaba las entradas y el offline fallaba
//   solo para los scripts. Se elimina al escribir y se usa ignoreVary al
//   leer (belt and braces; los navegadores que no lo soportan lo ignoran).
// - Terceros (GA/GTM) pasan directo a la red, sin tocar el SW.
//
// Privacidad: NO cachea ningun dato de usuario. Los archivos que el usuario
// procesa nunca pasan por el SW: se manipulan como Blobs en memoria del
// navegador y se descargan al disco directamente.

const CACHE_NAME = "pdf-watermark-v3";

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-16.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  // Worker de pdf.js: pesa ~1 MB pero es imprescindible para la vista
  // previa de PDFs sin conexion. Estable entre builds (cache-bust ?v=N
  // manual; el match con ignoreSearch lo encuentra igual).
  "/pdf.worker.min.mjs",
  // Las 4 paginas estaticas: offline completo desde la primera visita.
  "/",
  "/privacidad/",
  "/en/",
  "/en/privacy/",
];

// Assets hasheados del build (/_astro/*: JS de las islas, CSS, chunks
// compartidos). El script scripts/inject-precache.mjs sustituye el marcador
// por la lista real tras `astro build`. Fuera de build queda vacia: en
// desarrollo los modulos se sirven desde /src/ y no son cacheables.
const BUILD_ASSETS = /*INJECT_BUILD_ASSETS*/ [];

const ALL_PRECACHE_URLS = [...PRECACHE_URLS, ...BUILD_ASSETS];

// Respuesta apta para cache: 200 del mismo origen, y si es un script,
// con MIME JavaScript (guard del incidente .mjs como octet-stream).
function isCacheableResponse(url, response) {
  if (!response.ok) return false;
  if (/\.m?js($|\?)/.test(url)) {
    const type = response.headers.get("content-type") || "";
    return type.includes("javascript");
  }
  return true;
}

// Clon de la respuesta listo para guardar: sin `Vary` (ver cabecera) y con
// el cuerpo consumible una sola vez (blob), valido tanto para put como para
// reconstruir la respuesta al vuelo.
async function toStorableResponse(response) {
  const headers = new Headers(response.headers);
  headers.delete("vary");
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const MATCH_OPTIONS = { ignoreSearch: true, ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll no vale: guardaria las respuestas con su `Vary` original.
      await Promise.all(
        ALL_PRECACHE_URLS.map(async (url) => {
          const response = await fetch(url, { cache: "no-cache" });
          if (!isCacheableResponse(url, response)) {
            throw new Error(`Precache fallo para ${url}: ${response.status}`);
          }
          await cache.put(url, await toStorableResponse(response));
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borra TODOS los caches que no sean el actual (incluye versiones
      // antiguas del SW con otra estrategia o con respuestas con Vary).
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
      await warmUpCurrentPages();
    })()
  );
});

// Calienta la cache con la pagina actualmente abierta y los assets que
// referencia (/_astro/ y /js/). Util sobre todo en desarrollo, donde el
// precache de build va vacio y los assets del primer load se pidieron
// antes de que el SW controlara la pagina.
async function warmUpCurrentPages() {
  const cache = await caches.open(CACHE_NAME);
  const windows = await self.clients.matchAll({ type: "window" });
  for (const client of windows) {
    try {
      const pageUrl = client.url.split("#")[0];
      const response = await fetch(pageUrl);
      if (!response.ok) continue;
      await cache.put(pageUrl, await toStorableResponse(response.clone()));
      const html = await response.text();
      const assetUrls = new Set();
      for (const match of html.matchAll(/(?:src|href)="(\/(?:_astro|js)\/[^"]+)"/g)) {
        assetUrls.add(match[1]);
      }
      await Promise.all(
        [...assetUrls].map(async (assetUrl) => {
          const asset = await fetch(assetUrl);
          if (isCacheableResponse(assetUrl, asset)) {
            await cache.put(assetUrl, await toStorableResponse(asset));
          }
        })
      );
    } catch (err) {
      // Sin red en este momento: se cacheara en la proxima visita online.
    }
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML de navegacion: network-first con caida a cache (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const storable = await toStorableResponse(response.clone());
            caches.open(CACHE_NAME).then((cache) => cache.put(request, storable));
          }
          return response;
        } catch (err) {
          const cached =
            (await caches.match(request, MATCH_OPTIONS)) ||
            (await caches.match("/", MATCH_OPTIONS));
          // Sin copia cacheada no hay nada que servir: error de red nativo.
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Assets estaticos same-origin: cache-first con guardado en runtime.
  // Solo se cachean rutas estaticas estables (/_astro/ hasheado, /js/ y el
  // precache): los modulos de desarrollo de Vite (/src/, /@fs/, /node_modules/)
  // pasan directos a la red para no romper HMR ni servir codigo obsoleto.
  const path = url.pathname;
  const isStaticAsset =
    path.startsWith("/_astro/") ||
    path.startsWith("/js/") ||
    PRECACHE_URLS.includes(path);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request, MATCH_OPTIONS).then((cached) => {
      if (cached) return cached;
      return fetch(request).then(async (response) => {
        if (isCacheableResponse(request.url, response)) {
          const storable = await toStorableResponse(response.clone());
          caches.open(CACHE_NAME).then((cache) => cache.put(request, storable));
        }
        return response;
      });
    })
  );
});
