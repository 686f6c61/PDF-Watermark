/**
 * Parseo de rangos de páginas escritos por el usuario ("1, 3-5, 8-").
 *
 * Sintaxis admitida (1-based, como la numeración visible en la UI):
 *   - Página suelta: "3"
 *   - Rango cerrado: "3-5" (ambos extremos incluidos)
 *   - Rango abierto: "8-" (desde la 8 hasta la última página)
 *   - Mezcla separada por comas: "1, 3-5, 8-"
 *
 * Los espacios alrededor de números, comas y guiones se toleran. Las páginas
 * duplicadas o solapadas se colapsan y el resultado va ordenado ascendente.
 * Cualquier valor fuera de [1, pageCount] o cualquier trozo con sintaxis no
 * reconocida invalida TODO el parseo (devolvemos null) en lugar de aplicar
 * una selección parcial que el usuario no pidió.
 *
 * Módulo puro: sin DOM, sin estado.
 *
 * @module page-ranges
 */

// Un trozo es o un número suelto ("12") o un rango ("3-5", "8-"). El extremo
// derecho vacío marca el rango abierto hasta pageCount.
const PART_PATTERN = /^(\d+)(?:\s*-\s*(\d*))?$/;

export function parsePageRanges(input: string, pageCount: number): number[] | null {
  const trimmed = input.trim();
  if (trimmed === "" || !Number.isInteger(pageCount) || pageCount < 1) return null;

  const pages = new Set<number>();
  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();
    if (part === "") return null;
    const match = PART_PATTERN.exec(part);
    if (!match) return null;

    const start = Number(match[1]);
    // Sin guion: pagina suelta, empiezo y fin coinciden. Guion sin extremo
    // derecho: abierto hasta la ultima pagina.
    const end = match[2] === undefined ? start : match[2] === "" ? pageCount : Number(match[2]);

    if (start < 1 || start > pageCount) return null;
    if (end < start || end > pageCount) return null;

    for (let page = start; page <= end; page += 1) {
      pages.add(page);
    }
  }

  return [...pages].sort((a, b) => a - b);
}
