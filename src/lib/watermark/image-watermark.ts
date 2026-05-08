/**
 * Helpers puros para gestionar la marca de agua cuando es una imagen.
 *
 * Centralizamos aqui las decisiones que ambos motores (Canvas para imagenes,
 * pdf-lib para PDFs) y la capa de validacion necesitan compartir:
 *
 * - `hasImageWatermark` / `hasTextWatermark`: discriminantes que determinan
 *   que dibujar en cada motor sin tener que repetir la misma comprobacion.
 * - `computeImageWatermarkSize`: traduce el `fontSize` configurado por el
 *   usuario a un tamaño visual de la imagen, conservando la proporcion. La
 *   regla es la misma en Canvas y en pdf-lib, asi que vive aqui en lugar de
 *   en cada motor por separado.
 *
 * Modulo puro: no importa Canvas ni pdf-lib, solo recibe numeros y devuelve
 * numeros. Esto es lo que lo hace barato de testear sin DOM.
 *
 * @module watermark/image-watermark
 */
import type { WatermarkConfig } from "./types";

export function hasImageWatermark(config: WatermarkConfig): boolean {
  return typeof config.imageDataUrl === "string" && config.imageDataUrl.length > 0;
}

export function hasTextWatermark(config: WatermarkConfig): boolean {
  return config.text.trim().length > 0;
}

export type ImageNaturalSize = {
  naturalWidth: number;
  naturalHeight: number;
  fontSize: number;
};

export type ImageDrawSize = {
  width: number;
  height: number;
};

// Factor por el que escalamos el alto de la imagen respecto al fontSize.
// Buscamos que la marca grafica tenga peso visual comparable a un texto del
// mismo fontSize: una linea de texto de fontSize 48 ocupa ~48 px de alto, y
// una imagen suele necesitar mas para no quedar diminuta. 3x es un compromiso
// que funciona bien con logos y sellos cuadrados o ligeramente apaisados.
const IMAGE_TO_FONTSIZE_RATIO = 3;

export function computeImageWatermarkSize(input: ImageNaturalSize): ImageDrawSize {
  const { naturalWidth, naturalHeight, fontSize } = input;
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const targetHeight = fontSize * IMAGE_TO_FONTSIZE_RATIO;
  const ratio = naturalWidth / naturalHeight;
  const targetWidth = targetHeight * ratio;
  return { width: targetWidth, height: targetHeight };
}
