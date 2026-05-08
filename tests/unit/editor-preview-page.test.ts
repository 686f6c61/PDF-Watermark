import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { editor } from "../../src/lib/state/editor.svelte";

// Construye un File PDF en blanco con n paginas. Mismo patron usado en pdf-engine.test.ts.
async function buildBlankPdfFile(pageCount: number, name = "doc.pdf"): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([400, 300]);
  }
  const bytes = await doc.save();
  const safeBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new File([safeBuffer], name, { type: "application/pdf" });
}

function buildImageFile(name = "foto.png"): File {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" });
}

// Limpia el singleton entre tests para evitar fugas de estado.
function resetEditor(): void {
  for (const f of [...editor.files]) {
    editor.removeFile(f.id);
  }
}

describe("editor.setPreviewPage / editor.getPreviewPage", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("getPreviewPage devuelve 1 por defecto cuando no se ha llamado a setPreviewPage", async () => {
    const pdf = await buildBlankPdfFile(3);
    const { accepted } = await editor.addFiles([pdf]);
    const fileId = accepted[0]!.id;

    expect(editor.getPreviewPage(fileId)).toBe(1);
  });

  it("getPreviewPage devuelve 1 cuando el fileId es desconocido", () => {
    expect(editor.getPreviewPage("id-inexistente")).toBe(1);
  });

  it("setPreviewPage clampa los valores al rango [1, pageCount]", async () => {
    const pdf = await buildBlankPdfFile(3);
    const { accepted } = await editor.addFiles([pdf]);
    const fileId = accepted[0]!.id;

    editor.setPreviewPage(fileId, 0);
    expect(editor.getPreviewPage(fileId)).toBe(1);

    editor.setPreviewPage(fileId, -5);
    expect(editor.getPreviewPage(fileId)).toBe(1);

    editor.setPreviewPage(fileId, 999);
    expect(editor.getPreviewPage(fileId)).toBe(3);

    editor.setPreviewPage(fileId, 2);
    expect(editor.getPreviewPage(fileId)).toBe(2);
  });

  it("setPreviewPage no hace nada si el archivo no existe", () => {
    editor.setPreviewPage("id-inexistente", 5);
    expect(editor.getPreviewPage("id-inexistente")).toBe(1);
  });

  it("setPreviewPage no hace nada si el archivo es de tipo image", async () => {
    const img = buildImageFile();
    const { accepted } = await editor.addFiles([img]);
    const fileId = accepted[0]!.id;

    editor.setPreviewPage(fileId, 3);
    expect(editor.getPreviewPage(fileId)).toBe(1);
  });

  it("eliminar un archivo limpia su entrada de previewPage", async () => {
    const pdf = await buildBlankPdfFile(5);
    const { accepted } = await editor.addFiles([pdf]);
    const fileId = accepted[0]!.id;

    editor.setPreviewPage(fileId, 4);
    expect(editor.getPreviewPage(fileId)).toBe(4);

    editor.removeFile(fileId);
    expect(editor.getPreviewPage(fileId)).toBe(1);
  });
});
