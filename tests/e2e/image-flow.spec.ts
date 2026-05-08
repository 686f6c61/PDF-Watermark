import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const samplePng = join(here, "fixtures", "sample-blue.png");

test("flujo de imagen: cargar, configurar y descargar PNG con marca", async ({ page }) => {
  // Sembrar localStorage antes de cargar:
  // - pdf-watermark-consent: rechaza el banner de cookies
  // - pdf-watermark-lang-pref: evita la redireccion automatica a /en/ cuando
  //   Chromium en CI tiene navigator.language="en-US"
  await page.addInitScript(() => {
    localStorage.setItem("pdf-watermark-consent", "rejected");
    localStorage.setItem("pdf-watermark-lang-pref", "es");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /protege tus pdfs/i })).toBeVisible();

  // Cargar la imagen via input oculto
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(samplePng);

  // El editor aparece
  await expect(page.getByLabel(/configuración de la marca de agua/i)).toBeVisible();

  // Escribir el texto de la marca de agua
  await page.getByLabel(/texto de la marca de agua/i).fill("CONFIDENCIAL");

  // Esperar un momento para el preview
  await page.waitForTimeout(500);

  // Pulsar aplicar y descargar y capturar la descarga
  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await page.getByRole("button", { name: /aplicar y descargar/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/sample-blue-watermarked\.png$/i);
});
