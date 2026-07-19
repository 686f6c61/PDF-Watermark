import { LIMITS, type WatermarkConfig } from "../watermark/types";

export type ValidationError = {
  field: keyof WatermarkConfig;
  message: string;
  // Codigo estable opcional: lo llevan los errores con clave i18n propia
  // ("errors.<codigo>" en es.json/en.json) para que la UI pueda traducirlos
  // sin depender del texto del mensaje.
  code?: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const PATTERNS = ["diagonal", "single-center", "corner", "spiral"] as const;
const FONT_FAMILIES = ["sans", "serif", "mono"] as const;
// Aceptamos PNG y WebP como marcas de imagen: ambos soportan transparencia.
// Ojo: pdf-lib solo embebe PNG y JPEG; el WebP se transcodifica a PNG en la
// UI al subirlo (WatermarkControls), asi que aqui seguimos aceptando ambos.
const VALID_IMAGE_DATA_URL = /^data:image\/(png|webp);base64,/;

// Simbolos frecuentes de Windows-1252 que estan FUERA de Latin-1 (U+00A0-FF)
// pero si forman parte de WinAnsiEncoding: euro, guiones tipograficos,
// comillas curvas, puntos suspensivos, marca registrada, etc.
const WINANSI_EXTRA_SYMBOLS = new Set([
  "€",
  "‚",
  "ƒ",
  "„",
  "…",
  "†",
  "‡",
  "ˆ",
  "‰",
  "Š",
  "‹",
  "Œ",
  "Ž",
  "‘",
  "’",
  "“",
  "”",
  "•",
  "–",
  "—",
  "˜",
  "™",
  "š",
  "›",
  "œ",
  "ž",
  "Ÿ",
]);

/**
 * Aproximacion a "codificable en WinAnsi" (Windows-1252), la codificacion de
 * las fuentes estandar de pdf-lib (Helvetica/Times/Courier). Si un texto no
 * la supera, `drawText`/`widthOfTextAtSize` lanzan en pleno render del PDF.
 *
 * Aceptamos:
 *   - ASCII imprimible: U+0020-U+007E.
 *   - Latin-1 supplement: U+00A0-U+00FF (tildes, ñ, ç, símbolos ©®±…).
 *   - Unos pocos simbolos WinAnsi frecuentes fuera de Latin-1
 *     (€ • – — ‘ ’ “ ” … ™ y el resto de WINANSI_EXTRA_SYMBOLS).
 *   - El salto de linea (\n) como separador de lineas del texto multi-linea:
 *     cada linea se valida por separado contra las reglas anteriores.
 *
 * Rechazamos todo lo demas: emoji, CJK, cirilico, arabe y caracteres de
 * control distintos de \n (U+0000-U+001F y U+007F-U+009F, que tampoco tienen
 * glifo WinAnsi).
 */
export function isWinAnsiEncodable(text: string): boolean {
  return text.split("\n").every((line) => isWinAnsiLineEncodable(line));
}

function isWinAnsiLineEncodable(line: string): boolean {
  for (const ch of line) {
    const cp = ch.codePointAt(0) as number;
    const isAsciiPrintable = cp >= 0x20 && cp <= 0x7e;
    const isLatin1 = cp >= 0xa0 && cp <= 0xff;
    if (!isAsciiPrintable && !isLatin1 && !WINANSI_EXTRA_SYMBOLS.has(ch)) {
      return false;
    }
  }
  return true;
}

function densityApplies(pattern: WatermarkConfig["pattern"]): boolean {
  return pattern === "diagonal" || pattern === "spiral";
}

/**
 * Valida SOLO los rangos numericos contra LIMITS (y que sean finitos: un NaN
 * o Infinity es typeof "number" y colaria en las comparaciones). No aplica
 * reglas semanticas como "texto obligatorio": por eso puede reusarse tanto en
 * validateConfig como en el filtro de la config persistida en localStorage,
 * donde un texto vacio es un estado legitimo (ver storage.ts).
 */
export function validateRanges(config: WatermarkConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (
    !Number.isFinite(config.fontSize) ||
    config.fontSize < LIMITS.MIN_FONT_SIZE ||
    config.fontSize > LIMITS.MAX_FONT_SIZE
  ) {
    errors.push({
      field: "fontSize",
      message: `El tamaño debe estar entre ${LIMITS.MIN_FONT_SIZE} y ${LIMITS.MAX_FONT_SIZE}`,
    });
  }

  // imageScale es opcional (hereda DEFAULT_IMAGE_SCALE); si viene, en rango.
  if (
    config.imageScale !== undefined &&
    (!Number.isFinite(config.imageScale) ||
      config.imageScale < LIMITS.MIN_IMAGE_SCALE ||
      config.imageScale > LIMITS.MAX_IMAGE_SCALE)
  ) {
    errors.push({
      field: "imageScale",
      message: `El tamaño de la imagen debe estar entre ${LIMITS.MIN_IMAGE_SCALE} y ${LIMITS.MAX_IMAGE_SCALE}`,
    });
  }

  if (
    !Number.isFinite(config.opacity) ||
    config.opacity < LIMITS.MIN_OPACITY ||
    config.opacity > LIMITS.MAX_OPACITY
  ) {
    errors.push({
      field: "opacity",
      message: `La opacidad debe estar entre ${LIMITS.MIN_OPACITY} y ${LIMITS.MAX_OPACITY}`,
    });
  }

  if (
    !Number.isFinite(config.rotation) ||
    config.rotation < LIMITS.MIN_ROTATION ||
    config.rotation > LIMITS.MAX_ROTATION
  ) {
    errors.push({
      field: "rotation",
      message: `La rotacion debe estar entre ${LIMITS.MIN_ROTATION} y ${LIMITS.MAX_ROTATION} grados`,
    });
  }

  // NaN/Infinity en densidad es peligroso siempre (la espiral iteraria sin
  // fin); el rango solo se exige cuando el patron usa densidad, igual que
  // antes, para no descartar configs de patrones que la ignoran.
  if (!Number.isFinite(config.density)) {
    errors.push({ field: "density", message: "La densidad debe ser un numero finito" });
  } else if (
    densityApplies(config.pattern) &&
    (config.density < LIMITS.MIN_DENSITY || config.density > LIMITS.MAX_DENSITY)
  ) {
    errors.push({
      field: "density",
      message: `La densidad debe estar entre ${LIMITS.MIN_DENSITY} y ${LIMITS.MAX_DENSITY}`,
    });
  }

  const custom = config.customPosition;
  if (custom) {
    const finita = Number.isFinite(custom.x) && Number.isFinite(custom.y);
    const enRango = finita && custom.x >= 0 && custom.x <= 1 && custom.y >= 0 && custom.y <= 1;
    if (!finita || !enRango) {
      errors.push({
        field: "customPosition",
        message: "La posicion personalizada debe tener coordenadas finitas entre 0 y 1",
      });
    }
  }

  return errors;
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
  } else if (config.text.split("\n").length > LIMITS.MAX_TEXT_LINES) {
    errors.push({
      field: "text",
      code: "tooManyLines",
      message: `El texto tiene demasiadas líneas (máximo ${LIMITS.MAX_TEXT_LINES})`,
    });
  } else if (!isWinAnsiEncodable(config.text)) {
    errors.push({
      field: "text",
      message: "El texto contiene caracteres no soportados (emoji o alfabetos no latinos)",
    });
  }

  if (tieneImagen && !VALID_IMAGE_DATA_URL.test(config.imageDataUrl as string)) {
    errors.push({
      field: "imageDataUrl",
      message: "La imagen de la marca debe ser PNG o WebP en formato data URL",
    });
  }

  errors.push(...validateRanges(config));

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
