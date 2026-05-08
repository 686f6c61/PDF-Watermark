/**
 * Motor de marcas de agua para imágenes (PNG, JPG, WebP).
 *
 * Recibe un `File` y una `WatermarkConfig`, pinta el texto sobre la imagen
 * usando Canvas API y devuelve un `Blob` del mismo formato que el original.
 * Usa `OffscreenCanvas` cuando está disponible para no bloquear el hilo
 * principal; en navegadores sin soporte (Safari antiguo) cae a
 * `HTMLCanvasElement`, que comparte la misma API de contexto 2D.
 *
 * Las posiciones de cada instancia del watermark las calcula `patterns.ts`,
 * que es independiente del soporte. Este módulo solo se ocupa de la
 * traducción a llamadas de Canvas y de la exportación del resultado.
 *
 * @module watermark/image
 */
import { computePositions, getRenderText } from "./patterns";
import {
  computeImageWatermarkSize,
  hasImageWatermark,
  hasTextWatermark,
} from "./image-watermark";
import { WatermarkError, type FontFamily, type WatermarkConfig } from "./types";

const FONT_STACK: Record<FontFamily, string> = {
  sans: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
};

function detectMimeFromFile(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/png";
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new WatermarkError("PARSE_ERROR", "No se pudo cargar la imagen"));
    img.src = url;
  });
}

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;
type CtxLike = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getContext(canvas: CanvasLike): CtxLike {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new WatermarkError("UNKNOWN", "No se pudo obtener el contexto 2D del canvas");
  }
  return ctx as CtxLike;
}

async function canvasToBlob(canvas: CanvasLike, mime: string, quality: number): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    const opts: ImageEncodeOptions = mime === "image/jpeg" || mime === "image/webp"
      ? { type: mime, quality }
      : { type: mime };
    return canvas.convertToBlob(opts);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new WatermarkError("UNKNOWN", "El navegador no devolvió un Blob de la imagen"));
        }
      },
      mime,
      quality,
    );
  });
}

export async function applyWatermarkToImage(
  file: File,
  config: WatermarkConfig,
): Promise<Blob> {
  const mime = detectMimeFromFile(file);
  const objectUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(objectUrl);
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    if (err instanceof WatermarkError) throw err;
    throw new WatermarkError("PARSE_ERROR", "Imagen no válida", err);
  }

  try {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (width === 0 || height === 0) {
      throw new WatermarkError("PARSE_ERROR", "La imagen no tiene dimensiones válidas");
    }
    const canvas = createCanvas(width, height);
    const ctx = getContext(canvas);
    ctx.drawImage(img, 0, 0, width, height);

    const positions = computePositions(width, height, config);
    ctx.globalAlpha = config.opacity;

    // Si hay imageDataUrl, dibujamos la imagen en cada posicion del patron
    // manteniendo la proporcion. Si no, caemos al render de texto clasico.
    // No mezclamos: si hay imagen, ignoramos el texto en este motor; el
    // usuario elige una u otra desde la UI con un selector exclusivo.
    if (hasImageWatermark(config)) {
      const wmImg = await loadImage(config.imageDataUrl as string);
      const draw = computeImageWatermarkSize({
        naturalWidth: wmImg.naturalWidth || wmImg.width,
        naturalHeight: wmImg.naturalHeight || wmImg.height,
        fontSize: config.fontSize,
      });
      if (draw.width > 0 && draw.height > 0) {
        for (const pos of positions) {
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate((pos.rotation * Math.PI) / 180);
          ctx.drawImage(wmImg, -draw.width / 2, -draw.height / 2, draw.width, draw.height);
          ctx.restore();
        }
      }
    } else if (hasTextWatermark(config)) {
      ctx.font = `bold ${config.fontSize}px ${FONT_STACK[config.fontFamily]}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = config.color;

      for (const pos of positions) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((pos.rotation * Math.PI) / 180);
        ctx.fillText(getRenderText(config.text), 0, 0);
        ctx.restore();
      }
    }

    const quality = mime === "image/jpeg" ? 0.92 : 1;
    return await canvasToBlob(canvas, mime, quality);
  } catch (err) {
    if (err instanceof WatermarkError) throw err;
    throw new WatermarkError("UNKNOWN", "Fallo aplicando la marca de agua a la imagen", err);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
