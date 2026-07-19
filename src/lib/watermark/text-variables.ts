/**
 * Sustitución de variables en el texto de la marca de agua.
 *
 * El usuario puede escribir variables entre llaves en el texto; se resuelven
 * al procesar, en dos niveles:
 *
 *   {fecha}  → fecha de hoy, con `toLocaleDateString("es-ES")` (nivel archivo,
 *              la sustituye el store al hacer snapshot de la config por archivo).
 *   {nombre} → nombre del archivo sin extensión (nivel archivo, idem).
 *   {pagina} → número de página 1-based (nivel página, lo sustituye el motor
 *              PDF dentro del bucle de páginas; en imágenes vale "1").
 *   {total}  → total de páginas del documento (nivel página; en imágenes "1").
 *
 * Solo se sustituyen las claves presentes en `vars`: una variable sin valor en
 * este nivel (p. ej. {pagina} antes de llegar al motor) o desconocida ({foo})
 * se deja literal en el texto. La sustitución nunca introduce caracteres de
 * control, así que es segura de aplicar antes de la validación WinAnsi del
 * motor (ver state/validation.ts).
 *
 * Módulo puro: sin DOM, sin pdf-lib, solo cadenas.
 *
 * @module watermark/text-variables
 */

// Las cuatro variables documentadas. Cualquier otra cosa entre llaves se
// respeta tal cual (no tocamos placeholders ajenos como los {count} de i18n).
const VARIABLE_PATTERN = /\{(fecha|nombre|pagina|total)\}/g;

export function applyTextVariables(text: string, vars: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match,
  );
}
