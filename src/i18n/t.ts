/**
 * Helper de internacionalizacion (i18n).
 *
 * Implementacion deliberadamente minima: dos JSON estaticos (es / en) y una
 * funcion que indexa por clave separada por puntos. No usa formatear ICU ni
 * pluralizacion porque las cadenas del proyecto son lo bastante sencillas
 * como para encajar en un par de variantes singular/plural definidas como
 * claves separadas (`actions.files` / `actions.filesPlural`).
 *
 * Decisiones:
 * - Las claves se buscan por path: `t("hero.title", "es")`. Si la clave no
 *   existe, devolvemos la propia clave entre corchetes en lugar de undefined,
 *   para que cualquier omision sea inmediatamente visible en pantalla.
 * - Carga estatica de los JSON (import directo). Astro/Vite los inlinea en el
 *   bundle y permite que SSR (paginas .astro) y CSR (componentes Svelte)
 *   compartan la misma fuente de verdad sin fetch en runtime.
 *
 * @module i18n/t
 */
import esStrings from "./es.json";
import enStrings from "./en.json";

export type Lang = "es" | "en";

const DICTIONARIES: Record<Lang, Record<string, unknown>> = {
  es: esStrings as Record<string, unknown>,
  en: enStrings as Record<string, unknown>,
};

export function t(key: string, lang: Lang): string {
  const parts = key.split(".");
  let cursor: unknown = DICTIONARIES[lang];
  for (const part of parts) {
    if (cursor && typeof cursor === "object" && part in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return `[${key}]`;
    }
  }
  return typeof cursor === "string" ? cursor : `[${key}]`;
}

export function isLang(value: unknown): value is Lang {
  return value === "es" || value === "en";
}
