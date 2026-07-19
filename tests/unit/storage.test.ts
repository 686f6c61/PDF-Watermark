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

  it("descarta una config con density gigante (colgaria la espiral)", () => {
    const config: WatermarkConfig = { ...DEFAULT_CONFIG, text: "x", pattern: "spiral" };
    const raw = JSON.stringify(config).replace('"density":4', '"density":1000000000');
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("descarta una config con Infinity (JSON.parse de 1e999 da Infinity, que es typeof number)", () => {
    const config: WatermarkConfig = { ...DEFAULT_CONFIG, text: "x", pattern: "diagonal" };
    const raw = JSON.stringify(config).replace('"density":4', '"density":1e999');
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("descarta una config con fontSize fuera de rango", () => {
    const config: WatermarkConfig = { ...DEFAULT_CONFIG, text: "x", fontSize: 121 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("descarta una config con customPosition no finita o fuera de [0, 1]", () => {
    const config: WatermarkConfig = { ...DEFAULT_CONFIG, text: "x" };
    const rawInfinity = JSON.stringify(config).replace(
      '"fontSize":48',
      '"fontSize":48,"customPosition":{"x":1e999,"y":0.5}',
    );
    localStorage.setItem(STORAGE_KEY, rawInfinity);
    expect(loadConfigFromStorage()).toBeNull();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...config, customPosition: { x: 2, y: 0.5 } }),
    );
    expect(loadConfigFromStorage()).toBeNull();
  });

  it("conserva una config valida con customPosition dentro de [0, 1]", () => {
    const config: WatermarkConfig = {
      ...DEFAULT_CONFIG,
      text: "x",
      customPosition: { x: 0.25, y: 0.75 },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    expect(loadConfigFromStorage()).toEqual(config);
  });

  it("tolera density fuera de rango si el patron no la usa (misma regla que validateConfig)", () => {
    const config: WatermarkConfig = {
      ...DEFAULT_CONFIG,
      text: "x",
      pattern: "single-center",
      density: 99,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    expect(loadConfigFromStorage()).toEqual(config);
  });

  it("carga una config con relativeSize: true", () => {
    const config: WatermarkConfig = { ...DEFAULT_CONFIG, text: "x", relativeSize: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    expect(loadConfigFromStorage()).toEqual(config);
  });

  it("tolera la ausencia de relativeSize (configs antiguas) y cae al default", () => {
    const config: WatermarkConfig = { ...DEFAULT_CONFIG, text: "x" };
    // Simulamos una config guardada antes de que existiera el campo.
    const raw = JSON.stringify(config).replace(',"relativeSize":false', "");
    expect(raw).not.toContain("relativeSize");
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadConfigFromStorage()).toEqual({ ...config, relativeSize: false });
  });

  it("descarta una config con relativeSize que no es booleano", () => {
    const config: WatermarkConfig = { ...DEFAULT_CONFIG, text: "x" };
    const raw = JSON.stringify(config).replace(
      '"relativeSize":false',
      '"relativeSize":"si"',
    );
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadConfigFromStorage()).toBeNull();
  });
});
