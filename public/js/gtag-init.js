// Bootstrap de Consent Mode v2 + carga CONDICIONAL de gtag.js.
//
// La landing promete "las analiticas se cargan unicamente con tu
// consentimiento explicito". Este fichero lo hace cierto: el script de
// googletagmanager.com NO se descarga hasta que el usuario acepta el
// banner (o lo acepto en una visita anterior). Sin consentimiento no hay
// ninguna peticion a terceros: ni script, ni ping, ni cookie.
//
// Piezas:
// - dataLayer + stub de gtag: siempre disponibles, sin red, para que el
//   banner y src/lib/analytics.ts puedan emitir eventos de consentimiento.
// - consent default: TODO denegado (Consent Mode v2).
// - window.__pwLoadAnalytics(): idempotente; concede SOLO
//   analytics_storage, encola js/config e inyecta el script externo. La
//   llama grantConsent() (src/lib/analytics.ts) al aceptar y este mismo
//   fichero al arrancar si la decision guardada es "accepted".
//
// Servido como fichero estatico para poder endurecer la CSP (script-src
// sin 'unsafe-inline'). Se carga con `defer` desde el <head>.
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
});

var GA_MEASUREMENT_ID = 'G-2G7BTJZ72T';
var analyticsRequested = false;

window.__pwLoadAnalytics = function () {
  if (analyticsRequested) return;
  analyticsRequested = true;
  // Solo analitica: las funciones publicitarias se quedan denegadas
  // incluso tras el si (la promesa es "solo medimos visitas").
  gtag('consent', 'update', { analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(s);
};

try {
  if (localStorage.getItem('pdf-watermark-consent') === 'accepted') {
    window.__pwLoadAnalytics();
  }
} catch (err) {
  // localStorage puede fallar en modo privado: no se carga nada.
}
