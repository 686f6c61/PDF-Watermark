import { describe, expect, it } from "vitest";
import { shouldRenderWatermark } from "../../src/lib/watermark/preview-decision";
import type { FileItem } from "../../src/lib/watermark/types";

// Stubs minimos para construir un FileItem sin tocar el DOM ni File API.
function pdfItem(overrides: Partial<FileItem> = {}): FileItem {
  return {
    id: "id-pdf",
    file: new File([new Uint8Array()], "doc.pdf", { type: "application/pdf" }),
    type: "pdf",
    pageCount: 5,
    selectedPages: [1, 2, 3, 4, 5],
    previewUrl: "blob:doc",
    status: "pending",
    ...overrides,
  };
}

function imageItem(): FileItem {
  return {
    id: "id-img",
    file: new File([new Uint8Array()], "foto.png", { type: "image/png" }),
    type: "image",
    previewUrl: "blob:foto",
    status: "pending",
  };
}

describe("shouldRenderWatermark", () => {
  it("imagen: siempre devuelve true (no tiene paginas)", () => {
    expect(shouldRenderWatermark(imageItem(), 1)).toBe(true);
  });

  it("pdf con selectedPages que incluye la pagina solicitada: true", () => {
    const file = pdfItem({ selectedPages: [1, 3, 5] });
    expect(shouldRenderWatermark(file, 3)).toBe(true);
  });

  it("pdf con selectedPages que NO incluye la pagina solicitada: false", () => {
    const file = pdfItem({ selectedPages: [1, 5] });
    expect(shouldRenderWatermark(file, 3)).toBe(false);
  });

  it("pdf sin selectedPages definido: true (sin restriccion explicita)", () => {
    const file = pdfItem({ selectedPages: undefined });
    expect(shouldRenderWatermark(file, 2)).toBe(true);
  });

  it("pdf con selectedPages vacio: false en cualquier pagina", () => {
    const file = pdfItem({ selectedPages: [] });
    expect(shouldRenderWatermark(file, 1)).toBe(false);
    expect(shouldRenderWatermark(file, 5)).toBe(false);
  });
});
