// Redireccion automatica a /en/ en primera visita si el navegador es ingles.
// Script clasico SIN async/defer referenciado desde el <head>: bloquea el
// parser (igual que el inline original) para que no haya flash de contenido
// en castellano antes de redirigir.
(function () {
  try {
    var STORAGE_KEY = "pdf-watermark-lang-pref";
    var pref = localStorage.getItem(STORAGE_KEY);
    if (pref) return; // El usuario ya eligio: respetamos su decision.
    var primary = (navigator.language || "").toLowerCase().split("-")[0];
    if (primary === "en") {
      localStorage.setItem(STORAGE_KEY, "auto-en");
      window.location.replace("/en/");
    }
  } catch (err) {
    // localStorage o navigator.language inaccesibles: no hacemos nada.
  }
})();
