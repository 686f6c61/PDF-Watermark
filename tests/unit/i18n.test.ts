import { describe, expect, it } from "vitest";
import { isLang, t } from "../../src/i18n/t";

describe("t() i18n helper", () => {
  it("devuelve la cadena en castellano cuando lang es 'es'", () => {
    expect(t("hero.title", "es")).toBe("Protege tus PDFs e imágenes con marcas de agua");
  });

  it("devuelve la cadena en ingles cuando lang es 'en'", () => {
    expect(t("hero.title", "en")).toBe("Protect your PDFs and images with watermarks");
  });

  it("soporta claves anidadas via path con punto", () => {
    expect(t("controls.patternDiagonal", "es")).toBe("Diagonal");
    expect(t("controls.patternDiagonal", "en")).toBe("Diagonal");
    expect(t("controls.patternCenter", "es")).toBe("Centrado");
    expect(t("controls.patternCenter", "en")).toBe("Centered");
  });

  it("devuelve [clave] cuando la ruta no existe", () => {
    expect(t("inexistente.no.va", "es")).toBe("[inexistente.no.va]");
  });

  it("devuelve [clave] cuando la ruta apunta a un objeto y no a un string", () => {
    // hero existe como objeto, pero no es una cadena.
    expect(t("hero", "es")).toBe("[hero]");
  });

  it("traduce literales clave de la UI sin sorpresas", () => {
    expect(t("actions.applyDownload", "es")).toBe("Aplicar y descargar");
    expect(t("actions.applyDownload", "en")).toBe("Apply and download");
    expect(t("cookies.accept", "es")).toBe("Aceptar");
    expect(t("cookies.accept", "en")).toBe("Accept");
  });

  it("traduce las cadenas de la pagina de privacidad", () => {
    expect(t("privacyPage.h1", "es")).toBe("Política de privacidad");
    expect(t("privacyPage.h1", "en")).toBe("Privacy policy");
  });
});

describe("isLang", () => {
  it("acepta 'es' y 'en'", () => {
    expect(isLang("es")).toBe(true);
    expect(isLang("en")).toBe(true);
  });

  it("rechaza cualquier otro valor", () => {
    expect(isLang("fr")).toBe(false);
    expect(isLang("")).toBe(false);
    expect(isLang(null)).toBe(false);
    expect(isLang(undefined)).toBe(false);
    expect(isLang(42)).toBe(false);
  });
});
