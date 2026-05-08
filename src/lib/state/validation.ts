import { LIMITS, type WatermarkConfig } from "../watermark/types";

export type ValidationError = {
  field: keyof WatermarkConfig;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const PATTERNS = ["diagonal", "single-center", "corner", "spiral"] as const;
const FONT_FAMILIES = ["sans", "serif", "mono"] as const;
// Solo aceptamos PNG y WebP como marcas de imagen: ambos soportan
// transparencia y son los formatos que pdf-lib puede embeber sin recodificar.
const VALID_IMAGE_DATA_URL = /^data:image\/(png|webp);base64,/;

function densityApplies(pattern: WatermarkConfig["pattern"]): boolean {
  return pattern === "diagonal" || pattern === "spiral";
}

export function validateConfig(config: WatermarkConfig): ValidationResult {
  const errors: ValidationError[] = [];

  const trimmed = config.text.trim();
  const tieneImagen = typeof config.imageDataUrl === "string" && config.imageDataUrl.length > 0;
  // El texto solo es obligatorio cuando NO hay imagen como marca; si hay
  // imagen, la marca puede ser puramente grafica y aceptamos texto vacio.
  if (trimmed.length === 0 && !tieneImagen) {
    errors.push({
      field: "text",
      message: "Debes proporcionar texto o una imagen para la marca de agua",
    });
  } else if (config.text.length > LIMITS.MAX_TEXT_LENGTH) {
    errors.push({
      field: "text",
      message: `El texto no puede superar ${LIMITS.MAX_TEXT_LENGTH} caracteres`,
    });
  }

  if (tieneImagen && !VALID_IMAGE_DATA_URL.test(config.imageDataUrl as string)) {
    errors.push({
      field: "imageDataUrl",
      message: "La imagen de la marca debe ser PNG o WebP en formato data URL",
    });
  }

  if (config.fontSize < LIMITS.MIN_FONT_SIZE || config.fontSize > LIMITS.MAX_FONT_SIZE) {
    errors.push({
      field: "fontSize",
      message: `El tamaño debe estar entre ${LIMITS.MIN_FONT_SIZE} y ${LIMITS.MAX_FONT_SIZE}`,
    });
  }

  if (config.opacity < LIMITS.MIN_OPACITY || config.opacity > LIMITS.MAX_OPACITY) {
    errors.push({
      field: "opacity",
      message: `La opacidad debe estar entre ${LIMITS.MIN_OPACITY} y ${LIMITS.MAX_OPACITY}`,
    });
  }

  if (config.rotation < LIMITS.MIN_ROTATION || config.rotation > LIMITS.MAX_ROTATION) {
    errors.push({
      field: "rotation",
      message: `La rotacion debe estar entre ${LIMITS.MIN_ROTATION} y ${LIMITS.MAX_ROTATION} grados`,
    });
  }

  if (densityApplies(config.pattern)) {
    if (config.density < LIMITS.MIN_DENSITY || config.density > LIMITS.MAX_DENSITY) {
      errors.push({
        field: "density",
        message: `La densidad debe estar entre ${LIMITS.MIN_DENSITY} y ${LIMITS.MAX_DENSITY}`,
      });
    }
  }

  if (!HEX_COLOR.test(config.color)) {
    errors.push({
      field: "color",
      message: "El color debe ser un hex de 6 caracteres (ej. #ff00aa)",
    });
  }

  if (!PATTERNS.includes(config.pattern)) {
    errors.push({ field: "pattern", message: "Patrón no reconocido" });
  }

  if (!FONT_FAMILIES.includes(config.fontFamily)) {
    errors.push({ field: "fontFamily", message: "Familia tipográfica no reconocida" });
  }

  return { ok: errors.length === 0, errors };
}
