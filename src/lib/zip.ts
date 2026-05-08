/**
 * Empaquetado de resultados y descarga al disco.
 *
 * Decide entre descarga directa (un solo archivo) o empaquetado en ZIP
 * (dos o más archivos). El nombre de cada fichero resultante sigue el
 * patrón `<nombre-original>-watermarked.<extensión>`; el ZIP se llama
 * `watermarked-YYYY-MM-DD.zip`.
 *
 * `downloadResults` acepta la lista completa de `FileItem` del store y filtra
 * internamente los que tienen `status === "done"`. El store también filtra
 * antes de llamar a esta función, lo que es defensivo pero correcto: la
 * función puede recibir listas mixtas sin producir resultados incorrectos.
 *
 * @module zip
 */
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { FileItem } from "./watermark/types";

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function getOriginalExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "";
  return name.slice(dot + 1).toLowerCase();
}

function getBaseName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return name;
  return name.slice(0, dot);
}

export function buildOutputName(item: FileItem): string {
  const base = getBaseName(item.file.name);
  const ext = getOriginalExtension(item.file.name) ||
    EXTENSION_BY_MIME[item.resultBlob?.type ?? ""] ||
    EXTENSION_BY_MIME[item.file.type] ||
    "bin";
  return `${base}-watermarked.${ext}`;
}

function todayStamp(date: Date = new Date()): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function buildZipBlob(items: FileItem[]): Promise<Blob> {
  const zip = new JSZip();
  for (const item of items) {
    if (!item.resultBlob) continue;
    const name = buildOutputName(item);
    zip.file(name, item.resultBlob);
  }
  return zip.generateAsync({ type: "blob" });
}

export async function downloadResults(items: FileItem[], today: Date = new Date()): Promise<void> {
  const completed = items.filter((i) => i.status === "done" && i.resultBlob);
  if (completed.length === 0) {
    return;
  }
  if (completed.length === 1) {
    const single = completed[0]!;
    saveAs(single.resultBlob!, buildOutputName(single));
    return;
  }
  const zipBlob = await buildZipBlob(completed);
  saveAs(zipBlob, `watermarked-${todayStamp(today)}.zip`);
}
