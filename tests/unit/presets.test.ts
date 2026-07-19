import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deletePreset, listPresets, savePreset } from "../../src/lib/presets";
import { DEFAULT_CONFIG, type WatermarkConfig } from "../../src/lib/watermark/types";

const STORAGE_KEY = "pdf-watermark-presets";

function sampleConfig(patch: Partial<WatermarkConfig> = {}): WatermarkConfig {
  return { ...DEFAULT_CONFIG, text: "Confidencial", ...patch };
}

describe("presets de configuracion", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("devuelve lista vacia cuando no hay nada guardado", () => {
    expect(listPresets()).toEqual([]);
  });

  it("round-trip: guarda y lista el preset con el subset de la config", () => {
    const config = sampleConfig({
      fontSize: 72,
      pattern: "spiral",
      relativeSize: true,
      imageDataUrl: "data:image/png;base64,AAAA",
      customPosition: { x: 0.2, y: 0.8 },
    });
    savePreset("Auditoria", config);
    const presets = listPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]!.name).toBe("Auditoria");
    expect(presets[0]!.config).toEqual({
      text: "Confidencial",
      fontSize: 72,
      color: config.color,
      opacity: config.opacity,
      rotation: config.rotation,
      pattern: "spiral",
      density: config.density,
      fontFamily: config.fontFamily,
      relativeSize: true,
      imageScale: 100,
    });
    // Ni imagen ni posicion personalizada viajan en el preset.
    expect(presets[0]!.config).not.toHaveProperty("imageDataUrl");
    expect(presets[0]!.config).not.toHaveProperty("customPosition");
  });

  it("guardar con un nombre existente sobrescribe el preset", () => {
    savePreset("Base", sampleConfig({ fontSize: 30 }));
    savePreset("Base", sampleConfig({ fontSize: 90 }));
    const presets = listPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]!.config.fontSize).toBe(90);
  });

  it("recorta espacios del nombre y rechaza nombres vacios", () => {
    savePreset("  Mi preset  ", sampleConfig());
    expect(listPresets()[0]!.name).toBe("Mi preset");

    const antes = listPresets();
    const despues = savePreset("   ", sampleConfig());
    expect(despues).toEqual(antes);
    expect(listPresets()).toHaveLength(1);
  });

  it("deletePreset elimina por nombre y devuelve la lista resultante", () => {
    savePreset("A", sampleConfig());
    savePreset("B", sampleConfig());
    const rest = deletePreset("A");
    expect(rest.map((p) => p.name)).toEqual(["B"]);
    expect(listPresets().map((p) => p.name)).toEqual(["B"]);
  });

  it("deletePreset con un nombre inexistente no cambia nada", () => {
    savePreset("A", sampleConfig());
    const rest = deletePreset("ZZZ");
    expect(rest.map((p) => p.name)).toEqual(["A"]);
  });

  it("ignora JSON corrupto y devuelve lista vacia", () => {
    localStorage.setItem(STORAGE_KEY, "no es json {{{");
    expect(listPresets()).toEqual([]);
  });

  it("ignora un JSON que no es un array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: "A" }));
    expect(listPresets()).toEqual([]);
  });

  it("descarga presets con forma invalida pero conserva los validos", () => {
    const valido = {
      name: "Valido",
      config: {
        text: "x",
        fontSize: 48,
        color: "#000000",
        opacity: 0.3,
        rotation: -30,
        pattern: "diagonal",
        density: 4,
        fontFamily: "sans",
        relativeSize: false,
      },
    };
    const invalidos = [
      { name: "", config: valido.config }, // nombre vacio
      { name: 42, config: valido.config }, // nombre no string
      { name: "SinConfig" }, // sin config
      { name: "PatronMalo", config: { ...valido.config, pattern: "zigzag" } },
      { name: "FuenteMala", config: { ...valido.config, fontFamily: "comic" } },
      { name: "NaN", config: { ...valido.config, fontSize: "grande" } },
      "cadena suelta",
      null,
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...invalidos, valido]));
    const presets = listPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]).toEqual(valido);
  });

  it("tolera la ausencia de relativeSize en presets antiguos", () => {
    const configSinRelative: Record<string, unknown> = {
      text: "x",
      fontSize: 48,
      color: "#000000",
      opacity: 0.3,
      rotation: -30,
      pattern: "diagonal",
      density: 4,
      fontFamily: "sans",
    };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ name: "Antiguo", config: configSinRelative }]),
    );
    expect(listPresets()).toHaveLength(1);
  });

  it("no explota si localStorage.getItem lanza (almacenamiento roto)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage roto");
    });
    expect(listPresets()).toEqual([]);
  });

  it("savePreset devuelve la lista aunque setItem lance (cuota llena)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const presets = savePreset("A", sampleConfig());
    expect(presets.map((p) => p.name)).toEqual(["A"]);
  });
});
