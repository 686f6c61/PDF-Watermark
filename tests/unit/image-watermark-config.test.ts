import { describe, expect, it } from "vitest";
import {
  computeImageWatermarkSize,
  hasImageWatermark,
  hasTextWatermark,
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
});
