/**
 * Store reactivo global del editor (EditorStore).
 *
 * Capa de aplicación: coordina el estado de los archivos cargados, la
 * configuración del watermark y el procesamiento por lotes. Expone una
 * única instancia (`editor`) que todos los componentes Svelte leen y
 * modifican. No importa nada de los componentes; las dependencias van
 * siempre hacia dentro (dominio).
 *
 * El `$effect.root` del constructor existe para ejecutar un efecto de
 * Svelte 5 fuera del ciclo de vida de un componente (desde una clase).
 * Sin él, el `$effect` de persistencia en localStorage no se registraría
 * porque no hay un componente padre que lo ancle.
 *
 * @module state/editor
 */
import {
  DEFAULT_CONFIG,
  LIMITS,
  WatermarkError,
  type FileItem,
  type WatermarkConfig,
} from "../watermark/types";
import {
  clearConfigFromStorage,
  loadConfigFromStorage,
  saveConfigToStorage,
} from "../storage";

type RejectedFile = { file: File; reason: string };

type AddFilesResult = {
  accepted: FileItem[];
  rejected: RejectedFile[];
};

function detectType(file: File): "pdf" | "image" | null {
  const name = file.name.toLowerCase();
  const mime = file.type;
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/webp" ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  ) {
    return "image";
  }
  return null;
}

class EditorStore {
  files = $state<FileItem[]>([]);
  activeFileId = $state<string | null>(null);
  config = $state<WatermarkConfig>(loadConfigFromStorage() ?? { ...DEFAULT_CONFIG });
  isProcessing = $state(false);
  progress = $state({ current: 0, total: 0 });
  fatalError = $state<string | null>(null);

  // Pagina actualmente visible en el preview por archivo. Reactivo para que los
  // chips de PageSelector y el slider compartan la misma fuente de verdad.
  #previewPage = $state<Record<string, number>>({});

  activeFile = $derived(this.files.find((f) => f.id === this.activeFileId) ?? null);
  totalSizeBytes = $derived(this.files.reduce((acc, f) => acc + f.file.size, 0));

  canDownload = $derived(
    this.files.length > 0 &&
      // Aceptamos descargar si hay texto O imagen como marca. La validacion
      // exhaustiva la hace validateConfig; aqui solo bloqueamos el boton para
      // que el usuario no descargue un archivo sin marca alguna.
      (this.config.text.trim().length > 0 ||
        (typeof this.config.imageDataUrl === "string" && this.config.imageDataUrl.length > 0)) &&
      !this.isProcessing &&
      this.files.every(
        (f) => f.type === "image" || (f.selectedPages !== undefined && f.selectedPages.length > 0),
      ),
  );

  constructor() {
    if (typeof window !== "undefined") {
      $effect.root(() => {
        $effect(() => {
          saveConfigToStorage({ ...this.config });
        });
      });
    }
  }

  async addFiles(input: File[]): Promise<AddFilesResult> {
    const accepted: FileItem[] = [];
    const rejected: RejectedFile[] = [];
    let availableSlots = LIMITS.MAX_FILES_PER_BATCH - this.files.length;

    for (const file of input) {
      if (availableSlots <= 0) {
        rejected.push({
          file,
          reason: `No se pueden añadir más archivos (límite de ${LIMITS.MAX_FILES_PER_BATCH})`,
        });
        continue;
      }
      const type = detectType(file);
      if (!type) {
        rejected.push({
          file,
          reason: "Formato no admitido. Se aceptan PDF, PNG, JPG, JPEG y WebP.",
        });
        continue;
      }
      if (file.size > LIMITS.MAX_FILE_SIZE_BYTES) {
        rejected.push({
          file,
          reason: `El archivo supera el límite de ${LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
        });
        continue;
      }
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      const item: FileItem = {
        id,
        file,
        type,
        previewUrl,
        status: "pending",
      };
      if (type === "pdf") {
        const { readPdfMetadata } = await import("../watermark/pdf");
        const meta = await readPdfMetadata(file);
        if (meta.ok) {
          item.pageCount = meta.pageCount;
          item.selectedPages = Array.from({ length: meta.pageCount }, (_, i) => i + 1);
        } else if (meta.reason === "protected") {
          // Aceptamos el archivo pero lo marcamos como error visible al usuario,
          // en lugar de silenciar el cifrado con ignoreEncryption.
          item.status = "error";
          item.errorMessage = meta.message;
        } else {
          URL.revokeObjectURL(previewUrl);
          rejected.push({ file, reason: meta.message });
          continue;
        }
      }
      accepted.push(item);
      availableSlots -= 1;
    }

    if (accepted.length > 0) {
      this.files = [...this.files, ...accepted];
      if (this.activeFileId === null) {
        this.activeFileId = accepted[0]!.id;
      }
    }
    return { accepted, rejected };
  }

  removeFile(id: string): void {
    const target = this.files.find((f) => f.id === id);
    if (target) {
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {
        // ignorar errores de revocacion
      }
    }
    this.files = this.files.filter((f) => f.id !== id);
    if (this.activeFileId === id) {
      this.activeFileId = this.files[0]?.id ?? null;
    }
    if (id in this.#previewPage) {
      const { [id]: _, ...rest } = this.#previewPage;
      this.#previewPage = rest;
    }
  }

  getPreviewPage(fileId: string): number {
    return this.#previewPage[fileId] ?? 1;
  }

  setPreviewPage(fileId: string, page: number): void {
    const target = this.files.find((f) => f.id === fileId);
    if (!target || target.type !== "pdf") return;
    const total = target.pageCount ?? 1;
    const clamped = Math.max(1, Math.min(total, Math.trunc(page)));
    this.#previewPage = { ...this.#previewPage, [fileId]: clamped };
  }

  setActive(id: string): void {
    if (this.files.some((f) => f.id === id)) {
      this.activeFileId = id;
    }
  }

  updateConfig(patch: Partial<WatermarkConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  // Reset solo de la posicion personalizada del patron single-center.
  // Devolvemos el valor a null sin tocar el resto de la configuracion para
  // que el usuario pueda recolocar la marca al centro sin perder ajustes.
  clearCustomPosition(): void {
    this.config = { ...this.config, customPosition: null };
  }

  // Carga/limpia la imagen de marca de agua. La imagen se persiste como data
  // URL en localStorage junto al resto de la configuracion. El caller es
  // responsable de validar tamaño y formato antes de invocar este metodo.
  setWatermarkImage(dataUrl: string | null): void {
    this.config = { ...this.config, imageDataUrl: dataUrl };
  }

  clearStorage(): void {
    clearConfigFromStorage();
    this.config = { ...DEFAULT_CONFIG };
  }

  togglePage(fileId: string, pageNumber: number): void {
    const next = this.files.map((f) => {
      if (f.id !== fileId || f.type !== "pdf" || !f.selectedPages || !f.pageCount) return f;
      if (f.pageCount === 1) return f;
      const isSelected = f.selectedPages.includes(pageNumber);
      const updated = isSelected
        ? f.selectedPages.filter((n) => n !== pageNumber)
        : [...f.selectedPages, pageNumber].sort((a, b) => a - b);
      return { ...f, selectedPages: updated };
    });
    this.files = next;
  }

  async runBatch(): Promise<void> {
    if (this.isProcessing || this.files.length === 0) return;
    this.fatalError = null;
    this.isProcessing = true;
    this.progress = { current: 0, total: this.files.length };

    // Preservamos los archivos que ya estan en error (p. ej. PDFs protegidos):
    // no se procesan ni se les resetea el estado, pero siguen visibles.
    this.files = this.files.map((f) =>
      f.status === "error" && f.errorMessage
        ? f
        : { ...f, status: "pending", resultBlob: undefined, errorMessage: undefined },
    );

    let imageEngine: typeof import("../watermark/image") | null = null;
    let pdfEngine: typeof import("../watermark/pdf") | null = null;

    for (let i = 0; i < this.files.length; i += 1) {
      const current = this.files[i]!;
      this.progress = { current: i + 1, total: this.files.length };
      if (current.status === "error") {
        // Saltamos archivos ya marcados como error sin tocar su estado.
        continue;
      }
      this.files = this.files.map((f) =>
        f.id === current.id ? { ...f, status: "processing" } : f,
      );
      try {
        let blob: Blob;
        if (current.type === "image") {
          if (!imageEngine) imageEngine = await import("../watermark/image");
          blob = await imageEngine.applyWatermarkToImage(current.file, this.config);
        } else {
          if (!pdfEngine) pdfEngine = await import("../watermark/pdf");
          blob = await pdfEngine.applyWatermarkToPdf(
            current.file,
            this.config,
            current.selectedPages ?? [],
          );
        }
        this.files = this.files.map((f) =>
          f.id === current.id ? { ...f, status: "done", resultBlob: blob } : f,
        );
      } catch (err) {
        const message = err instanceof WatermarkError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Fallo desconocido al procesar el archivo";
        this.files = this.files.map((f) =>
          f.id === current.id ? { ...f, status: "error", errorMessage: message } : f,
        );
      }
    }

    this.isProcessing = false;
    const completed = this.files.filter((f) => f.status === "done" && f.resultBlob);
    if (completed.length === 0) {
      this.fatalError = "Ningún archivo se pudo procesar correctamente";
      return;
    }
    try {
      const { downloadResults } = await import("../zip");
      await downloadResults(completed);
    } catch (err) {
      this.fatalError = err instanceof Error ? err.message : "Fallo al empaquetar el resultado";
    }
  }
}

export const editor = new EditorStore();
