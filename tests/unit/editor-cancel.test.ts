/**
 * Tests de cancelación de lotes, bloqueo de mutaciones durante el
 * procesamiento, "quitar todo", tope de pasos del lote personalizado y
 * guardado inmediato de la imagen de marca.
 *
 * Los motores PDF/imagen se mockean: lo que se fija aquí es el comportamiento
 * del store (cancelRequested, snapshots, aislamiento por archivo), no el
 * render real, que ya tiene sus propios tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { editor } from "../../src/lib/state/editor.svelte";
import { LIMITS } from "../../src/lib/watermark/types";

function resetEditor(): void {
  for (const f of [...editor.files]) {
    editor.removeFile(f.id);
  }
  editor.disableBatch();
  editor.resetConfig();
  editor.fatalErrorCode = null;
}

function buildImage(name: string): File {
  return new File(["x"], name, { type: "image/png" });
}

// Mockea el motor de imagen con la implementacion dada y devuelve el spy.
function mockImageEngine(
  impl: (file: File, config: { text: string }) => Promise<Blob>,
) {
  const spy = vi.fn(impl);
  vi.doMock("../../src/lib/watermark/image", async (orig) => {
    const original = await orig<typeof import("../../src/lib/watermark/image")>();
    return { ...original, applyWatermarkToImage: spy };
  });
  return spy;
}

describe("cancelación de runBatch", () => {
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

  it("cancel() sin procesamiento en curso es un no-op", () => {
    editor.cancel();
    expect(editor.cancelRequested).toBe(false);
    expect(editor.isCancelling).toBe(false);
  });

  it("cancelar a mitad corta el lote: procesados conservan resultado, el resto queda pending", async () => {
    mockImageEngine(async () => {
      // Pedimos la cancelacion desde el primer archivo procesado: el runner
      // la atiende al terminar el paso en curso, antes del siguiente.
      editor.cancel();
      return new Blob(["img"], { type: "image/png" });
    });
    const downloadSpy = vi.fn();
    vi.doMock("../../src/lib/zip", () => ({ downloadResults: downloadSpy }));

    await editor.addFiles([buildImage("a.png"), buildImage("b.png"), buildImage("c.png")]);
    editor.updateConfig({ text: "MARCA" });
    await editor.runBatch();

    expect(editor.isProcessing).toBe(false);
    expect(editor.cancelRequested).toBe(false);
    expect(editor.progress).toEqual({ current: 0, total: 0 });
    expect(editor.fatalErrorCode).toBeNull();
    // Sin descarga al cancelar.
    expect(downloadSpy).not.toHaveBeenCalled();
    // Solo el primero llego a procesarse; los demas quedan pendientes.
    expect(editor.files[0]!.status).toBe("done");
    expect(editor.files[1]!.status).toBe("pending");
    expect(editor.files[2]!.status).toBe("pending");
  });

  it("bloquea addFiles, removeFile y removeAllFiles mientras procesa", async () => {
    // Puerta de control: el motor no responde hasta que el test lo permita,
    // asi el lote se queda en vuelo de forma determinista.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockImageEngine(async () => {
      await gate;
      return new Blob(["img"], { type: "image/png" });
    });
    vi.doMock("file-saver", () => ({ saveAs: vi.fn() }));

    await editor.addFiles([buildImage("a.png")]);
    editor.updateConfig({ text: "MARCA" });
    const run = editor.runBatch();
    // runBatch fija isProcessing de forma sincrona, antes de su primer await.
    expect(editor.isProcessing).toBe(true);

    const result = await editor.addFiles([buildImage("b.png")]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
    expect(editor.files).toHaveLength(1);

    editor.removeFile(editor.files[0]!.id);
    expect(editor.files).toHaveLength(1);

    editor.removeAllFiles();
    expect(editor.files).toHaveLength(1);

    release();
    await run;
    expect(editor.isProcessing).toBe(false);
    expect(editor.files[0]!.status).toBe("done");
  });
});

describe("removeAllFiles", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("vacía la lista y resetea progreso y error fatal", async () => {
    await editor.addFiles([buildImage("a.png"), buildImage("b.png")]);
    editor.updateConfig({ text: "MARCA" });
    editor.fatalErrorCode = "fatalPackagingFailure";

    editor.removeAllFiles();

    expect(editor.files).toEqual([]);
    expect(editor.activeFileId).toBeNull();
    expect(editor.progress).toEqual({ current: 0, total: 0 });
    expect(editor.fatalErrorCode).toBeNull();
  });

  it("con la lista vacía es un no-op inofensivo", () => {
    editor.removeAllFiles();
    expect(editor.files).toEqual([]);
    expect(editor.activeFileId).toBeNull();
  });
});

describe("runWatermarkBatchPersonalized: tope de pasos y aislamiento por archivo", () => {
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

  it("aborta con 'batchTooManySteps' si archivos × nombres supera el tope", async () => {
    const imageSpy = mockImageEngine(async () => new Blob(["img"]));
    const files = Array.from({ length: 11 }, (_, i) => buildImage(`img-${i}.png`));
    await editor.addFiles(files);
    const names = Array.from({ length: 50 }, (_, i) => `Nombre ${i + 1}`).join("\n");
    editor.setBatchRawText(names);
    editor.enableBatch();
    editor.updateConfig({ text: "MARCA" });

    // 11 × 50 = 550 > LIMITS.maxBatchSteps (500): aborta antes de procesar.
    expect(11 * 50).toBeGreaterThan(LIMITS.maxBatchSteps);
    await editor.runWatermarkBatchPersonalized();

    expect(editor.fatalErrorCode).toBe("batchTooManySteps");
    expect(editor.isProcessing).toBe(false);
    expect(imageSpy).not.toHaveBeenCalled();
  });

  it("un archivo malo no aborta el lote: se marca en su FileItem y el ZIP sale con lo bueno", async () => {
    mockImageEngine(async (file: File) => {
      if (file.name === "bad.png") throw new Error("boom");
      return new Blob([`img:${file.name}`], { type: "image/png" });
    });
    let savedBlob: Blob | null = null;
    vi.doMock("file-saver", () => ({
      saveAs: (blob: Blob) => {
        savedBlob = blob;
      },
    }));

    await editor.addFiles([buildImage("good.png"), buildImage("bad.png")]);
    editor.setBatchRawText("Ana\nLuis\n");
    editor.enableBatch();
    editor.updateConfig({ text: "MARCA" });
    await editor.runWatermarkBatchPersonalized();

    // Fallo parcial: sin error fatal y con ZIP generado.
    expect(editor.fatalErrorCode).toBeNull();
    expect(savedBlob).not.toBeNull();

    const bad = editor.files.find((f) => f.file.name === "bad.png")!;
    expect(bad.status).toBe("error");
    expect(bad.errorCode).toBe("unknown");
    const good = editor.files.find((f) => f.file.name === "good.png")!;
    expect(good.status).not.toBe("error");

    const zip = await JSZip.loadAsync(await savedBlob!.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toContain("ana/good-watermarked.png");
    expect(names).toContain("luis/good-watermarked.png");
    expect(names).not.toContain("ana/bad-watermarked.png");
    expect(names).not.toContain("luis/bad-watermarked.png");

    // El manifest solo lista los archivos que realmente se generaron.
    const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Array<{
      name: string;
      files: string[];
    }>;
    for (const entry of manifest) {
      expect(entry.files).toEqual(["good-watermarked.png"]);
    }
  });

  it("si TODO falla, fatalErrorCode 'fatalNothingProcessed' y no hay ZIP", async () => {
    mockImageEngine(async () => {
      throw new Error("boom");
    });
    const saveAsSpy = vi.fn();
    vi.doMock("file-saver", () => ({ saveAs: saveAsSpy }));

    await editor.addFiles([buildImage("a.png")]);
    editor.setBatchRawText("Ana\nLuis\n");
    editor.enableBatch();
    editor.updateConfig({ text: "MARCA" });
    await editor.runWatermarkBatchPersonalized();

    expect(editor.fatalErrorCode).toBe("fatalNothingProcessed");
    expect(saveAsSpy).not.toHaveBeenCalled();
    expect(editor.isProcessing).toBe(false);
    expect(editor.files[0]!.status).toBe("error");
  });

  it("cancelar entre nombres corta el lote sin empaquetar y resetea el progreso", async () => {
    mockImageEngine(async () => {
      // La cancelacion se pide dentro del primer paso: el runner la atiende
      // entre archivos y entre nombres.
      editor.cancel();
      return new Blob(["img"], { type: "image/png" });
    });
    const saveAsSpy = vi.fn();
    vi.doMock("file-saver", () => ({ saveAs: saveAsSpy }));

    await editor.addFiles([buildImage("a.png"), buildImage("b.png")]);
    editor.setBatchRawText("Ana\nLuis\n");
    editor.enableBatch();
    editor.updateConfig({ text: "MARCA" });
    await editor.runWatermarkBatchPersonalized();

    expect(editor.isProcessing).toBe(false);
    expect(editor.cancelRequested).toBe(false);
    expect(editor.fatalErrorCode).toBeNull();
    expect(editor.progress).toEqual({ current: 0, total: 0 });
    expect(saveAsSpy).not.toHaveBeenCalled();
  });
});

describe("persistencia de la imagen de marca", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEditor();
  });
  afterEach(() => {
    resetEditor();
    localStorage.clear();
  });

  it("setWatermarkImage guarda en localStorage de inmediato, sin debounce", () => {
    const dataUrl = "data:image/png;base64,QUJD";
    editor.setWatermarkImage(dataUrl);
    // Lectura sincrona: el guardado no espera al timer del efecto de
    // persistencia, asi la imagen sobrevive a un cierre inmediato de pestaña.
    const raw = localStorage.getItem("watermark.config.v1");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).imageDataUrl).toBe(dataUrl);
  });
});
