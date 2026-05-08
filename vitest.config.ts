import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

// El plugin de Svelte esta disponible de forma transitiva via @astrojs/svelte; lo
// resolvemos por ruta absoluta para no requerir anadirlo como dependencia directa.
const require = createRequire(import.meta.url);
const astroSvelteRoot = dirname(require.resolve("@astrojs/svelte/package.json"));
const sveltePluginEntry = resolvePath(
  astroSvelteRoot,
  "node_modules/@sveltejs/vite-plugin-svelte/src/index.js",
);
const { svelte } = await import(pathToFileURL(sveltePluginEntry).href);

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    setupFiles: ["./tests/unit/setup.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
