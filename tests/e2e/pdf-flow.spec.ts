import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const samplePdf = join(here, "fixtures", "sample-3p.pdf");

test("flujo de PDF: cargar 3 paginas, deseleccionar una, descargar", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pdf-watermark-consent", "rejected");
    localStorage.setItem("pdf-watermark-lang-pref", "es");
  });
  await page.goto("/");

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(samplePdf);

  await expect(page.getByLabel(/seleccionar páginas a marcar/i)).toBeVisible({ timeout: 15000 });

  // Texto obligatorio
  await page.getByLabel(/texto de la marca de agua/i).fill("BORRADOR");

  // Deseleccionar la pagina 2 (boton de toggle aparte del de navegacion)
  await page.getByRole("button", { name: /desmarcar página 2/i }).click();

  await page.waitForTimeout(800);

  const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: /aplicar y descargar/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/sample-3p-watermarked\.pdf$/i);
});
