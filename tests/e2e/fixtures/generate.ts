import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!existsSync(here)) mkdirSync(here, { recursive: true });

  // PDF de 3 paginas
  const doc = await PDFDocument.create();
  doc.addPage([400, 300]);
  doc.addPage([400, 300]);
  doc.addPage([400, 300]);
  const pdfBytes = await doc.save();
  writeFileSync(join(here, "sample-3p.pdf"), pdfBytes);

  // PNG minimo de 100x100 azul
  const width = 100;
  const height = 100;
  const png = buildSolidPng(width, height, 0, 102, 204);
  writeFileSync(join(here, "sample-blue.png"), png);
  // PNG verde para tests batch
  const png2 = buildSolidPng(width, height, 76, 175, 80);
  writeFileSync(join(here, "sample-green.png"), png2);

  console.log("Fixtures generados en", here);
}

function buildSolidPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  // Construye un PNG sin dependencias usando bloques basicos.
  function crc32(buf: Buffer): number {
    let c: number;
    const table: number[] = [];
    for (let n = 0; n < 256; n += 1) {
      c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) {
      crc = table[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // color type RGB
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Datos sin filtro: cada fila prefijada con 0
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0;
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.alloc(row.length * height);
  for (let y = 0; y < height; y += 1) {
    row.copy(raw, y * row.length);
  }
  const compressed = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
