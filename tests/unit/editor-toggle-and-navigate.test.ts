import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { editor } from "../../src/lib/state/editor.svelte";

// Construye un File PDF en blanco con n paginas (mismo helper usado en otros tests).
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

function resetEditor(): void {
  for (const f of [...editor.files]) {
    editor.removeFile(f.id);
  }
}

describe("regresion bug B: navegar no debe alterar selectedPages", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("setPreviewPage no toca selectedPages bajo ninguna circunstancia", async () => {
    const pdf = await buildBlankPdfFile(5);
    const { accepted } = await editor.addFiles([pdf]);
    const fileId = accepted[0]!.id;

    // Estado inicial: todas las paginas seleccionadas.
    const initial = editor.files.find((f) => f.id === fileId)!.selectedPages;
    expect(initial).toEqual([1, 2, 3, 4, 5]);

    // Navegar a varias paginas no debe modificar selectedPages.
    editor.setPreviewPage(fileId, 3);
    expect(editor.files.find((f) => f.id === fileId)!.selectedPages).toEqual([1, 2, 3, 4, 5]);

    editor.setPreviewPage(fileId, 1);
    expect(editor.files.find((f) => f.id === fileId)!.selectedPages).toEqual([1, 2, 3, 4, 5]);

    editor.setPreviewPage(fileId, 5);
    expect(editor.files.find((f) => f.id === fileId)!.selectedPages).toEqual([1, 2, 3, 4, 5]);
  });

  it("togglePage si modifica selectedPages, dejando previewPage intacto", async () => {
    const pdf = await buildBlankPdfFile(4);
    const { accepted } = await editor.addFiles([pdf]);
    const fileId = accepted[0]!.id;

    editor.setPreviewPage(fileId, 2);
    expect(editor.getPreviewPage(fileId)).toBe(2);

    editor.togglePage(fileId, 3);
    expect(editor.files.find((f) => f.id === fileId)!.selectedPages).toEqual([1, 2, 4]);
    // La pagina visible no cambia al desmarcar otra.
    expect(editor.getPreviewPage(fileId)).toBe(2);

    editor.togglePage(fileId, 3);
    expect(editor.files.find((f) => f.id === fileId)!.selectedPages).toEqual([1, 2, 3, 4]);
    expect(editor.getPreviewPage(fileId)).toBe(2);
  });
});
