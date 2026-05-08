import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

test("flujo de lote: 2 imagenes y 1 PDF descargan como ZIP", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pdf-watermark-consent", "rejected");
    localStorage.setItem("pdf-watermark-lang-pref", "es");
  });
  await page.goto("/");

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles([
    join(fixturesDir, "sample-blue.png"),
    join(fixturesDir, "sample-green.png"),
    join(fixturesDir, "sample-3p.pdf"),
  ]);

  await expect(page.getByLabel(/configuración de la marca de agua/i)).toBeVisible({ timeout: 15000 });

  await page.getByLabel(/texto de la marca de agua/i).fill("LOTE");

  await page.waitForTimeout(800);

  const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: /aplicar y descargar/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^watermarked-\d{4}-\d{2}-\d{2}\.zip$/);
});
