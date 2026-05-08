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
};

export type FileItem = {
  id: string;
  file: File;
  type: FileType;
  pageCount?: number;
  selectedPages?: number[];
  previewUrl: string;
  status: FileStatus;
  resultBlob?: Blob;
  errorMessage?: string;
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
};

export const LIMITS = {
  MAX_FILE_SIZE_BYTES: 200 * 1024 * 1024,
  MAX_FILES_PER_BATCH: 50,
  MAX_TEXT_LENGTH: 60,
  MIN_FONT_SIZE: 12,
  MAX_FONT_SIZE: 120,
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
  // Limites para imagenes usadas como marca de agua. Mantenemos PNG y WebP
  // como unicos formatos aceptados porque ambos soportan transparencia y son
  // los unicos que pdf-lib puede embeber sin transcodificar.
  WATERMARK_IMAGE_MAX_BYTES: 2 * 1024 * 1024,
  WATERMARK_IMAGE_MAX_DIMENSION: 2000,
  WATERMARK_IMAGE_MIME_TYPES: ["image/png", "image/webp"] as const,
} as const;

export type AcceptedExtension = (typeof LIMITS.ACCEPTED_EXTENSIONS)[number];
export type AcceptedMimeType = (typeof LIMITS.ACCEPTED_MIME_TYPES)[number];
