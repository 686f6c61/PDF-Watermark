/**
 * Tests de la plantilla descargable para el lote de marcas personalizadas.
 *
 * La función `downloadBatchTemplate` produce un Blob de texto plano que el
 * navegador descarga vía `<a download>`. En tests interceptamos el `click()`
 * del enlace para capturar el blob y verificar su contenido sin invocar el
 * diálogo real del sistema.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBatchTemplate } from "../../src/lib/batch-template";

type CapturedAnchor = {
  href: string;
  download: string;
};

let captured: CapturedAnchor | null;
let createdBlobs: Blob[];

beforeEach(() => {
  captured = null;
  createdBlobs = [];

  // Reescribimos createObjectURL para registrar cada Blob generado y poder
  // leer su contenido en el test. revokeObjectURL queda como no-op.
  const originalCreate = URL.createObjectURL;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    createdBlobs.push(blob);
    return `blob:test/${createdBlobs.length}`;
  }) as typeof URL.createObjectURL;

  // Interceptamos el click del anchor. createElement("a") sigue funcionando
  // normal; solo sustituimos el método .click() para no abrir descargas.
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function patchedClick(this: HTMLAnchorElement) {
    captured = { href: this.href, download: this.download };
  };

  return () => {
    URL.createObjectURL = originalCreate;
    HTMLAnchorElement.prototype.click = originalClick;
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadBatchTemplate", () => {
  it("descarga la plantilla en español con nombre 'plantilla-marcas.txt'", async () => {
    downloadBatchTemplate("es");

    expect(captured).not.toBeNull();
    expect(captured!.download).toBe("plantilla-marcas.txt");
    expect(createdBlobs).toHaveLength(1);

    const text = await createdBlobs[0]!.text();
    expect(text).toContain("# Plantilla");
    expect(text).toContain("Juan");
    // El comentario advierte del límite de 50.
    expect(text.toLowerCase()).toContain("50");
    expect(createdBlobs[0]!.type).toContain("text/plain");
  });

  it("descarga la plantilla en inglés con nombre 'watermark-template.txt'", async () => {
    downloadBatchTemplate("en");

    expect(captured).not.toBeNull();
    expect(captured!.download).toBe("watermark-template.txt");
    expect(createdBlobs).toHaveLength(1);

    const text = await createdBlobs[0]!.text();
    expect(text).toContain("# Template");
    expect(text).toContain("John");
    expect(text.toLowerCase()).toContain("50");
  });

  it("la plantilla en español incluye al menos 5 ejemplos no comentados", async () => {
    downloadBatchTemplate("es");
    const text = await createdBlobs[0]!.text();
    const exampleLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    expect(exampleLines.length).toBeGreaterThanOrEqual(5);
  });
});
