import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Guarda anti-deriva: las cabeceras de seguridad se declaran en cuatro sitios
// (nginx, Netlify, Vercel y Cloudflare Pages) y deben ser identicas. Si una
// plataforma cambia y las otras no, este test rompe CI.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const HEADER_FILES = ["nginx.conf", "netlify.toml", "vercel.json", "public/_headers"];

function readConfig(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8");
}

// Extrae el valor de la directiva Content-Security-Policy segun el formato de
// cada fichero: JSON (Vercel), valor entre comillas (nginx/netlify.toml) o
// resto de linea (public/_headers de Cloudflare).
function extractCsp(file: string, source: string): string {
  if (file.endsWith(".json")) {
    const config = JSON.parse(source) as {
      headers?: Array<{ headers?: Array<{ key: string; value: string }> }>;
    };
    for (const group of config.headers ?? []) {
      for (const header of group.headers ?? []) {
        if (header.key === "Content-Security-Policy") return header.value;
      }
    }
    throw new Error(`CSP no encontrada en ${file}`);
  }
  const match = source.match(/Content-Security-Policy\s*:?\s*=?\s*(?:"([^"]+)"|([^\n]+))/);
  const value = (match?.[1] ?? match?.[2])?.trim();
  if (!value) throw new Error(`CSP no encontrada en ${file}`);
  return value;
}

// Scripts inline que Astro inyecta siempre en paginas con islas hidratadas:
// la directiva client:load y el runtime del custom element <astro-island>.
// Sus hashes sha256 van en script-src para no necesitar 'unsafe-inline'.
// Se leen del paquete astro instalado (version fijada en package.json): si una
// actualizacion de astro cambia estos runtimes, este test rompe CI y habra
// que recalcular los hashes de la CSP en los cuatro ficheros de cabeceras.
const require = createRequire(import.meta.url);
const astroRoot = dirname(require.resolve("astro/package.json"));

async function astroInlineScriptHashes(): Promise<string[]> {
  const prebuilt = [
    "dist/runtime/client/load.prebuilt.js",
    "dist/runtime/server/astro-island.prebuilt.js",
  ];
  const hashes: string[] = [];
  for (const file of prebuilt) {
    const module = (await import(pathToFileURL(join(astroRoot, file)).href)) as {
      default: string;
    };
    const digest = createHash("sha256").update(module.default, "utf8").digest("base64");
    hashes.push(`'sha256-${digest}'`);
  }
  return hashes;
}

describe("cabeceras de seguridad entre plataformas", () => {
  it("la Content-Security-Policy es identica en los cuatro despliegues", () => {
    const csps = HEADER_FILES.map((file) => extractCsp(file, readConfig(file)));
    for (const [i, file] of HEADER_FILES.entries()) {
      expect(csps[i], `CSP divergente en ${file}`).toBe(csps[0]);
    }
  });

  it("ningun despliegue envia Cross-Origin-Embedder-Policy", () => {
    // COEP require-corp se retiro deliberadamente tras un incidente (ver
    // comentario en nginx.conf); no debe reaparecer en ninguna plataforma.
    for (const file of HEADER_FILES) {
      expect(readConfig(file), `COEP presente en ${file}`).not.toContain(
        "Cross-Origin-Embedder-Policy",
      );
    }
  });

  it("la CSP incluye los hashes de los scripts inline de Astro y no usa 'unsafe-inline' en script-src", async () => {
    const csp = extractCsp("nginx.conf", readConfig("nginx.conf"));
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    for (const hash of await astroInlineScriptHashes()) {
      expect(
        scriptSrc,
        `script-src no permite el script inline de Astro ${hash}; recalcula los hashes de la CSP`,
      ).toContain(hash);
    }
  });
});
