import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearConfigFromStorage,
  loadConfigFromStorage,
  saveConfigToStorage,
} from "../../src/lib/storage";
import { DEFAULT_CONFIG, type WatermarkConfig } from "../../src/lib/watermark/types";

const STORAGE_KEY = "watermark.config.v1";

describe("storage de WatermarkConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("devuelve null cuando no hay nada guardado", () => {
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("guarda y recupera la misma configuracion", () => {
    const config: WatermarkConfig = {
      ...DEFAULT_CONFIG,
      text: "Confidencial",
      fontSize: 72,
      pattern: "spiral",
    };
    saveConfigToStorage(config);
    const loaded = loadConfigFromStorage();
    expect(loaded).toEqual(config);
  });

  it("borra la entrada con clearConfigFromStorage", () => {
    saveConfigToStorage({ ...DEFAULT_CONFIG, text: "x" });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearConfigFromStorage();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("ignora JSON corrupto y devuelve null", () => {
    localStorage.setItem(STORAGE_KEY, "esto no es json {{{");
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("ignora un JSON que no respeta el shape esperado", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: 42, foo: "bar" }));
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("rellena con DEFAULT_CONFIG las claves faltantes si el shape valido", () => {
    const minimal: WatermarkConfig = { ...DEFAULT_CONFIG, text: "Mini" };
    saveConfigToStorage(minimal);
    const loaded = loadConfigFromStorage();
    expect(loaded?.text).toBe("Mini");
    expect(loaded?.fontSize).toBe(DEFAULT_CONFIG.fontSize);
  });
});
