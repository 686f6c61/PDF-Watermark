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
  // Tamaño del lienzo destino (imagen o pagina PDF) en px. Cuando se indica,
  // la marca se limita a `maxFraction` del lienzo: un logo apaisado con
  // fontSize grande puede quedar mas ancho que el propio lienzo (ratio 4:1
  // y fontSize 48 => 588 px de ancho sobre una imagen de 400 px).
  canvasWidth?: number;
  canvasHeight?: number;
  // Fraccion maxima del lienzo por eje. Por defecto IMAGE_MAX_CANVAS_FRACTION;
  // los patrones de mosaico usan IMAGE_TILED_CANVAS_FRACTION para que quepan
  // varias marcas sin solapar (ver imageMaxFractionForPattern).
  maxFraction?: number;
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

// Fraccion maxima del lienzo que puede ocupar la marca en cada eje. Evita
// desbordes con logos apaisados o fontSize grandes manteniendo la proporcion.
export const IMAGE_MAX_CANVAS_FRACTION = 0.6;

// Fraccion reducida para patrones de mosaico (diagonal, espiral): con marcas
// repetidas hace falta que quepan varias con aire entre ellas — el hueco
// horizontal es de una marca completa (ver computeDiagonal) — asi que la
// marca debe ser bastante menor que el lienzo para que el mosaico tenga
// cobertura incluso en lienzos pequeños.
export const IMAGE_TILED_CANVAS_FRACTION = 0.25;

// Fraccion de lienzo segun el patron: mosaico => reducida, marca unica => amplia.
export function imageMaxFractionForPattern(pattern: WatermarkConfig["pattern"]): number {
  return pattern === "diagonal" || pattern === "spiral"
    ? IMAGE_TILED_CANVAS_FRACTION
    : IMAGE_MAX_CANVAS_FRACTION;
}

export function computeImageWatermarkSize(input: ImageNaturalSize): ImageDrawSize {
  const { naturalWidth, naturalHeight, fontSize, canvasWidth, canvasHeight, maxFraction } = input;
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const targetHeight = fontSize * IMAGE_TO_FONTSIZE_RATIO;
  const ratio = naturalWidth / naturalHeight;
  let width = targetHeight * ratio;
  let height = targetHeight;
  const fraction = maxFraction ?? IMAGE_MAX_CANVAS_FRACTION;
  const maxWidth = canvasWidth ? canvasWidth * fraction : Infinity;
  const maxHeight = canvasHeight ? canvasHeight * fraction : Infinity;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width *= scale;
  height *= scale;
  return { width, height };
}

export type ImageScaleSize = {
  naturalWidth: number;
  naturalHeight: number;
  // Porcentaje (5-100) del tamaño maximo que cabe bajo el techo del patron.
  imageScale: number;
  canvasWidth: number;
  canvasHeight: number;
  maxFraction?: number;
};

// Tamaño de la marca a partir de `imageScale`. El 100 % es el mayor tamaño
// que conserva la proporcion del logo sin desbordar la caja techo del patron
// (fraction x lienzo en cada eje); el resto de valores escalan linealmente
// desde ahi. Es el camino que usan los motores en modo imagen: al ser lineal
// sobre el maximo ya limitado, el control es monotono en todo su rango para
// cualquier forma de logo — con fontSize (y con un alto objetivo fijo) el
// clamp del techo colapsaba la mayor parte del slider al mismo tamaño, sobre
// todo con logos apaisados en patrones de mosaico.
export function computeImageWatermarkSizeFromScale(input: ImageScaleSize): ImageDrawSize {
  const { naturalWidth, naturalHeight, imageScale, canvasWidth, canvasHeight } = input;
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const fraction = input.maxFraction ?? IMAGE_MAX_CANVAS_FRACTION;
  const maxWidth = canvasWidth * fraction;
  const maxHeight = canvasHeight * fraction;
  const fit = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  const k = fit * (imageScale / 100);
  return { width: naturalWidth * k, height: naturalHeight * k };
}
