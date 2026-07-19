// Wrapper de Google Analytics 4 con Consent Mode v2 y carga condicional.
//
// Diseno:
// - El bootstrap (dataLayer, stub de gtag, consent default DENIED y la
//   funcion de carga condicional del script externo) vive en el fichero
//   estatico /js/gtag-init.js, cargado con defer desde el <head>. El
//   script de googletagmanager.com NO se descarga hasta que el usuario
//   acepta: sin consentimiento no hay ninguna peticion a terceros.
// - Este modulo solo se invoca cuando el usuario interactua con el banner:
//   grantConsent() dispara la carga (que concede SOLO analytics_storage;
//   la promesa de la landing es "solo medimos visitas": nada de funciones
//   publicitarias) y revokeConsent() vuelve todo a denied en caliente.
// - La decision la persiste CookieBanner en localStorage; gtag-init.js la
//   relee al arrancar y precarga GA si ya se acepto antes.
// - initAnalytics() existe para compatibilidad con el codigo que llama
//   desde el layout, pero no hace nada: el bootstrap ya se ejecuto.

interface AnalyticsWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __pwLoadAnalytics?: () => void;
}

function asAnalyticsWindow(): AnalyticsWindow {
  return window as unknown as AnalyticsWindow;
}

export function initAnalytics(): void {
  // No-op: /js/gtag-init.js ya configuro el consent default y, si la
  // decision guardada era "accepted", precargo GA.
  // Mantenemos la funcion exportada para no romper la API existente.
}

export function grantConsent(): void {
  const w = asAnalyticsWindow();
  if (typeof w.__pwLoadAnalytics === "function") {
    // Camino normal: el loader encola el consent update (solo
    // analytics_storage), js/config e inyecta gtag.js. Es idempotente.
    w.__pwLoadAnalytics();
    return;
  }
  // Fallback defensivo (paginas sin gtag-init.js): si al menos existe el
  // stub de gtag, emite el update para no perder el consentimiento.
  if (Array.isArray(w.dataLayer) && typeof w.gtag === "function") {
    w.gtag("consent", "update", {
      analytics_storage: "granted",
    });
  }
}

export function revokeConsent(): void {
  const w = asAnalyticsWindow();
  if (!(Array.isArray(w.dataLayer) && typeof w.gtag === "function")) return;
  w.gtag("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
