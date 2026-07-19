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
import {
  computePositions,
  getRenderText,
  resolveEffectiveFontSize,
  TEXT_LINE_HEIGHT,
} from "./patterns";
import { applyTextVariables } from "./text-variables";
import {
  computeImageWatermarkSizeFromScale,
  hasImageWatermark,
  hasTextWatermark,
  imageMaxFractionForPattern,
  type ImageDrawSize,
} from "./image-watermark";
import {
  LIMITS,
  WatermarkError,
  type FontFamily,
  type WatermarkConfig,
} from "./types";

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

// Type guard: en navegadores sin OffscreenCanvas (Safari < 16.4) evaluar
// `instanceof OffscreenCanvas` directamente lanza ReferenceError.
function isOffscreenCanvas(canvas: CanvasLike): canvas is OffscreenCanvas {
  return typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas;
}

async function canvasToBlob(canvas: CanvasLike, mime: string, quality: number): Promise<Blob> {
  if (isOffscreenCanvas(canvas)) {
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

    // Tamaño efectivo para esta imagen: con relativeSize el fontSize del
    // usuario se escala proporcionalmente al ancho del lienzo (una foto de
    // 400 px y otra de 4000 px quedan proporcionadas). La config no cambia.
    const effectiveFontSize = resolveEffectiveFontSize(config, width);
    const effectiveConfig: WatermarkConfig = { ...config, fontSize: effectiveFontSize };

    // Si hay marca de imagen la cargamos ANTES de calcular posiciones: el
    // patron necesita el tamaño real de la marca (ya limitada al lienzo)
    // para espaciar y anclar sin solapar ni desbordar.
    let wmImg: HTMLImageElement | null = null;
    let draw: ImageDrawSize | null = null;
    if (hasImageWatermark(config)) {
      wmImg = await loadImage(config.imageDataUrl as string);
      draw = computeImageWatermarkSizeFromScale({
        naturalWidth: wmImg.naturalWidth || wmImg.width,
        naturalHeight: wmImg.naturalHeight || wmImg.height,
        imageScale: config.imageScale ?? LIMITS.DEFAULT_IMAGE_SCALE,
        canvasWidth: width,
        canvasHeight: height,
        maxFraction: imageMaxFractionForPattern(config.pattern),
      });
    }

    const positions = computePositions(width, height, effectiveConfig, draw ?? undefined);
    ctx.globalAlpha = config.opacity;

    // Si hay imageDataUrl, dibujamos la imagen en cada posicion del patron
    // manteniendo la proporcion. Si no, caemos al render de texto clasico.
    // No mezclamos: si hay imagen, ignoramos el texto en este motor; el
    // usuario elige una u otra desde la UI con un selector exclusivo.
    if (wmImg && draw) {
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
      // Sin "bold": el PDF final usa las fuentes base-14 en peso regular y el
      // preview debe medir/dibujar el texto con la misma anchura (paridad).
      ctx.font = `${effectiveFontSize}px ${FONT_STACK[config.fontFamily]}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = config.color;

      // Variables de nivel pagina: una imagen es una unica "pagina".
      const resolvedText = applyTextVariables(config.text, { pagina: "1", total: "1" });
      // Texto multi-linea: cada linea se dibuja centrada por separado, con la
      // convencion del espacio final de getRenderText heredada por linea.
      const renderLines = resolvedText.split("\n").map(getRenderText);

      for (const pos of positions) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((pos.rotation * Math.PI) / 180);
        for (let lineIndex = 0; lineIndex < renderLines.length; lineIndex += 1) {
          // La linea i (0-based de n) se dibuja desplazada (i - (n-1)/2) *
          // 1.2em respecto al centro, con el BLOQUE centrado en la posicion.
          const dy =
            (lineIndex - (renderLines.length - 1) / 2) * TEXT_LINE_HEIGHT * effectiveFontSize;
          ctx.fillText(renderLines[lineIndex]!, 0, dy);
        }
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
