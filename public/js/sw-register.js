// Registro del Service Worker (PWA instalable + offline). Se carga con
// `defer`, asi que el listener de `load` se instala siempre antes de que
// dispare el evento.
//
// Se registra en produccion (https) y tambien en localhost, donde Chrome
// permite service workers por ser contexto seguro: asi el offline se puede
// probar en local. En desarrollo no ensucia: sw.js solo cachea assets
// hasheados de /_astro/ y ficheros estaticos de /js/, nunca los modulos
// /src/ de Vite, y el HTML va network-first (ver public/sw.js).
const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
if ("serviceWorker" in navigator && (location.protocol === "https:" || isLocalhost)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service Worker no registrado:", err);
    });
  });
}
