import { DEFAULT_CONFIG, type WatermarkConfig } from "./watermark/types";

const STORAGE_KEY = "watermark.config.v1";

const PATTERNS = ["diagonal", "single-center", "corner", "spiral"] as const;
const FONT_FAMILIES = ["sans", "serif", "mono"] as const;

function isValidCustomPosition(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.x === "number" && typeof v.y === "number";
}

function isValidImageDataUrl(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === "string";
}

function isValidShape(value: unknown): value is WatermarkConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.text === "string" &&
    typeof v.fontSize === "number" &&
    typeof v.color === "string" &&
    typeof v.opacity === "number" &&
    typeof v.rotation === "number" &&
    typeof v.density === "number" &&
    typeof v.pattern === "string" &&
    PATTERNS.includes(v.pattern as (typeof PATTERNS)[number]) &&
    typeof v.fontFamily === "string" &&
    FONT_FAMILIES.includes(v.fontFamily as (typeof FONT_FAMILIES)[number]) &&
    // Campos nuevos opcionales: aceptamos tanto la ausencia como un valor valido.
    isValidCustomPosition(v.customPosition) &&
    isValidImageDataUrl(v.imageDataUrl)
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

export function loadConfigFromStorage(): WatermarkConfig | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidShape(parsed)) return null;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return null;
  }
}

export function saveConfigToStorage(config: WatermarkConfig): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // El localStorage puede estar lleno o deshabilitado. Sin telemetria, ignoramos silenciosamente.
  }
}

export function clearConfigFromStorage(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignoramos por las mismas razones.
  }
}
