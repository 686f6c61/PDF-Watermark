import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, type WatermarkConfig } from "../../src/lib/watermark/types";
import { isWinAnsiEncodable, validateConfig } from "../../src/lib/state/validation";

function configWith(overrides: Partial<WatermarkConfig>): WatermarkConfig {
  return { ...DEFAULT_CONFIG, text: "Confidencial", ...overrides };
}

describe("validateConfig", () => {
  it("acepta una configuracion correcta", () => {
    const result = validateConfig(configWith({}));
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  describe("texto", () => {
    it("rechaza texto vacio", () => {
      const result = validateConfig(configWith({ text: "" }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "text")).toBe(true);
    });

    it("rechaza texto solo con espacios", () => {
      const result = validateConfig(configWith({ text: "   " }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "text")).toBe(true);
    });

    it("rechaza texto de mas de 60 caracteres", () => {
      const result = validateConfig(configWith({ text: "a".repeat(61) }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "text")).toBe(true);
    });

    it("acepta exactamente 60 caracteres", () => {
      const result = validateConfig(configWith({ text: "a".repeat(60) }));
      expect(result.ok).toBe(true);
    });
  });

  describe("fontSize", () => {
    it("rechaza tamaño menor que 12", () => {
      const result = validateConfig(configWith({ fontSize: 11 }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "fontSize")).toBe(true);
    });

    it("rechaza tamaño mayor que 120", () => {
      const result = validateConfig(configWith({ fontSize: 121 }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "fontSize")).toBe(true);
    });

    it("acepta los limites 12 y 120", () => {
      expect(validateConfig(configWith({ fontSize: 12 })).ok).toBe(true);
      expect(validateConfig(configWith({ fontSize: 120 })).ok).toBe(true);
    });
  });

  describe("opacity", () => {
    it("rechaza opacidad menor que 0.05", () => {
      const result = validateConfig(configWith({ opacity: 0.04 }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "opacity")).toBe(true);
    });

    it("rechaza opacidad mayor que 1.0", () => {
      const result = validateConfig(configWith({ opacity: 1.01 }));
      expect(result.ok).toBe(false);
    });

    it("acepta 0.05 y 1.0", () => {
      expect(validateConfig(configWith({ opacity: 0.05 })).ok).toBe(true);
      expect(validateConfig(configWith({ opacity: 1.0 })).ok).toBe(true);
    });
  });

  describe("rotation", () => {
    it("rechaza rotacion fuera de [-180, 180]", () => {
      expect(validateConfig(configWith({ rotation: -181 })).ok).toBe(false);
      expect(validateConfig(configWith({ rotation: 181 })).ok).toBe(false);
    });

    it("acepta los extremos -180 y 180", () => {
      expect(validateConfig(configWith({ rotation: -180 })).ok).toBe(true);
      expect(validateConfig(configWith({ rotation: 180 })).ok).toBe(true);
    });
  });

  describe("density", () => {
    it("rechaza densidad menor que 1 cuando aplica", () => {
      const result = validateConfig(configWith({ pattern: "diagonal", density: 0 }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "density")).toBe(true);
    });

    it("rechaza densidad mayor que 10 cuando aplica", () => {
      const result = validateConfig(configWith({ pattern: "spiral", density: 11 }));
      expect(result.ok).toBe(false);
    });

    it("ignora la densidad cuando el patron es single-center", () => {
      const result = validateConfig(configWith({ pattern: "single-center", density: 99 }));
      expect(result.ok).toBe(true);
    });

    it("ignora la densidad cuando el patron es corner", () => {
      const result = validateConfig(configWith({ pattern: "corner", density: -5 }));
      expect(result.ok).toBe(true);
    });
  });

  describe("color", () => {
    it("rechaza colores que no son hex de 6 digitos", () => {
      expect(validateConfig(configWith({ color: "rojo" })).ok).toBe(false);
      expect(validateConfig(configWith({ color: "#fff" })).ok).toBe(false);
      expect(validateConfig(configWith({ color: "#GGGGGG" })).ok).toBe(false);
    });

    it("acepta hex en mayusculas y minusculas", () => {
      expect(validateConfig(configWith({ color: "#abcdef" })).ok).toBe(true);
      expect(validateConfig(configWith({ color: "#ABCDEF" })).ok).toBe(true);
      expect(validateConfig(configWith({ color: "#000000" })).ok).toBe(true);
    });
  });

  describe("pattern y fontFamily", () => {
    it("rechaza valores fuera del enum", () => {
      // @ts-expect-error testeamos coercion
      expect(validateConfig(configWith({ pattern: "rombos" })).ok).toBe(false);
      // @ts-expect-error testeamos coercion
      expect(validateConfig(configWith({ fontFamily: "comic" })).ok).toBe(false);
    });

    it("acepta los cuatro patrones", () => {
      expect(validateConfig(configWith({ pattern: "diagonal" })).ok).toBe(true);
      expect(validateConfig(configWith({ pattern: "single-center" })).ok).toBe(true);
      expect(validateConfig(configWith({ pattern: "corner" })).ok).toBe(true);
      expect(validateConfig(configWith({ pattern: "spiral" })).ok).toBe(true);
    });
  });

  describe("imageDataUrl como marca de agua", () => {
    it("acepta config sin texto siempre que haya imageDataUrl valido", () => {
      const result = validateConfig(
        configWith({ text: "", imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" }),
      );
      expect(result.ok).toBe(true);
    });

    it("rechaza si no hay ni texto ni imageDataUrl", () => {
      const result = validateConfig(configWith({ text: "", imageDataUrl: null }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "text")).toBe(true);
    });

    it("rechaza imageDataUrl que no sea data URL de PNG o WebP", () => {
      const result = validateConfig(
        configWith({ imageDataUrl: "data:image/jpeg;base64,abc" }),
      );
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "imageDataUrl")).toBe(true);
    });

    it("acepta data URL de WebP", () => {
      const result = validateConfig(
        configWith({ imageDataUrl: "data:image/webp;base64,UklGRg==" }),
      );
      expect(result.ok).toBe(true);
    });

    it("ignora imageDataUrl si vale null o undefined (ningun error nuevo)", () => {
      expect(validateConfig(configWith({ imageDataUrl: null })).ok).toBe(true);
      expect(validateConfig(configWith({ imageDataUrl: undefined })).ok).toBe(true);
    });
  });

  describe("texto codificable en WinAnsi (fuentes estandar de pdf-lib)", () => {
    it("rechaza texto con emoji", () => {
      const result = validateConfig(configWith({ text: "Confidencial 🔒" }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "text")).toBe(true);
    });

    it("rechaza texto con caracteres CJK, cirilico o arabe", () => {
      expect(validateConfig(configWith({ text: "机密" })).ok).toBe(false);
      expect(validateConfig(configWith({ text: "Секретно" })).ok).toBe(false);
      expect(validateConfig(configWith({ text: "سري" })).ok).toBe(false);
    });

    it("acepta tildes, ñ y simbolos Latin-1", () => {
      expect(validateConfig(configWith({ text: "José Núñez — señoría ©" })).ok).toBe(true);
    });

    it("acepta los simbolos WinAnsi frecuentes fuera de Latin-1", () => {
      expect(validateConfig(configWith({ text: "Precio 5€ • borrador – ok — “si” … ™" })).ok).toBe(
        true,
      );
    });

    it("la regla no aplica cuando el texto esta vacio y hay imagen", () => {
      const result = validateConfig(
        configWith({ text: "", imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" }),
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("isWinAnsiEncodable", () => {
    it("acepta ASCII imprimible y Latin-1", () => {
      expect(isWinAnsiEncodable("Confidencial")).toBe(true);
      expect(isWinAnsiEncodable("ñÑ áéíóú üÜ çÇ ¿? ¡!")).toBe(true);
    });

    it("rechaza emoji y alfabetos no latinos", () => {
      expect(isWinAnsiEncodable("a😀b")).toBe(false);
      expect(isWinAnsiEncodable("日本語")).toBe(false);
    });

    it("rechaza caracteres de control distintos del salto de linea", () => {
      expect(isWinAnsiEncodable("con\ttabulador")).toBe(false);
      expect(isWinAnsiEncodable("con\rcarriage")).toBe(false);
    });

    it("acepta el salto de linea como separador (texto multi-linea)", () => {
      expect(isWinAnsiEncodable("con\nsalto")).toBe(true);
    });
  });

  describe("texto multi-linea", () => {
    it("acepta dos lineas sencillas", () => {
      expect(validateConfig(configWith({ text: "LINEA1\nLINEA2" })).ok).toBe(true);
    });

    it("acepta tildes y ñ repartidas en varias lineas", () => {
      expect(validateConfig(configWith({ text: "José\nNúñez\nseñoría" })).ok).toBe(true);
    });

    it("acepta exactamente 3 lineas", () => {
      expect(validateConfig(configWith({ text: "a\nb\nc" })).ok).toBe(true);
    });

    it("rechaza 4 lineas con el error tooManyLines", () => {
      const result = validateConfig(configWith({ text: "a\nb\nc\nd" }));
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.field === "text" && e.code === "tooManyLines"),
      ).toBe(true);
    });

    it("rechaza un emoji aunque este solo en una de las lineas", () => {
      const result = validateConfig(configWith({ text: "linea uno\n🔒" }));
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => e.field === "text" && e.code !== "tooManyLines"),
      ).toBe(true);
    });

    it("mantiene el limite de 60 caracteres totales contando los saltos", () => {
      const result = validateConfig(
        configWith({ text: `${"a".repeat(30)}\n${"b".repeat(31)}` }),
      );
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "text")).toBe(true);
    });
  });

  describe("robustez numerica (NaN / Infinity / gigantes)", () => {
    it("rechaza NaN en cualquier numerico aunque pase las comparaciones", () => {
      expect(validateConfig(configWith({ fontSize: NaN })).ok).toBe(false);
      expect(validateConfig(configWith({ opacity: NaN })).ok).toBe(false);
      expect(validateConfig(configWith({ rotation: NaN })).ok).toBe(false);
    });

    it("rechaza densidad NaN incluso en patrones que ignoran la densidad", () => {
      expect(validateConfig(configWith({ pattern: "single-center", density: NaN })).ok).toBe(false);
    });

    it("rechaza densidad gigante cuando el patron la usa", () => {
      const result = validateConfig(configWith({ pattern: "spiral", density: 1e9 }));
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.field === "density")).toBe(true);
    });

    it("rechaza Infinity en fontSize", () => {
      expect(validateConfig(configWith({ fontSize: Infinity })).ok).toBe(false);
    });

    it("rechaza customPosition con NaN o fuera de [0, 1]", () => {
      expect(validateConfig(configWith({ customPosition: { x: NaN, y: 0.5 } })).ok).toBe(false);
      expect(validateConfig(configWith({ customPosition: { x: 2, y: 0.5 } })).ok).toBe(false);
      expect(validateConfig(configWith({ customPosition: { x: 0.5, y: -0.1 } })).ok).toBe(false);
    });

    it("acepta customPosition valida", () => {
      expect(validateConfig(configWith({ customPosition: { x: 0.25, y: 0.75 } })).ok).toBe(true);
    });
  });
});
