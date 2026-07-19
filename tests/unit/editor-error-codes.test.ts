/**
 * Tests del contrato de códigos de error del store.
 *
 * El store nunca guarda cadenas de un idioma: emite códigos estables
 * (`FileErrorCode` / `FatalErrorCode`) y la UI los traduce con las claves
 * `errors.*` de i18n. Aquí fijamos ese contrato para `addFiles`, `runBatch`
 * y `runWatermarkBatchPersonalized`, incluidas las puertas de validación
 * (validateConfig y WinAnsi) que abortan antes de procesar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { editor } from "../../src/lib/state/editor.svelte";
import { LIMITS, WatermarkError } from "../../src/lib/watermark/types";

// Construye un PDF minimo con un dictionary /Encrypt en el trailer (mismo
// fixture que pdf-metadata.test.ts): pdf-lib lo detecta como cifrado.
function buildEncryptedPdfFile(): File {
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /Filter /Standard /V 1 /R 2 /O <0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF> /U <FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210> /P -4 >>
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000111 00000 n
0000000170 00000 n
trailer
<< /Size 5 /Root 1 0 R /Encrypt 4 0 R /ID [<11111111111111111111111111111111> <22222222222222222222222222222222>] >>
startxref
334
%%EOF`;
  const bytes = new TextEncoder().encode(pdf);
  return new File([bytes], "encrypted.pdf", { type: "application/pdf" });
}

function resetEditor(): void {
  for (const f of [...editor.files]) {
    editor.removeFile(f.id);
  }
  editor.disableBatch();
  editor.resetConfig();
  editor.fatalErrorCode = null;
}

describe("addFiles emite códigos de rechazo, no cadenas", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("rechaza formatos no admitidos con 'formatRejected'", async () => {
    const file = new File(["hola"], "notas.txt", { type: "text/plain" });
    const { accepted, rejected } = await editor.addFiles([file]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.code).toBe("formatRejected");
  });

  it("rechaza archivos que superan el tamaño máximo con 'fileTooLarge'", async () => {
    const file = new File(["x"], "grande.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: LIMITS.MAX_FILE_SIZE_BYTES + 1 });
    const { accepted, rejected } = await editor.addFiles([file]);
    expect(accepted).toHaveLength(0);
    expect(rejected[0]!.code).toBe("fileTooLarge");
  });

  it("rechaza con 'limitBatch' cuando el lote está lleno", async () => {
    const files = Array.from(
      { length: LIMITS.MAX_FILES_PER_BATCH + 1 },
      (_, i) => new File(["x"], `img-${i}.png`, { type: "image/png" }),
    );
    const { accepted, rejected } = await editor.addFiles(files);
    expect(accepted).toHaveLength(LIMITS.MAX_FILES_PER_BATCH);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.code).toBe("limitBatch");
  });

  it("acepta un PDF protegido pero lo marca con errorCode 'pdfProtected'", async () => {
    const { accepted, rejected } = await editor.addFiles([buildEncryptedPdfFile()]);
    expect(rejected).toHaveLength(0);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]!.status).toBe("error");
    expect(accepted[0]!.errorCode).toBe("pdfProtected");
  });

  it("rechaza un PDF dañado con 'pdfDamaged'", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], "bad.pdf", {
      type: "application/pdf",
    });
    const { accepted, rejected } = await editor.addFiles([file]);
    expect(accepted).toHaveLength(0);
    expect(rejected[0]!.code).toBe("pdfDamaged");
  });
});

describe("runBatch: puerta de validación y mapeo de errores del motor", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
    vi.resetModules();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("aborta con fatalErrorCode 'invalidConfig' si la config no es válida", async () => {
    await editor.addFiles([new File(["x"], "a.png", { type: "image/png" })]);
    editor.updateConfig({ text: "MARCA", fontSize: 999 });
    await editor.runBatch();
    expect(editor.fatalErrorCode).toBe("invalidConfig");
    expect(editor.isProcessing).toBe(false);
    // No se ha tocado ningún archivo.
    expect(editor.files[0]!.status).toBe("pending");
  });

  it("mapea un WatermarkError del motor al errorCode del archivo", async () => {
    vi.doMock("../../src/lib/watermark/image", async (orig) => {
      const original = await orig<typeof import("../../src/lib/watermark/image")>();
      return {
        ...original,
        applyWatermarkToImage: vi.fn(async () => {
          throw new WatermarkError("PARSE_ERROR", "boom");
        }),
      };
    });
    await editor.addFiles([new File(["x"], "a.png", { type: "image/png" })]);
    editor.updateConfig({ text: "MARCA" });
    await editor.runBatch();
    expect(editor.files[0]!.status).toBe("error");
    expect(editor.files[0]!.errorCode).toBe("pdfDamaged");
    expect(editor.fatalErrorCode).toBe("fatalNothingProcessed");
  });

  it("mapea un error ajeno a WatermarkError al código genérico 'unknown'", async () => {
    vi.doMock("../../src/lib/watermark/image", async (orig) => {
      const original = await orig<typeof import("../../src/lib/watermark/image")>();
      return {
        ...original,
        applyWatermarkToImage: vi.fn(async () => {
          throw new Error("WinAnsiEncoding cannot encode '🔒'");
        }),
      };
    });
    await editor.addFiles([new File(["x"], "a.png", { type: "image/png" })]);
    editor.updateConfig({ text: "MARCA" });
    await editor.runBatch();
    expect(editor.files[0]!.status).toBe("error");
    expect(editor.files[0]!.errorCode).toBe("unknown");
    expect(editor.fatalErrorCode).toBe("fatalNothingProcessed");
  });
});

describe("runWatermarkBatchPersonalized: validación previa al procesado", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
    vi.resetModules();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("aborta con 'invalidConfig' si la config no es válida", async () => {
    await editor.addFiles([new File(["x"], "a.png", { type: "image/png" })]);
    editor.setBatchRawText("Juan\n");
    editor.enableBatch();
    editor.updateConfig({ text: "Juan", fontSize: 999 });
    await editor.runWatermarkBatchPersonalized();
    expect(editor.fatalErrorCode).toBe("invalidConfig");
    expect(editor.isProcessing).toBe(false);
  });

  it("aborta con 'textNotEncodable' si algún nombre no es WinAnsi", async () => {
    await editor.addFiles([new File(["x"], "a.png", { type: "image/png" })]);
    editor.setBatchRawText("Juan 😀\nMaría\n");
    editor.enableBatch();
    editor.updateConfig({ text: "María" });
    await editor.runWatermarkBatchPersonalized();
    expect(editor.fatalErrorCode).toBe("textNotEncodable");
    expect(editor.isProcessing).toBe(false);
  });

  it("acepta nombres con tildes y ñ (WinAnsi) sin abortar por codificación", async () => {
    const imgMock = vi.fn(async () => new Blob(["img"], { type: "image/png" }));
    vi.doMock("../../src/lib/watermark/image", async (orig) => {
      const original = await orig<typeof import("../../src/lib/watermark/image")>();
      return { ...original, applyWatermarkToImage: imgMock };
    });
    vi.doMock("file-saver", () => ({ saveAs: vi.fn() }));

    await editor.addFiles([new File(["x"], "a.png", { type: "image/png" })]);
    editor.setBatchRawText("José Núñez\nMaría €uro\n");
    editor.enableBatch();
    editor.updateConfig({ text: "José Núñez" });
    await editor.runWatermarkBatchPersonalized();
    expect(editor.fatalErrorCode).toBeNull();
    expect(imgMock).toHaveBeenCalledTimes(2);
  });
});
