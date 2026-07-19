// Inyecta en dist/sw.js la lista de assets hasheados del build (/_astro/*)
// para que el service worker los precachee y el offline funcione desde la
// primera visita. Se ejecuta automaticamente tras `astro build` (script
// "build" de package.json); public/sw.js mantiene el marcador intacto, asi
// que el servidor de desarrollo no se ve afectado.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const DIST = new URL("../dist/", import.meta.url);
const MARKER = "/*INJECT_BUILD_ASSETS*/ []";

const assets = readdirSync(new URL("_astro/", DIST))
  .filter((file) => /\.(?:js|mjs|css)$/.test(file))
  .sort()
  .map((file) => `/_astro/${file}`);

const swUrl = new URL("sw.js", DIST);
const sw = readFileSync(swUrl, "utf8");
if (!sw.includes(MARKER)) {
  throw new Error(`Marcador ${MARKER} no encontrado en dist/sw.js`);
}
writeFileSync(swUrl, sw.replace(MARKER, JSON.stringify(assets, null, 2)));
console.log(`inject-precache: ${assets.length} assets de /_astro/ inyectados en dist/sw.js`);
