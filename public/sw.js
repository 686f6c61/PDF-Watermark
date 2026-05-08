// Service Worker minimo para PDF Watermark.
// Estrategia:
// - Precache del shell de la app (HTML, JS, CSS, iconos) en install.
// - Cache-first para assets con hash en el nombre (inmutables).
// - Network-first para HTML (para que la app se actualice al desplegar).
// - Soporte offline: si no hay red, sirve desde cache.
//
// Privacidad: NO cachea ningun dato de usuario. Solo recursos publicos del
// propio sitio. Los archivos que el usuario procesa NUNCA pasan por aqui:
// se manipulan en memoria del navegador y se descargan al disco directamente.

const CACHE_NAME = "pdf-watermark-v1";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-16.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Solo gestionamos GET del mismo origen. Todo lo demas (Google Analytics,
  // gtag.js, etc.) pasa directo a la red, sin cachearlo.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Assets con hash en el nombre (Astro): cache-first, son inmutables.
  if (url.pathname.startsWith("/_astro/") || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // HTML y todo lo demas: network-first con fallback a cache (para offline).
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
