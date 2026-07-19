/**
 * Presets de configuración de marca de agua guardados por el usuario.
 *
 * Persistencia en localStorage (clave `pdf-watermark-presets`), mismo estilo
 * defensivo que `storage.ts`: todo acceso va envuelto en try/catch porque el
 * almacenamiento puede estar deshabilitado, lleno o corrupto, y ninguna de
 * esas situaciones debe romper la UI.
 *
 * El preset guarda un SUBSET de la config: los ajustes de estilo de la marca.
 * Ni `imageDataUrl` (una imagen en data URL pesaría MB por preset) ni
 * `customPosition` (es circunstancial del arrastre, no del estilo).
 *
 * El nombre es la clave única: guardar con un nombre existente sobrescribe.
 * Al listar, los presets con forma inválida (JSON manipulado, versiones
 * antiguas) se descartan en silencio.
 *
 * @module presets
 */
import { LIMITS, type WatermarkConfig } from "./watermark/types";

// Subset de WatermarkConfig que viaja en un preset (ver cabecera del modulo).
export type PresetConfig = Pick<
  WatermarkConfig,
  | "text"
  | "fontSize"
  | "color"
  | "opacity"
  | "rotation"
  | "pattern"
  | "density"
  | "fontFamily"
  | "relativeSize"
  | "imageScale"
>;

export type SavedPreset = {
  name: string;
  config: PresetConfig;
};

const STORAGE_KEY = "pdf-watermark-presets";

const PATTERNS = ["diagonal", "single-center", "corner", "spiral"] as const;
const FONT_FAMILIES = ["sans", "serif", "mono"] as const;

function isValidPresetConfig(value: unknown): value is PresetConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.text === "string" &&
    typeof v.fontSize === "number" &&
    Number.isFinite(v.fontSize) &&
    typeof v.color === "string" &&
    typeof v.opacity === "number" &&
    Number.isFinite(v.opacity) &&
    typeof v.rotation === "number" &&
    Number.isFinite(v.rotation) &&
    typeof v.density === "number" &&
    Number.isFinite(v.density) &&
    typeof v.pattern === "string" &&
    PATTERNS.includes(v.pattern as (typeof PATTERNS)[number]) &&
    typeof v.fontFamily === "string" &&
    FONT_FAMILIES.includes(v.fontFamily as (typeof FONT_FAMILIES)[number]) &&
    (v.relativeSize === undefined || typeof v.relativeSize === "boolean") &&
    (v.imageScale === undefined ||
      (typeof v.imageScale === "number" && Number.isFinite(v.imageScale)))
  );
}

function isValidPreset(value: unknown): value is SavedPreset {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" && v.name.trim().length > 0 && isValidPresetConfig(v.config)
  );
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function persist(presets: SavedPreset[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage lleno o deshabilitado: sin telemetria, ignoramos.
  }
}

export function listPresets(): SavedPreset[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

export function savePreset(name: string, config: WatermarkConfig): SavedPreset[] {
  const trimmed = name.trim();
  const presets = listPresets();
  if (trimmed.length === 0) return presets;
  const preset: SavedPreset = {
    name: trimmed,
    config: {
      text: config.text,
      fontSize: config.fontSize,
      color: config.color,
      opacity: config.opacity,
      rotation: config.rotation,
      pattern: config.pattern,
      density: config.density,
      fontFamily: config.fontFamily,
      relativeSize: config.relativeSize ?? false,
      imageScale: config.imageScale ?? LIMITS.DEFAULT_IMAGE_SCALE,
    },
  };
  // Nombre unico: un preset con el mismo nombre se sobrescribe y se mueve al
  // final (es el que el usuario acaba de tocar).
  const next = [...presets.filter((p) => p.name !== trimmed), preset];
  persist(next);
  return next;
}

export function deletePreset(name: string): SavedPreset[] {
  const next = listPresets().filter((p) => p.name !== name);
  persist(next);
  return next;
}
