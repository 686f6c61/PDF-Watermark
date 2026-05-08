/**
 * Lote de marcas personalizadas: parseo, slugify y deduplicación.
 *
 * Pieza central de la versión 1.2.0. El usuario aporta una lista de nombres
 * (uno por línea) y la app debe:
 *   1. Parsearla, descartando comentarios (`#`), líneas vacías y duplicados.
 *   2. Convertir cada nombre a un slug seguro como nombre de carpeta dentro
 *      del ZIP (ASCII, kebab-case, sin acentos ni caracteres especiales).
 *   3. Resolver colisiones de slugs con sufijo `-2`, `-3`… para garantizar
 *      que la estructura del ZIP sea inequívoca.
 *
 * Decisiones:
 *
 * - Los nombres del lote son potencialmente sensibles (empleados, clientes,
 *   destinatarios de un documento confidencial). Por eso este módulo trabaja
 *   solo con strings y NO persiste nada. La privacidad se respeta a nivel de
 *   `editor.svelte.ts` saltándose `localStorage`.
 *
 * - La deduplicación se hace sobre la versión normalizada (lowercase + trim)
 *   para que `Juan Pérez` y `  juan pérez  ` se traten como el mismo nombre.
 *
 * - `slugify` no usa `Intl.Segmenter` (sobrante para esto): basta con
 *   `String.prototype.normalize("NFD")` + regex de marcas combinantes para
 *   eliminar acentos. La eñe se trata explícitamente porque al normalizar
 *   produce `n` + tilde combinante, que ya cae con el regex genérico.
 *
 * @module batch
 */

export const BATCH_LIMITS = {
  /** Máximo de nombres permitido en un lote. */
  MAX_NAMES: 50,
  /** Longitud mínima de un nombre tras `trim()`. */
  MIN_NAME_LENGTH: 1,
  /** Longitud máxima de un nombre tras `trim()`. */
  MAX_NAME_LENGTH: 60,
} as const;

export type BatchWarning = "empty" | "too-many" | "duplicates" | "invalid-length";

export type ParseBatchResult = {
  /** Nombres limpios, en orden de aparición, sin duplicados ni inválidos. */
  names: string[];
  /** Avisos no bloqueantes: el caller decide si mostrar o no la entrada. */
  warnings: BatchWarning[];
};

/**
 * Parsea el contenido de un textarea o de un archivo TXT/CSV.
 *
 * Reglas:
 * - Las líneas que empiezan por `#` (tras trim) son comentarios y se ignoran.
 * - Las líneas vacías se ignoran.
 * - Cada nombre se trimea por los extremos.
 * - Nombres con longitud fuera de rango se descartan y emiten warning.
 * - Duplicados (case-insensitive) se descartan y emiten warning.
 * - Si tras filtrar quedan más de `MAX_NAMES`, se trunca y emite warning.
 */
export function parseBatchInput(raw: string): ParseBatchResult {
  const warnings = new Set<BatchWarning>();
  const seen = new Set<string>();
  const names: string[] = [];

  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("#")) continue;

    if (
      trimmed.length < BATCH_LIMITS.MIN_NAME_LENGTH ||
      trimmed.length > BATCH_LIMITS.MAX_NAME_LENGTH
    ) {
      warnings.add("invalid-length");
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      warnings.add("duplicates");
      continue;
    }
    seen.add(key);
    names.push(trimmed);
  }

  if (names.length === 0) {
    warnings.add("empty");
  }

  let finalNames = names;
  if (names.length > BATCH_LIMITS.MAX_NAMES) {
    finalNames = names.slice(0, BATCH_LIMITS.MAX_NAMES);
    warnings.add("too-many");
  }

  return { names: finalNames, warnings: Array.from(warnings) };
}

/**
 * Convierte un nombre a un slug ASCII apto para nombre de carpeta dentro de
 * un ZIP. No usa dependencias externas: NFD + regex.
 *
 * Ejemplos:
 *   "Juan Pérez"    -> "juan-perez"
 *   "Niño @ Casa"   -> "nino-casa"
 *   "ÁNGEL"         -> "angel"
 *   "España"        -> "espana"
 *   "@@@"           -> ""
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Garantiza unicidad de slugs preservando el orden. Si un slug ya apareció,
 * se le añade sufijo `-2`, `-3`, etc. Los slugs vacíos se reemplazan por
 * `sin-nombre` antes de aplicar la misma lógica de deduplicación.
 */
export function dedupeSlugs(slugs: string[]): string[] {
  const counts = new Map<string, number>();
  const result: string[] = [];

  for (const original of slugs) {
    const base = original.length > 0 ? original : "sin-nombre";
    const previous = counts.get(base) ?? 0;
    const next = previous + 1;
    counts.set(base, next);
    result.push(next === 1 ? base : `${base}-${next}`);
  }

  return result;
}
