// Service Worker minimo y conservador para PDF Watermark.
//
// Estrategia (revisada en v2 tras un incidente con MIME types cacheados):
// - SOLO cachea iconos, manifest y favicon (recursos pequeños y estables).
// - NO cachea HTML, JS, modulos .mjs, CSS ni assets de Astro. Esos pasan
//   directo a la red. Asi evitamos servir versiones obsoletas tras deploy
//   y cualquier respuesta con MIME incorrecto cacheada accidentalmente.
// - Si la red falla en una solicitud no cacheada, NO devolvemos nada
//   (deja que el navegador maneje el error). El "modo offline" cubre solo
//   los recursos pequeños precacheados; si quieres usar el procesador
//   sin red, abre la pagina con red al menos una vez y manten la pestaña.
//
// Privacidad: NO cachea ningun dato de usuario. Los archivos que el usuario
// procesa nunca pasan por el SW: se manipulan en memoria del navegador y
// se descargan al disco directamente.

const CACHE_NAME = "pdf-watermark-v2";

// Solo precachemos recursos pequeños inmutables. Si en el futuro cambian,
// se cambia CACHE_NAME para forzar invalidacion en navegadores existentes.
const PRECACHE_URLS = [
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
      // Borra TODOS los caches que no sean el actual. Esto incluye caches de
      // versiones anteriores del SW que pudieran haber guardado respuestas
      // con MIME incorrecto (incidente .mjs servido como octet-stream).
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Whitelist explicita: solo respondemos desde cache para el set pequeño
  // de recursos precacheados. Todo lo demas (HTML, JS, .mjs, CSS, assets de
  // Astro, dynamic imports) pasa directo a la red sin tocar el SW.
  const isCacheable = PRECACHE_URLS.includes(url.pathname);
  if (!isCacheable) return;

  // Para los cacheables: cache-first con actualizacion en background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkUpdate = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => null);
      return cached || networkUpdate;
    })
  );
});
