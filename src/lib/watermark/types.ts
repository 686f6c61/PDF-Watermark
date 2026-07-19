export type Pattern = "diagonal" | "single-center" | "corner" | "spiral";
export type FontFamily = "sans" | "serif" | "mono";
export type FileType = "pdf" | "image";
export type FileStatus = "pending" | "processing" | "done" | "error";

export type CustomPosition = {
  // Coordenadas normalizadas entre 0 y 1 respecto al ancho/alto del lienzo.
  // (0, 0) es la esquina superior izquierda; (1, 1) la inferior derecha.
  // Esta normalizacion permite que la misma configuracion encaje en
  // cualquier tamaño de pagina o imagen sin recalcular pixeles.
  x: number;
  y: number;
};

export type WatermarkConfig = {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  pattern: Pattern;
  density: number;
  fontFamily: FontFamily;
  // Posicion personalizada para el patron `single-center` (drag del usuario).
  // Solo aplica cuando pattern === "single-center"; el resto la ignora.
  // Si es null o undefined, single-center cae al centro geometrico.
  customPosition?: CustomPosition | null;
  // Imagen como marca de agua (data URL PNG/WebP). Si esta presente, los
  // motores la dibujan en lugar del texto. Persistida en localStorage.
  imageDataUrl?: string | null;
  // Cuando es true, fontSize se interpreta RELATIVO al ancho del lienzo: el
  // tamaño efectivo se escala proporcionalmente respecto a un lienzo de
  // referencia de REFERENCE_CANVAS_WIDTH de ancho (ver resolveEffectiveFontSize
  // en patterns.ts). Util para lotes mixtos (A4/A3, fotos de 400 y 4000 px)
  // donde un tamaño absoluto queda desproporcionado entre archivos.
  relativeSize?: boolean;
  // Tamaño de la marca de IMAGEN en porcentaje (5-100) del mayor tamaño que
  // cabe bajo el techo que impone el patron conservando la proporcion del
  // logo (ver computeImageWatermarkSizeFromScale). Solo aplica en modo
  // imagen y, a diferencia del fontSize, es monotono en todo su rango: se
  // define respecto al propio techo, asi que el control nunca "muere"
  // clampeado.
  imageScale?: number;
};

// Ancho del lienzo de referencia para relativeSize: el ancho de un A4 en
// puntos (595 pt). Los pixeles de imagen se tratan igual que puntos: con
// relativeSize activo, un fontSize F sobre un lienzo de W de ancho se dibuja
// a F * (W / REFERENCE_CANVAS_WIDTH).
export const REFERENCE_CANVAS_WIDTH = 595;

// Códigos estables de error por archivo. El store los emite y la UI los
// traduce con las claves "errors.<codigo>" de i18n (ver FileList y
// FileDropzone), de modo que el dominio nunca guarda cadenas de un idioma.
export type FileErrorCode =
  | "limitBatch"
  | "formatRejected"
  | "fileTooLarge"
  | "pdfProtected"
  | "pdfDamaged"
  | "unknown";

// Códigos de error fatal de un lote completo (editor.fatalErrorCode). Incluye
// los FileErrorCode porque un fallo de motor en el lote personalizado aborta
// todo el proceso y se comunica con la misma clave que un error por archivo.
export type FatalErrorCode =
  | FileErrorCode
  | "fatalNothingProcessed"
  | "fatalPackagingFailure"
  | "invalidConfig"
  | "textNotEncodable"
  | "batchTooManySteps";

export type FileItem = {
  id: string;
  file: File;
  type: FileType;
  pageCount?: number;
  selectedPages?: number[];
  previewUrl: string;
  status: FileStatus;
  resultBlob?: Blob;
  errorCode?: FileErrorCode;
};

export type Position = {
  x: number;
  y: number;
  rotation: number;
};

export type EditorStateSnapshot = {
  files: FileItem[];
  activeFileId: string | null;
  config: WatermarkConfig;
  isProcessing: boolean;
  progress: { current: number; total: number };
};

export type WatermarkErrorCode =
  | "INVALID_FORMAT"
  | "TOO_LARGE"
  | "BATCH_LIMIT"
  | "PARSE_ERROR"
  | "PROTECTED_PDF"
  | "OUT_OF_MEMORY"
  | "UNKNOWN";

export class WatermarkError extends Error {
  readonly code: WatermarkErrorCode;
  override readonly cause?: unknown;

  constructor(code: WatermarkErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "WatermarkError";
    this.code = code;
    this.cause = cause;
  }
}

export const DEFAULT_CONFIG: WatermarkConfig = {
  text: "",
  fontSize: 48,
  color: "#000000",
  opacity: 0.3,
  rotation: -30,
  pattern: "diagonal",
  density: 4,
  fontFamily: "sans",
  relativeSize: false,
  imageScale: 100,
};

export const LIMITS = {
  MAX_FILE_SIZE_BYTES: 200 * 1024 * 1024,
  MAX_FILES_PER_BATCH: 50,
  MAX_TEXT_LENGTH: 60,
  // Maximo de lineas del texto de la marca (separadas por \n). Cada linea se
  // valida por separado contra WinAnsi (ver state/validation.ts).
  MAX_TEXT_LINES: 3,
  MIN_FONT_SIZE: 12,
  MAX_FONT_SIZE: 120,
  // Rango del tamaño de marca de imagen (% del techo del patron; ver
  // computeImageWatermarkSizeFromScale en image-watermark.ts).
  MIN_IMAGE_SCALE: 5,
  MAX_IMAGE_SCALE: 100,
  DEFAULT_IMAGE_SCALE: 100,
  MIN_OPACITY: 0.05,
  MAX_OPACITY: 1.0,
  MIN_ROTATION: -180,
  MAX_ROTATION: 180,
  MIN_DENSITY: 1,
  MAX_DENSITY: 10,
  ACCEPTED_EXTENSIONS: [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const,
  ACCEPTED_MIME_TYPES: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ] as const,
  // Limites para imagenes usadas como marca de agua. Aceptamos PNG y WebP
  // porque ambos soportan transparencia; ojo: pdf-lib solo embebe PNG y JPEG,
  // asi que la UI transcodifica el WebP a PNG al subirlo (WatermarkControls)
  // y el motor PDF siempre recibe PNG.
  WATERMARK_IMAGE_MAX_BYTES: 2 * 1024 * 1024,
  WATERMARK_IMAGE_MAX_DIMENSION: 2000,
  WATERMARK_IMAGE_MIME_TYPES: ["image/png", "image/webp"] as const,
  // Tope de pasos (archivos x nombres) del lote personalizado: cada paso
  // produce un blob que se acumula en un unico JSZip en RAM hasta empaquetar.
  maxBatchSteps: 500,
} as const;

export type AcceptedExtension = (typeof LIMITS.ACCEPTED_EXTENSIONS)[number];
export type AcceptedMimeType = (typeof LIMITS.ACCEPTED_MIME_TYPES)[number];
