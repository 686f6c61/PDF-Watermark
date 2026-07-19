// Guarda la preferencia de idioma segun la ruta visitada, para que el redirect
// automatico de / (lang-redirect.js) respete la eleccion en proximas visitas.
// Se aplica en las cuatro paginas: las rutas bajo /en/ recuerdan "en" y el
// resto "es". Se carga con `defer`, despues de lang-redirect.js, por lo que en
// una primera visita desde / con navegador ingles la marca "auto-en" queda
// sustituida por la preferencia real de la pagina finalmente servida.
try {
  var lang = window.location.pathname.indexOf("/en/") === 0 ? "en" : "es";
  localStorage.setItem("pdf-watermark-lang-pref", lang);
} catch (err) {
  // localStorage inaccesible: no hacemos nada.
}
