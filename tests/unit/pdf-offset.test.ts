import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { computePdfDrawOffset } from "../../src/lib/watermark/pdf";

// Estos tests verifican la equivalencia geometrica de centrado vertical
// entre el motor Canvas (textBaseline = "middle") y el motor PDF
// (origen abajo-izquierda, dibujado desde la linea base).
//
// La idea: dada una posicion (x, y) en coordenadas Canvas (origen arriba-izquierda),
// el motor PDF debe convertirla a coordenadas pdf-lib y aplicar un offset
// vertical para que el centro visual del glifo coincida con el de Canvas.

describe("computePdfDrawOffset", () => {
  it("devuelve coordenadas con origen abajo-izquierda invirtiendo Y", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pageHeight = 800;
    const fontSize = 48;

    const offset = computePdfDrawOffset({
      canvasX: 100,
      canvasY: 200,
      textWidth: 60,
      pageHeight,
      font,
      fontSize,
    });

    // X siempre se desplaza media anchura hacia la izquierda para centrar.
    expect(offset.drawX).toBeCloseTo(100 - 60 / 2, 5);
    // Y debe estar invertido (pageHeight - canvasY) y luego ajustado.
    // Rango esperado: cerca de pageHeight - canvasY.
    expect(offset.drawY).toBeLessThan(pageHeight - 200);
    expect(offset.drawY).toBeGreaterThan(pageHeight - 200 - fontSize);
  });

  it("centra el texto verticalmente sobre canvasY (equivalente a textBaseline=middle)", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pageHeight = 800;
    const fontSize = 48;
    const canvasY = 400;

    const offset = computePdfDrawOffset({
      canvasX: 0,
      canvasY,
      textWidth: 100,
      pageHeight,
      font,
      fontSize,
    });

    // El centro visual (drawY + capHeight/2 con coordenadas pdf-lib)
    // debe coincidir con la inversa de canvasY (pageHeight - canvasY).
    // Usamos sizeAtHeight de la M como aproximacion de altura visual.
    const capHeight = font.heightAtSize(fontSize, { descender: false });
    const visualCenterPdf = offset.drawY + capHeight / 2;
    const expectedCenterPdf = pageHeight - canvasY;
    // Tolerancia: 1px de diferencia es aceptable para equivalencia visual.
    expect(Math.abs(visualCenterPdf - expectedCenterPdf)).toBeLessThan(1);
  });

  it("aproxima al centrado de Canvas para distintos tamaños de fuente", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pageHeight = 1000;

    for (const fontSize of [12, 24, 48, 72, 120]) {
      const canvasY = 500;
      const offset = computePdfDrawOffset({
        canvasX: 0,
        canvasY,
        textWidth: 0,
        pageHeight,
        font,
        fontSize,
      });
      const capHeight = font.heightAtSize(fontSize, { descender: false });
      const visualCenterPdf = offset.drawY + capHeight / 2;
      const expectedCenterPdf = pageHeight - canvasY;
      // Tolerancia proporcional al tamaño: hasta un 5% del tamaño de la fuente.
      expect(Math.abs(visualCenterPdf - expectedCenterPdf)).toBeLessThan(fontSize * 0.05);
    }
  });
});
