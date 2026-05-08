/**
 * Tests del estado de lote del editor.
 *
 * Cubre la API pública relacionada con el modo lote en `editor.svelte.ts`:
 *   - `setBatchRawText`: parsea y guarda los nombres a partir del raw input.
 *   - `enableBatch` / `disableBatch`: activa o desactiva el modo lote.
 *   - El estado `batchState` no se persiste en localStorage (privacidad).
 *
 * El método de procesamiento `runWatermarkBatchPersonalized` se valida con
 * mocks de los motores PDF/imagen y verificando que el ZIP final contiene la
 * estructura esperada (carpetas por slug + manifest.json en raíz).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { editor } from "../../src/lib/state/editor.svelte";

function resetEditor(): void {
  for (const f of [...editor.files]) {
    editor.removeFile(f.id);
  }
  editor.disableBatch();
}

describe("setBatchRawText", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("guarda el raw text exacto en batchState", () => {
    const raw = "Juan Pérez\nMaría Gómez\n";
    editor.setBatchRawText(raw);
    expect(editor.batchState.rawText).toBe(raw);
  });

  it("parsea los nombres y los guarda limpios en batchState.names", () => {
    editor.setBatchRawText("# comentario\nJuan Pérez\n\nMaría Gómez\n");
    expect(editor.batchState.names).toEqual(["Juan Pérez", "María Gómez"]);
  });

  it("expone los warnings detectados al parsear", () => {
    editor.setBatchRawText("Juan Pérez\nJuan Pérez\n");
    expect(editor.batchState.warnings).toContain("duplicates");
  });
});

describe("enableBatch / disableBatch", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("enableBatch activa el flag y disableBatch lo desactiva", () => {
    expect(editor.batchState.enabled).toBe(false);
    editor.enableBatch();
    expect(editor.batchState.enabled).toBe(true);
    editor.disableBatch();
    expect(editor.batchState.enabled).toBe(false);
  });

  it("disableBatch limpia rawText y names", () => {
    editor.setBatchRawText("Juan\nMaria\n");
    editor.enableBatch();
    editor.disableBatch();
    expect(editor.batchState.rawText).toBe("");
    expect(editor.batchState.names).toEqual([]);
  });
});

describe("privacidad: el estado del lote no se persiste", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("setBatchRawText no escribe nombres en localStorage", () => {
    editor.setBatchRawText("Empleado Confidencial\nOtroEmpleado\n");
    const dump = JSON.stringify(localStorage);
    expect(dump).not.toContain("Empleado Confidencial");
    expect(dump).not.toContain("OtroEmpleado");
  });

  it("disableBatch limpia config.text si tenia un nombre del lote", () => {
    editor.setBatchRawText("Confidencial X\n");
    editor.enableBatch();
    editor.updateConfig({ text: "Confidencial X" });
    editor.disableBatch();
    expect(editor.config.text).toBe("");
  });
});

describe("runWatermarkBatchPersonalized", () => {
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

  it("genera un ZIP con una carpeta slug por nombre y un manifest.json en raíz", async () => {
    // Mocks de motores: devuelven un blob trivial cuyo contenido refleja el
    // texto de la marca (asi podemos verificar que cada PDF/imagen recibe
    // el nombre correcto). No probamos el motor real aquí: ya tiene tests.
    const pdfMock = vi.fn(async (_file: File, config: { text: string }) => {
      return new Blob([`pdf:${config.text}`], { type: "application/pdf" });
    });
    const imgMock = vi.fn(async (_file: File, config: { text: string }) => {
      return new Blob([`img:${config.text}`], { type: "image/png" });
    });
    vi.doMock("../../src/lib/watermark/pdf", async (orig) => {
      const original = await orig<typeof import("../../src/lib/watermark/pdf")>();
      return { ...original, applyWatermarkToPdf: pdfMock };
    });
    vi.doMock("../../src/lib/watermark/image", async (orig) => {
      const original = await orig<typeof import("../../src/lib/watermark/image")>();
      return { ...original, applyWatermarkToImage: imgMock };
    });

    // Capturamos el blob final que se enviaria a saveAs en lugar de
    // descargarlo de verdad.
    let savedBlob: Blob | null = null;
    let savedName: string | null = null;
    vi.doMock("file-saver", () => ({
      saveAs: (blob: Blob, name: string) => {
        savedBlob = blob;
        savedName = name;
      },
    }));

    // Anadimos un PDF y una imagen al editor. Los archivos son ficticios
    // (los motores estan mockeados, no leen contenido).
    const fakePdf = new File(["%PDF-fake"], "informe.pdf", { type: "application/pdf" });
    const fakeImg = new File(["binimg"], "logo.png", { type: "image/png" });

    // addFiles para PDF intentaria leer metadatos via pdf-lib; mockeamos esa
    // ruta tambien para no depender del parse real.
    vi.doMock("../../src/lib/watermark/pdf", async (orig) => {
      const original = await orig<typeof import("../../src/lib/watermark/pdf")>();
      return {
        ...original,
        applyWatermarkToPdf: pdfMock,
        readPdfMetadata: async () => ({ ok: true as const, pageCount: 1 }),
      };
    });

    await editor.addFiles([fakePdf, fakeImg]);
    expect(editor.files).toHaveLength(2);

    editor.setBatchRawText("Juan Pérez\nMaría Gómez\n");
    editor.enableBatch();
    editor.updateConfig({ text: "ignorado", color: "#000000" });

    await editor.runWatermarkBatchPersonalized();

    expect(savedBlob).not.toBeNull();
    expect(savedName).toMatch(/^marcas-personalizadas-\d{4}-\d{2}-\d{2}\.zip$/);

    const zip = await JSZip.loadAsync(await savedBlob!.arrayBuffer());
    const names = Object.keys(zip.files).sort();

    // Esperamos: dos carpetas (juan-perez, maria-gomez) cada una con dos
    // archivos (informe-watermarked.pdf, logo-watermarked.png), mas el
    // manifest.json en raíz.
    expect(names).toContain("manifest.json");
    expect(names).toContain("juan-perez/informe-watermarked.pdf");
    expect(names).toContain("juan-perez/logo-watermarked.png");
    expect(names).toContain("maria-gomez/informe-watermarked.pdf");
    expect(names).toContain("maria-gomez/logo-watermarked.png");

    const manifestText = await zip.file("manifest.json")!.async("string");
    const manifest = JSON.parse(manifestText) as Array<{
      name: string;
      folder: string;
      files: string[];
    }>;
    expect(manifest).toHaveLength(2);
    expect(manifest[0]!.name).toBe("Juan Pérez");
    expect(manifest[0]!.folder).toBe("juan-perez");
    expect(manifest[0]!.files.sort()).toEqual([
      "informe-watermarked.pdf",
      "logo-watermarked.png",
    ]);

    // Cada llamada al motor recibió el nombre como texto de marca.
    const pdfCallTexts = pdfMock.mock.calls.map((c) => (c[1] as { text: string }).text);
    expect(pdfCallTexts.sort()).toEqual(["Juan Pérez", "María Gómez"]);
    const imgCallTexts = imgMock.mock.calls.map((c) => (c[1] as { text: string }).text);
    expect(imgCallTexts.sort()).toEqual(["Juan Pérez", "María Gómez"]);
  });

  it("no procesa nada si batchState.enabled es false", async () => {
    const pdfMock = vi.fn();
    const imgMock = vi.fn();
    vi.doMock("../../src/lib/watermark/pdf", () => ({
      applyWatermarkToPdf: pdfMock,
      readPdfMetadata: async () => ({ ok: true as const, pageCount: 1 }),
    }));
    vi.doMock("../../src/lib/watermark/image", () => ({
      applyWatermarkToImage: imgMock,
    }));

    const fakeImg = new File(["x"], "a.png", { type: "image/png" });
    await editor.addFiles([fakeImg]);
    editor.setBatchRawText("Juan\n");
    // No llamamos a enableBatch.

    await editor.runWatermarkBatchPersonalized();
    expect(pdfMock).not.toHaveBeenCalled();
    expect(imgMock).not.toHaveBeenCalled();
  });
});
