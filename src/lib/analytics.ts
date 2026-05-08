// Wrapper de Google Analytics 4 con Consent Mode v2.
//
// Diseno:
// - El bootstrap (dataLayer, funcion gtag, consent default DENIED y carga del
//   script gtag.js) lo hace /public/gtag-init.js inline en el <head>. Esto es
//   lo que permite que Google Tag Assistant detecte la etiqueta sin ejecutar
//   el bundle de Svelte.
// - Este modulo solo actualiza el consent cuando el usuario interactua con
//   el banner: grantConsent() pasa todo a granted, revokeConsent() vuelve a
//   denied.
// - initAnalytics() existe para compatibilidad con el codigo que llama desde
//   el layout, pero no hace nada porque el bootstrap inline ya se ejecuto.

interface DataLayerWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

function ensureGtag(): boolean {
  const w = window as unknown as DataLayerWindow;
  return Array.isArray(w.dataLayer) && typeof w.gtag === "function";
}

export function initAnalytics(): void {
  // No-op: gtag-init.js inline ya configuro consent default y cargo gtag.js.
  // Mantenemos la funcion exportada para no romper la API existente.
}

export function grantConsent(): void {
  if (!ensureGtag()) return;
  const w = window as unknown as DataLayerWindow;
  w.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

export function revokeConsent(): void {
  if (!ensureGtag()) return;
  const w = window as unknown as DataLayerWindow;
  w.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
