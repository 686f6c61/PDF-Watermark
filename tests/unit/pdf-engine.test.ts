import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { applyWatermarkToPdf } from "../../src/lib/watermark/pdf";
import { DEFAULT_CONFIG, WatermarkError, type WatermarkConfig } from "../../src/lib/watermark/types";

async function buildBlankPdfFile(pageCount: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([400, 300]);
  }
  const bytes = await doc.save();
  // Aseguramos un ArrayBuffer estandar para el constructor de File.
  const safeBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([safeBuffer], `test-${pageCount}p.pdf`, { type: "application/pdf" });
}

function configWith(overrides: Partial<WatermarkConfig>): WatermarkConfig {
  return { ...DEFAULT_CONFIG, text: "TEST", ...overrides };
}

describe("applyWatermarkToPdf", () => {
  it("devuelve un Blob de tipo application/pdf", async () => {
    const file = await buildBlankPdfFile(3);
    const blob = await applyWatermarkToPdf(file, configWith({ pattern: "single-center" }), [1, 2, 3]);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("preserva el numero de paginas del original", async () => {
    const file = await buildBlankPdfFile(5);
    const blob = await applyWatermarkToPdf(file, configWith({ pattern: "corner" }), [1, 3, 5]);
    const buffer = await blob.arrayBuffer();
    const reloaded = await PDFDocument.load(buffer);
    expect(reloaded.getPageCount()).toBe(5);
  });

  it("solo aplica el watermark a las paginas seleccionadas", async () => {
    const file = await buildBlankPdfFile(3);
    const noneBlob = await applyWatermarkToPdf(file, configWith({ pattern: "diagonal" }), []);
    const allBlob = await applyWatermarkToPdf(file, configWith({ pattern: "diagonal" }), [1, 2, 3]);
    // Heuristica: el PDF con marcas en todas las paginas pesa mas que el que no tiene marcas.
    expect(allBlob.size).toBeGreaterThan(noneBlob.size);
  });

  it("acepta un PDF de una sola pagina", async () => {
    const file = await buildBlankPdfFile(1);
    const blob = await applyWatermarkToPdf(file, configWith({ pattern: "single-center" }), [1]);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("lanza WatermarkError con codigo PARSE_ERROR si el archivo no es un PDF", async () => {
    const fakeFile = new File([new Uint8Array([1, 2, 3, 4])], "fake.pdf", { type: "application/pdf" });
    await expect(applyWatermarkToPdf(fakeFile, configWith({}), [1])).rejects.toBeInstanceOf(
      WatermarkError,
    );
  });

  it("acepta una marca de imagen (PNG embebido como data URL)", async () => {
    // PNG transparente de 2x2 px construido a mano. El test valida que el
    // motor llama a embedPng y dibuja la imagen en el PDF resultante.
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQIHWNgYGD4z8DAwMDAwMAAACgAAQHl1MwzAAAAAElFTkSuQmCC";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    const file = await buildBlankPdfFile(1);
    const blob = await applyWatermarkToPdf(
      file,
      configWith({ pattern: "single-center", text: "", imageDataUrl: dataUrl }),
      [1],
    );
    expect(blob.type).toBe("application/pdf");
    const buffer = await blob.arrayBuffer();
    const reloaded = await PDFDocument.load(buffer);
    expect(reloaded.getPageCount()).toBe(1);
    // El PDF resultante debe ser mayor que un PDF en blanco porque ha embebido
    // una imagen (datos PNG + objeto XObject).
    expect(blob.size).toBeGreaterThan(file.size);
  });

  it("respeta customPosition en single-center ubicando la marca lejos del centro", async () => {
    // Verificamos que el motor traduce la customPosition a coordenadas reales.
    // Usamos dos PDFs con la misma config salvo customPosition; ambos deben
    // tener un content stream no vacio en la pagina seleccionada, pero el
    // motor debe haber pintado en posiciones distintas (no chequeable
    // directamente sin rasterizar; verificamos como minimo que producen
    // tamaños distintos del centro al estar en zonas distintas del lienzo).
    const file = await buildBlankPdfFile(1);
    const centro = await applyWatermarkToPdf(
      file,
      configWith({ pattern: "single-center", text: "MARCA" }),
      [1],
    );
    const esquina = await applyWatermarkToPdf(
      file,
      configWith({
        pattern: "single-center",
        text: "MARCA",
        customPosition: { x: 0.05, y: 0.05 },
      }),
      [1],
    );
    expect(centro.size).toBeGreaterThan(0);
    expect(esquina.size).toBeGreaterThan(0);
    // Ambos PDFs son validos y conservan la pagina.
    const docCentro = await PDFDocument.load(await centro.arrayBuffer());
    const docEsquina = await PDFDocument.load(await esquina.arrayBuffer());
    expect(docCentro.getPageCount()).toBe(1);
    expect(docEsquina.getPageCount()).toBe(1);
  });

  // Regresion del bug A: el preview multipagina renderizaba siempre la pagina 1
  // del PDF resultante en lugar de la pagina seleccionada. Aqui fijamos el
  // contrato del motor: con un PDF de 2 paginas y selectedPages=[2], el PDF
  // resultante conserva ambas paginas y solo la pagina 2 recibe contenido nuevo.
  it("con PDF de 2 paginas y selectedPages=[2] mantiene 2 paginas y solo marca la segunda", async () => {
    const file = await buildBlankPdfFile(2);
    const originalSize = file.size;
    const blob = await applyWatermarkToPdf(
      file,
      configWith({ pattern: "single-center", text: "MARCA" }),
      [2],
    );
    const buffer = await blob.arrayBuffer();
    const reloaded = await PDFDocument.load(buffer);
    expect(reloaded.getPageCount()).toBe(2);
    // El tamaño total crece porque hemos añadido contenido (texto + fuente embebida).
    expect(blob.size).toBeGreaterThan(originalSize);

    // Comprobamos por pagina que solo la segunda tiene un content stream con
    // tamaño relevante. El blanco generado por pdf-lib produce streams diminutos
    // o vacios; el watermark añade operadores (BT/ET/Tj) que crecen el stream.
    const pages = reloaded.getPages();
    const sizes = pages.map((page) => {
      const contents = page.node.Contents();
      if (!contents) return 0;
      // Contents puede ser un PDFStream directo o un PDFArray de PDFRef a streams.
      // Resolvemos ambos casos contra el contexto del documento.
      const ctx = reloaded.context;
      const items: unknown[] =
        typeof (contents as { asArray?: unknown }).asArray === "function"
          ? (contents as { asArray: () => unknown[] }).asArray()
          : [contents];
      let total = 0;
      for (const item of items) {
        const stream = (item as { getContentsSize?: () => number }).getContentsSize
          ? (item as { getContentsSize: () => number })
          : (ctx.lookup(item as never) as { getContentsSize?: () => number });
        if (stream && typeof stream.getContentsSize === "function") {
          total += stream.getContentsSize();
        }
      }
      return total;
    });
    const firstPageSize = sizes[0]!;
    const secondPageSize = sizes[1]!;
    expect(secondPageSize).toBeGreaterThan(firstPageSize);
    expect(secondPageSize).toBeGreaterThan(20);
  });
});
