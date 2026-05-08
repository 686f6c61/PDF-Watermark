/**
 * Plantilla descargable para el lote de marcas personalizadas.
 *
 * Genera un fichero TXT en el cliente vía `Blob` + `<a download>`, sin
 * dependencias externas y sin servir un archivo estático desde `public/`.
 * El motivo de hacerlo dinámico:
 *   - Mantenemos el bundle limpio (no hay assets adicionales que servir).
 *   - El idioma de la plantilla coincide con el idioma activo de la UI sin
 *     necesidad de duplicar archivos en cada locale.
 *
 * @module batch-template
 */

import type { Lang } from "../i18n/t";

const ES_TEMPLATE = `# Plantilla para lote de marcas de agua personalizadas
# Escribe un nombre o identificador por linea.
# Las lineas que empiezan por # son comentarios y se ignoran.
# Maximo 50 nombres.

Juan Perez
Maria Gomez
Antonio Garcia
Laura Martinez
Carlos Rodriguez
`;

const EN_TEMPLATE = `# Template for personalized watermark batch
# Write one name or identifier per line.
# Lines starting with # are comments and ignored.
# Maximum 50 names.

John Smith
Mary Johnson
Robert Williams
Linda Brown
Michael Davis
`;

/**
 * Dispara la descarga de la plantilla TXT en el idioma indicado.
 * Llamada típica desde un click handler en el componente Svelte.
 */
export function downloadBatchTemplate(lang: Lang): void {
  const content = lang === "es" ? ES_TEMPLATE : EN_TEMPLATE;
  const filename = lang === "es" ? "plantilla-marcas.txt" : "watermark-template.txt";

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
