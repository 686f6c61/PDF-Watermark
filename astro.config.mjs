import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  // i18n nativo de Astro 6: castellano por defecto sin prefijo (`/`,
  // `/privacidad/`); ingles bajo `/en/`. routing.prefixDefaultLocale a false
  // mantiene las URLs castellanas existentes y sus enlaces internos.
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false,
      cssCodeSplit: true,
    },
    worker: {
      format: "es",
    },
  },
});
