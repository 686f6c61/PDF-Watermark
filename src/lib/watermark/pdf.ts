/**
 * Motor de marcas de agua para PDFs.
 *
 * Expone dos funciones públicas:
 *
 * - `readPdfMetadata`: lee el número de páginas de un PDF sin modificarlo.
 *   Detecta PDFs cifrados antes de que el usuario intente procesarlos, para
 *   mostrar un error claro en lugar de fallar en el momento del dibujado.
 *
 * - `applyWatermarkToPdf`: aplica el watermark a las páginas seleccionadas
 *   usando pdf-lib. Las posiciones las calcula `patterns.ts`; este módulo se
 *   ocupa de traducirlas al sistema de coordenadas de pdf-lib (origen
 *   abajo-izquierda) e invertir el signo de rotación (pdf-lib gira en sentido
 *   antihorario). Ver `computePdfDrawOffset` para el detalle del cálculo.
 *
 * Nota: este módulo usa pdf-lib para escribir el PDF resultante. La
 * renderización de previews (rasterizar páginas para el divisor antes/después)
 * corre a cargo de pdfjs-dist en `PreviewSlider.svelte`. Ver ADR-0003.
 *
 * @module watermark/pdf
 */
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { computePositions, getRenderText } from "./patterns";
import {
  computeImageWatermarkSize,
  hasImageWatermark,
  hasTextWatermark,
} from "./image-watermark";
import { WatermarkError, type FontFamily, type WatermarkConfig } from "./types";

const FONT_BY_FAMILY: Record<FontFamily, StandardFonts> = {
  sans: StandardFonts.Helvetica,
  serif: StandardFonts.TimesRoman,
  mono: StandardFonts.Courier,
};

// Decodifica la parte base64 de un data URL en un Uint8Array. pdf-lib espera
// bytes crudos para embedPng/embedJpg, no la cadena base64 original. atob es
// estandar en navegadores y en jsdom; no necesitamos un polyfill adicional.
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new WatermarkError("PARSE_ERROR", "data URL sin separador de payload");
  }
  const base64 = dataUrl.slice(comma + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Conveniencia para invertir la coordenada vertical Canvas->pdf-lib. Lo
// extraemos para que el codigo del bucle de dibujado se lea como prosa.
function pageHeight(height: number, canvasY: number): number {
  return height - canvasY;
}

function hexToRgbNormalized(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return { r, g, b };
}

export type PdfMetadataResult =
  | { ok: true; pageCount: number }
  | { ok: false; reason: "protected" | "parse"; message: string };

const PROTECTED_MESSAGE =
  "El PDF está protegido por contraseña y no puede procesarse sin desbloquearlo primero";

function isEncryptionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("encrypt") || msg.includes("password");
}

// Lectura segura de metadatos de un PDF. NO usa ignoreEncryption: true
// para no enmascarar PDFs protegidos: si lo esta, devuelve un resultado
// explicito que el caller puede comunicar al usuario.
export async function readPdfMetadata(file: File): Promise<PdfMetadataResult> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return { ok: false, reason: "parse", message: "No se pudo leer el archivo" };
  }
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    return { ok: true, pageCount: doc.getPageCount() };
  } catch (err) {
    if (isEncryptionError(err)) {
      return { ok: false, reason: "protected", message: PROTECTED_MESSAGE };
    }
    return { ok: false, reason: "parse", message: "El PDF parece dañado o ilegible" };
  }
}

export type PdfDrawOffsetInput = {
  canvasX: number;
  canvasY: number;
  textWidth: number;
  pageHeight: number;
  font: PDFFont;
  fontSize: number;
};

export type PdfDrawOffset = {
  drawX: number;
  drawY: number;
};

// Calcula el desplazamiento necesario para que pdf-lib dibuje el texto
// centrado sobre (canvasX, canvasY) en coordenadas Canvas (origen arriba-izquierda).
// pdf-lib usa origen abajo-izquierda y dibuja desde la linea base, por lo que
// debemos invertir Y y descender la mitad de la altura visual del glifo.
//
// Equivalencia con Canvas (textBaseline = "middle"): el centro vertical visual
// del texto debe coincidir con la inversa de canvasY (pageHeight - canvasY).
// Usamos heightAtSize(..., { descender: false }) como aproximacion de cap-height,
// que es la altura visual de las mayusculas y la metrica mas estable para
// centrar visualmente entre Helvetica/Times/Courier.
export function computePdfDrawOffset(input: PdfDrawOffsetInput): PdfDrawOffset {
  const { canvasX, canvasY, textWidth, pageHeight, font, fontSize } = input;
  const capHeight = font.heightAtSize(fontSize, { descender: false });
  const drawX = canvasX - textWidth / 2;
  // Centramos el texto: linea base ubicada media cap-height por debajo del centro.
  const drawY = pageHeight - canvasY - capHeight / 2;
  return { drawX, drawY };
}

export async function applyWatermarkToPdf(
  file: File,
  config: WatermarkConfig,
  selectedPages: number[],
): Promise<Blob> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (err) {
    throw new WatermarkError("PARSE_ERROR", "No se pudo leer el PDF", err);
  }

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("encrypt") || message.includes("password")) {
      throw new WatermarkError("PROTECTED_PDF", "El PDF está protegido por contraseña", err);
    }
    throw new WatermarkError("PARSE_ERROR", "El PDF parece dañado o ilegible", err);
  }

  // Embebemos fuente solo si vamos a dibujar texto. Para marcas de agua
  // puramente graficas la fuente es innecesaria y solo añadiria peso al PDF.
  let font: PDFFont | null = null;
  const dibujarTexto = hasTextWatermark(config) && !hasImageWatermark(config);
  if (dibujarTexto) {
    try {
      font = await doc.embedFont(FONT_BY_FAMILY[config.fontFamily]);
    } catch (err) {
      throw new WatermarkError("UNKNOWN", "No se pudo embeber la fuente de la marca de agua", err);
    }
  }

  // Embebemos la imagen una sola vez por documento si esta presente. pdf-lib
  // soporta PNG y JPEG; usamos embedPng/embedJpg segun el MIME del data URL.
  let watermarkImage: PDFImage | null = null;
  if (hasImageWatermark(config)) {
    try {
      const dataUrl = config.imageDataUrl as string;
      const bytes = dataUrlToBytes(dataUrl);
      // PDF nativo no admite WebP. Si nos llega WebP, fallamos con un mensaje
      // claro porque el caller deberia haber filtrado en la capa de validacion.
      if (dataUrl.startsWith("data:image/png")) {
        watermarkImage = await doc.embedPng(bytes);
      } else if (dataUrl.startsWith("data:image/jpeg")) {
        watermarkImage = await doc.embedJpg(bytes);
      } else {
        throw new WatermarkError(
          "INVALID_FORMAT",
          "PDF solo admite imagenes PNG o JPEG como marca de agua",
        );
      }
    } catch (err) {
      if (err instanceof WatermarkError) throw err;
      throw new WatermarkError("UNKNOWN", "No se pudo embeber la imagen de la marca", err);
    }
  }

  const { r, g, b } = hexToRgbNormalized(config.color);
  const color = rgb(r, g, b);
  const pages = doc.getPages();
  const targetPages = new Set(selectedPages);

  for (let i = 0; i < pages.length; i += 1) {
    const pageNumber = i + 1;
    if (!targetPages.has(pageNumber)) continue;
    const page = pages[i]!;
    const { width, height } = page.getSize();
    const positions = computePositions(width, height, config);
    // Caso 1: marca de imagen. Calculamos el tamaño una sola vez por pagina.
    if (watermarkImage) {
      const draw = computeImageWatermarkSize({
        naturalWidth: watermarkImage.width,
        naturalHeight: watermarkImage.height,
        fontSize: config.fontSize,
      });
      if (draw.width <= 0 || draw.height <= 0) continue;
      for (const pos of positions) {
        // pdf-lib dibuja desde la esquina inferior-izquierda y rota desde ese
        // mismo punto. Para centrar visualmente la imagen sobre (pos.x, pos.y)
        // en coordenadas Canvas, calculamos primero la equivalente en pdf-lib
        // (pageHeight - pos.y) y restamos media altura/anchura.
        const drawX = pos.x - draw.width / 2;
        const drawY = pageHeight(height, pos.y) - draw.height / 2;
        page.drawImage(watermarkImage, {
          x: drawX,
          y: drawY,
          width: draw.width,
          height: draw.height,
          opacity: config.opacity,
          rotate: degrees(-pos.rotation),
        });
      }
      continue;
    }
    // Caso 2: marca de texto (codigo original).
    if (!font) continue;
    const renderText = getRenderText(config.text);
    const textWidth = font.widthOfTextAtSize(renderText, config.fontSize);
    for (const pos of positions) {
      const { drawX, drawY } = computePdfDrawOffset({
        canvasX: pos.x,
        canvasY: pos.y,
        textWidth,
        pageHeight: height,
        font,
        fontSize: config.fontSize,
      });
      page.drawText(renderText, {
        x: drawX,
        y: drawY,
        size: config.fontSize,
        font,
        color,
        opacity: config.opacity,
        rotate: degrees(-pos.rotation),
      });
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await doc.save();
  } catch (err) {
    throw new WatermarkError("UNKNOWN", "Fallo guardando el PDF resultante", err);
  }
  // Forzamos copia a un ArrayBuffer estandar para satisfacer el tipo BlobPart,
  // ya que algunos entornos tipan el buffer como ArrayBufferLike (incluye SharedArrayBuffer).
  const safeBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([safeBuffer], { type: "application/pdf" });
}
