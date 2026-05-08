import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { readPdfMetadata } from "../../src/lib/watermark/pdf";

async function buildBlankPdfFile(pageCount: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([400, 300]);
  }
  const bytes = await doc.save();
  const safeBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([safeBuffer], `test-${pageCount}p.pdf`, { type: "application/pdf" });
}

// Construye un PDF minimo con un dictionary /Encrypt en el trailer.
// pdf-lib lo detecta como cifrado y lanza error con ignoreEncryption: false.
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

describe("readPdfMetadata", () => {
  it("devuelve { ok: true, pageCount } para un PDF valido", async () => {
    const file = await buildBlankPdfFile(7);
    const result = await readPdfMetadata(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pageCount).toBe(7);
    }
  });

  it("devuelve { ok: false, reason: 'protected' } para un PDF cifrado", async () => {
    const file = buildEncryptedPdfFile();
    const result = await readPdfMetadata(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("protected");
      expect(result.message).toContain("contraseña");
    }
  });

  it("devuelve { ok: false, reason: 'parse' } para un PDF dañado", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], "bad.pdf", { type: "application/pdf" });
    const result = await readPdfMetadata(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("parse");
    }
  });
});
