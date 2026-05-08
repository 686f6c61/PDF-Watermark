/**
 * Decisión de si la vista previa debe renderizar la marca de agua sobre la
 * página solicitada o mostrar el original sin alterar.
 *
 * Helper puro extraído por bug B: el preview de PDF llamaba al motor para
 * cualquier página, ignorando `selectedPages`. Esto engañaba al usuario:
 * el resultado descargado no marcaba esa página, pero el preview la mostraba
 * marcada. Centralizamos la lógica aquí para evitar que la regresión vuelva.
 *
 * @module watermark/preview-decision
 */
import type { FileItem } from "./types";

export function shouldRenderWatermark(file: FileItem, page: number): boolean {
  if (file.type !== "pdf") return true;
  if (!file.selectedPages) return true;
  return file.selectedPages.includes(page);
}
