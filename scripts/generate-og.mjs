// Genera las imagenes Open Graph (1200x630) de la landing: og-image.png (ES)
// y og-image-en.png (EN). Renderiza una plantilla HTML con los tokens de
// marca (color, borde grueso, sombra dura) en un navegador headless y la
// captura, asi la imagen nunca se desincroniza del diseño real de la web.
//
// Uso: node scripts/generate-og.mjs
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(REPO_ROOT, "public");

// Estrella de 12 puntas del sello (misma silueta que el favicon/og actual):
// poligono alternando radio exterior/interior, con uniones redondeadas.
function starburstPoints(cx, cy, outer, inner, points = 12) {
  const coords = [];
  for (let i = 0; i < points * 2; i += 1) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    coords.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return coords.join(" ");
}

const STAR = starburstPoints(170, 170, 158, 128);

const COPY = {
  es: {
    title: "PDF Watermark",
    line1: "Marcas de agua para PDFs e imágenes",
    line2: "100% en tu navegador",
    chip: "Sin servidores. Sin telemetría por defecto.",
    file: "og-image.png",
  },
  en: {
    title: "PDF Watermark",
    line1: "Watermarks for PDFs and images",
    line2: "100% in your browser",
    chip: "No servers. No telemetry by default.",
    file: "og-image-en.png",
  },
};

function template(copy) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: #FFF8E7;
    font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
    color: #000;
    position: relative;
    overflow: hidden;
  }
  .frame {
    position: absolute;
    inset: 22px;
    border: 3px solid #000;
  }
  .deco {
    position: absolute;
    border: 3px solid #000;
  }
  .deco.pink { width: 54px; height: 54px; background: #FFB5C5; top: 64px; right: 96px; }
  .deco.yellow { width: 34px; height: 34px; background: #FFE9A8; top: 150px; right: 62px; }
  .deco.sky { width: 44px; height: 44px; background: #A8E0FF; bottom: 88px; left: 420px; }
  .badge {
    position: absolute;
    left: 96px;
    top: 155px;
    width: 340px;
    height: 340px;
  }
  .badge text {
    font-size: 150px;
    font-weight: 800;
    text-anchor: middle;
    dominant-baseline: central;
  }
  .text {
    position: absolute;
    left: 500px;
    top: 140px;
    right: 80px;
  }
  h1 {
    font-size: 74px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.05;
  }
  .sub {
    margin-top: 26px;
    font-size: 34px;
    font-weight: 500;
    line-height: 1.3;
  }
  .chip {
    display: inline-block;
    margin-top: 40px;
    background: #C6F5A6;
    border: 3px solid #000;
    box-shadow: 6px 6px 0 #000;
    border-radius: 8px;
    padding: 12px 20px;
    font-size: 24px;
    font-weight: 700;
  }
  .url {
    position: absolute;
    left: 500px;
    bottom: 74px;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 24px;
    color: rgba(0, 0, 0, 0.55);
  }
</style>
</head>
<body>
  <div class="frame"></div>
  <div class="deco pink"></div>
  <div class="deco yellow"></div>
  <div class="deco sky"></div>
  <svg class="badge" viewBox="0 0 340 340" aria-hidden="true">
    <polygon points="${STAR}" fill="#C5B4FF" stroke="#000" stroke-width="14" stroke-linejoin="round" />
    <text x="170" y="182">A</text>
  </svg>
  <div class="text">
    <h1>${copy.title}</h1>
    <p class="sub">${copy.line1}<br /><strong>${copy.line2}</strong></p>
    <p class="chip">${copy.chip}</p>
  </div>
  <p class="url">pdf-watermark.686f6c61.dev</p>
</body>
</html>`;
}

async function main() {
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    // Entorno sin el chromium de Playwright instalado: usar Chrome/Chromium del sistema.
    browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
  }
  try {
    for (const copy of Object.values(COPY)) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
      await page.setContent(template(copy), { waitUntil: "load" });
      const out = join(OUT_DIR, copy.file);
      mkdirSync(dirname(out), { recursive: true });
      await page.screenshot({ path: out, type: "png" });
      console.log(`generada ${out} ${existsSync(out) ? "OK" : "FALLO"}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

await main();
