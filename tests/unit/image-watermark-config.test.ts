import { describe, expect, it } from "vitest";
import {
  computeImageWatermarkSize,
  computeImageWatermarkSizeFromScale,
  hasImageWatermark,
  hasTextWatermark,
  IMAGE_MAX_CANVAS_FRACTION,
  IMAGE_TILED_CANVAS_FRACTION,
  imageMaxFractionForPattern,
} from "../../src/lib/watermark/image-watermark";
import { DEFAULT_CONFIG, type WatermarkConfig } from "../../src/lib/watermark/types";

function configWith(overrides: Partial<WatermarkConfig>): WatermarkConfig {
  return { ...DEFAULT_CONFIG, text: "Confidencial", ...overrides };
}

describe("hasImageWatermark", () => {
  it("devuelve true cuando imageDataUrl es un data URL no vacio", () => {
    const config = configWith({ imageDataUrl: "data:image/png;base64,iVBORw==" });
    expect(hasImageWatermark(config)).toBe(true);
  });

  it("devuelve false cuando imageDataUrl es null o undefined", () => {
    expect(hasImageWatermark(configWith({ imageDataUrl: null }))).toBe(false);
    expect(hasImageWatermark(configWith({}))).toBe(false);
  });

  it("devuelve false cuando imageDataUrl es cadena vacia", () => {
    expect(hasImageWatermark(configWith({ imageDataUrl: "" }))).toBe(false);
  });
});

describe("hasTextWatermark", () => {
  it("devuelve true con texto no vacio", () => {
    expect(hasTextWatermark(configWith({ text: "MARCA" }))).toBe(true);
  });

  it("devuelve false con texto vacio o solo espacios", () => {
    expect(hasTextWatermark(configWith({ text: "" }))).toBe(false);
    expect(hasTextWatermark(configWith({ text: "   " }))).toBe(false);
  });
});

describe("computeImageWatermarkSize", () => {
  it("escala manteniendo proporcion para que el alto coincida con fontSize aproximado", () => {
    // Imagen de 200x100 (proporcion 2:1) sobre fontSize 48: el alto deberia ser
    // del orden de fontSize y el ancho proporcional al doble.
    const size = computeImageWatermarkSize({
      naturalWidth: 200,
      naturalHeight: 100,
      fontSize: 48,
    });
    // Tamaño visual de la marca: el helper escala el alto a ~3x fontSize para
    // que la marca grafica tenga peso similar a un texto de ese fontSize.
    expect(size.height).toBeGreaterThan(0);
    expect(size.width).toBeGreaterThan(0);
    expect(size.width / size.height).toBeCloseTo(2, 2);
  });

  it("a mayor fontSize mayor tamaño de marca", () => {
    const small = computeImageWatermarkSize({
      naturalWidth: 100,
      naturalHeight: 100,
      fontSize: 24,
    });
    const big = computeImageWatermarkSize({
      naturalWidth: 100,
      naturalHeight: 100,
      fontSize: 96,
    });
    expect(big.height).toBeGreaterThan(small.height);
    expect(big.width).toBeGreaterThan(small.width);
  });

  it("conserva ratio cuando la imagen es vertical", () => {
    const size = computeImageWatermarkSize({
      naturalWidth: 50,
      naturalHeight: 200,
      fontSize: 48,
    });
    expect(size.width / size.height).toBeCloseTo(50 / 200, 3);
  });

  it("devuelve dimensiones cero si la imagen tiene ancho o alto invalido", () => {
    expect(
      computeImageWatermarkSize({ naturalWidth: 0, naturalHeight: 100, fontSize: 48 }),
    ).toEqual({ width: 0, height: 0 });
    expect(
      computeImageWatermarkSize({ naturalWidth: 100, naturalHeight: 0, fontSize: 48 }),
    ).toEqual({ width: 0, height: 0 });
  });

  it("limita el ancho al del lienzo cuando un logo apaisado lo desborda", () => {
    // Logo 380x93 (ratio ~4.09) con fontSize 48 => 588 px de ancho sin limite,
    // mayor que un lienzo de 400 px. Debe reducirse conservando la proporcion.
    const size = computeImageWatermarkSize({
      naturalWidth: 380,
      naturalHeight: 93,
      fontSize: 48,
      canvasWidth: 400,
      canvasHeight: 400,
    });
    expect(size.width).toBeLessThanOrEqual(400 * 0.6 + 1e-9);
    expect(size.width / size.height).toBeCloseTo(380 / 93, 2);
  });

  it("limita el alto al del lienzo cuando una imagen vertical lo desborda", () => {
    const size = computeImageWatermarkSize({
      naturalWidth: 50,
      naturalHeight: 400,
      fontSize: 120,
      canvasWidth: 300,
      canvasHeight: 300,
    });
    expect(size.height).toBeLessThanOrEqual(300 * 0.6 + 1e-9);
    expect(size.width / size.height).toBeCloseTo(50 / 400, 2);
  });

  it("no reduce la marca cuando ya cabe en el lienzo", () => {
    const sinLimite = computeImageWatermarkSize({
      naturalWidth: 100,
      naturalHeight: 100,
      fontSize: 24,
    });
    const conLimite = computeImageWatermarkSize({
      naturalWidth: 100,
      naturalHeight: 100,
      fontSize: 24,
      canvasWidth: 1000,
      canvasHeight: 1000,
    });
    expect(conLimite).toEqual(sinLimite);
  });

  it("sin dimensiones de lienzo conserva el comportamiento anterior", () => {
    const size = computeImageWatermarkSize({
      naturalWidth: 380,
      naturalHeight: 93,
      fontSize: 48,
    });
    expect(size.height).toBeCloseTo(144, 5);
    expect(size.width).toBeCloseTo(144 * (380 / 93), 3);
  });

  it("la fraccion de mosaico reduce mas la marca que la de marca unica", () => {
    const base = {
      naturalWidth: 380,
      naturalHeight: 93,
      fontSize: 48,
      canvasWidth: 400,
      canvasHeight: 400,
    };
    const unica = computeImageWatermarkSize({
      ...base,
      maxFraction: imageMaxFractionForPattern("single-center"),
    });
    const mosaico = computeImageWatermarkSize({
      ...base,
      maxFraction: imageMaxFractionForPattern("diagonal"),
    });
    expect(mosaico.width).toBeLessThan(unica.width);
    expect(unica.width / unica.height).toBeCloseTo(mosaico.width / mosaico.height, 5);
  });

  it("imageMaxFractionForPattern: mosaico reducido, marca unica amplio", () => {
    expect(imageMaxFractionForPattern("diagonal")).toBe(IMAGE_TILED_CANVAS_FRACTION);
    expect(imageMaxFractionForPattern("spiral")).toBe(IMAGE_TILED_CANVAS_FRACTION);
    expect(imageMaxFractionForPattern("single-center")).toBe(IMAGE_MAX_CANVAS_FRACTION);
    expect(imageMaxFractionForPattern("corner")).toBe(IMAGE_MAX_CANVAS_FRACTION);
  });
});

describe("computeImageWatermarkSizeFromScale", () => {
  const base = {
    naturalWidth: 400,
    naturalHeight: 400,
    canvasWidth: 800,
    canvasHeight: 600,
  };

  it("es monotono: a mayor imageScale mayor tamaño en todo el rango", () => {
    const peque = computeImageWatermarkSizeFromScale({ ...base, imageScale: 20 });
    const medio = computeImageWatermarkSizeFromScale({ ...base, imageScale: 50 });
    const grande = computeImageWatermarkSizeFromScale({ ...base, imageScale: 100 });
    expect(medio.height).toBeGreaterThan(peque.height);
    expect(grande.height).toBeGreaterThan(medio.height);
    expect(medio.width).toBeGreaterThan(peque.width);
    expect(grande.width).toBeGreaterThan(medio.width);
  });

  it("al 100 % un logo cuadrado alcanza justo el techo del patron", () => {
    // Techo por defecto (marca unica): 0.6 * lado menor (600) = 360.
    const size = computeImageWatermarkSizeFromScale({ ...base, imageScale: 100 });
    expect(size.height).toBeCloseTo(0.6 * 600, 5);
    expect(size.width).toBeCloseTo(0.6 * 600, 5);
  });

  it("un logo apaisado queda limitado por el ancho disponible", () => {
    // Logo 4:1: al 100 % pediria 1440x360, pero el ancho maximo es 800*0.6=480.
    const size = computeImageWatermarkSizeFromScale({
      naturalWidth: 400,
      naturalHeight: 100,
      canvasWidth: 800,
      canvasHeight: 600,
      imageScale: 100,
    });
    expect(size.width).toBeLessThanOrEqual(800 * 0.6 + 1e-9);
    expect(size.width / size.height).toBeCloseTo(4, 2);
  });

  it("usa el techo de mosaico cuando se indica la fraccion reducida", () => {
    const size = computeImageWatermarkSizeFromScale({
      ...base,
      imageScale: 100,
      maxFraction: IMAGE_TILED_CANVAS_FRACTION,
    });
    expect(size.height).toBeCloseTo(0.25 * 600, 5);
  });

  it("sin maxFraction explicito aplica el techo de marca unica (0.6)", () => {
    const size = computeImageWatermarkSizeFromScale({ ...base, imageScale: 50 });
    expect(size.height).toBeCloseTo(0.5 * 0.6 * 600, 5);
  });

  it("devuelve dimensiones cero si la imagen es invalida", () => {
    expect(
      computeImageWatermarkSizeFromScale({ ...base, naturalWidth: 0, imageScale: 100 }),
    ).toEqual({ width: 0, height: 0 });
  });

  it("es monotono incluso con logo apaisado en mosaico (regresion del slider)", () => {
    // Logo 4:1 en mosaico (techo 0.25): con un alto objetivo fijo el clamp de
    // ancho colapsaba todo el rango alto del slider al mismo tamaño.
    const wide = {
      naturalWidth: 400,
      naturalHeight: 100,
      canvasWidth: 400,
      canvasHeight: 400,
      maxFraction: IMAGE_TILED_CANVAS_FRACTION,
    };
    const s25 = computeImageWatermarkSizeFromScale({ ...wide, imageScale: 25 });
    const s50 = computeImageWatermarkSizeFromScale({ ...wide, imageScale: 50 });
    const s100 = computeImageWatermarkSizeFromScale({ ...wide, imageScale: 100 });
    expect(s50.width).toBeGreaterThan(s25.width);
    expect(s100.width).toBeGreaterThan(s50.width);
    // Nunca desborda la caja techo.
    expect(s100.width).toBeLessThanOrEqual(400 * IMAGE_TILED_CANVAS_FRACTION + 1e-9);
    expect(s100.height).toBeLessThanOrEqual(400 * IMAGE_TILED_CANVAS_FRACTION + 1e-9);
  });
});
