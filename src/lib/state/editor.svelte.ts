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
  type FatalErrorCode,
  type FileErrorCode,
  type FileItem,
  type WatermarkConfig,
} from "../watermark/types";
import {
  clearConfigFromStorage,
  loadConfigFromStorage,
  saveConfigToStorage,
} from "../storage";
import { isWinAnsiEncodable, validateConfig } from "./validation";
import { applyTextVariables } from "../watermark/text-variables";
import {
  parseBatchInput,
  slugify,
  dedupeSlugs,
  BATCH_LIMITS,
  type BatchWarning,
} from "../batch";

// Estado efimero del lote personalizado. NO se persiste en localStorage:
// los nombres del lote son potencialmente sensibles (empleados, clientes,
// destinatarios de un documento confidencial). Mantenemos esta condicion
// como invariante a nivel de modulo: nada de este tipo entra en el store
// persistente.
type BatchState = {
  enabled: boolean;
  names: string[];
  rawText: string;
  warnings: BatchWarning[];
};

type BatchManifestEntry = {
  name: string;
  folder: string;
  files: string[];
};

type RejectedFile = { file: File; code: FileErrorCode };

type AddFilesResult = {
  accepted: FileItem[];
  rejected: RejectedFile[];
};

// Espera de la persistencia debounced de la config en localStorage (ver el
// $effect del constructor). setWatermarkImage guarda aparte, sin debounce.
const PERSIST_DEBOUNCE_MS = 400;

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
  fatalErrorCode = $state<FatalErrorCode | null>(null);

  // Pagina actualmente visible en el preview por archivo. Reactivo para que los
  // chips de PageSelector y el slider compartan la misma fuente de verdad.
  #previewPage = $state<Record<string, number>>({});

  // Estado del lote personalizado (v1.2.0). Reactivo pero NO persistido.
  batchState = $state<BatchState>({
    enabled: false,
    names: [],
    rawText: "",
    warnings: [],
  });

  activeFile = $derived(this.files.find((f) => f.id === this.activeFileId) ?? null);
  totalSizeBytes = $derived(this.files.reduce((acc, f) => acc + f.file.size, 0));

  // Petición de cancelación de un lote en curso. Los runners la comprueban
  // entre pasos y salen limpios por el finally; la UI la pone con cancel().
  cancelRequested = $state(false);
  isCancelling = $derived(this.isProcessing && this.cancelRequested);

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
        // Persistencia con debounce: serializar TODA la config (incluida una
        // imagen de marca de hasta ~2,7 MB en data URL) en cada keystroke o
        // pointermove del drag bloqueaba el hilo principal con decenas de
        // escrituras por segundo. Re-programamos en cada cambio y escribimos
        // solo cuando la config lleva PERSIST_DEBOUNCE_MS quieta.
        $effect(() => {
          const snapshot = { ...this.config };
          const timer = setTimeout(() => {
            saveConfigToStorage(snapshot);
          }, PERSIST_DEBOUNCE_MS);
          return () => clearTimeout(timer);
        });
      });
    }
  }

  // Solicita cancelar el lote en curso. Los runners la atienden entre pasos;
  // mientras no hay procesamiento activo es un no-op.
  cancel(): void {
    if (!this.isProcessing) return;
    this.cancelRequested = true;
  }

  async addFiles(input: File[]): Promise<AddFilesResult> {
    // Durante un lote no aceptamos altas: el progreso ya esta fijado y los
    // runners trabajan sobre una copia de la cola, asi que un alta en
    // caliente quedaria huerfana. No-op con retorno vacio.
    if (this.isProcessing) return { accepted: [], rejected: [] };
    const accepted: FileItem[] = [];
    const rejected: RejectedFile[] = [];
    let availableSlots = LIMITS.MAX_FILES_PER_BATCH - this.files.length;

    for (const file of input) {
      if (availableSlots <= 0) {
        rejected.push({ file, code: "limitBatch" });
        continue;
      }
      const type = detectType(file);
      if (!type) {
        rejected.push({ file, code: "formatRejected" });
        continue;
      }
      if (file.size > LIMITS.MAX_FILE_SIZE_BYTES) {
        rejected.push({ file, code: "fileTooLarge" });
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
          item.errorCode = "pdfProtected";
        } else {
          URL.revokeObjectURL(previewUrl);
          rejected.push({ file, code: "pdfDamaged" });
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
    // Durante un lote no se puede quitar: el runner ya tiene la cola
    // copiada y una baja en caliente dejaria trabajo huerfano.
    if (this.isProcessing) return;
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

  // Vacia la lista entera: revoca las previews, limpia el estado derivado y
  // resetea progreso y error fatal. No-op mientras hay un lote en curso.
  removeAllFiles(): void {
    if (this.isProcessing) return;
    for (const item of this.files) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        // ignorar errores de revocacion
      }
    }
    this.files = [];
    this.activeFileId = null;
    this.#previewPage = {};
    this.progress = { current: 0, total: 0 };
    this.fatalErrorCode = null;
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
    // Guardado inmediato, sin pasar por el debounce: la imagen cuesta de
    // generar y no debe perderse si la pestaña se cierra justo despues.
    saveConfigToStorage({ ...this.config });
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

  // Fija la seleccion de paginas de un PDF de golpe (rangos escritos por el
  // usuario, botones Todas/Ninguna). Filtra duplicados y fuera de rango y
  // deja la lista ordenada, igual que togglePage. Acepta [] (Ninguna).
  setSelectedPages(fileId: string, pages: number[]): void {
    const next = this.files.map((f) => {
      if (f.id !== fileId || f.type !== "pdf" || !f.pageCount) return f;
      const total = f.pageCount;
      const cleaned = [...new Set(pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= total))]
        .sort((a, b) => a - b);
      return { ...f, selectedPages: cleaned };
    });
    this.files = next;
  }

  async runBatch(): Promise<void> {
    if (this.isProcessing || this.files.length === 0) return;
    this.fatalErrorCode = null;
    // Puerta de seguridad: la UI limita los valores, pero la config puede
    // llegar corrupta (localStorage antiguo, estados intermedios). Si no es
    // valida, abortamos antes de tocar ningun archivo.
    if (!validateConfig(this.config).ok) {
      this.fatalErrorCode = "invalidConfig";
      return;
    }
    this.isProcessing = true;
    this.cancelRequested = false;

    // Snapshots: ni la config ni la cola deben cambiar a mitad de lote aunque
    // el estado mute por otra via. El bucle solo lee estas copias.
    const config: WatermarkConfig = { ...this.config };
    const queue = [...this.files];
    // Fecha de hoy para la variable {fecha}, fijada una vez por lote (misma
    // filosofia snapshot: no debe cambiar a mitad de lote).
    const fechaHoy = new Date().toLocaleDateString("es-ES");
    this.progress = { current: 0, total: queue.length };

    // Preservamos los archivos que ya estan en error (p. ej. PDFs protegidos):
    // no se procesan ni se les resetea el estado, pero siguen visibles.
    this.files = this.files.map((f) =>
      f.status === "error" && f.errorCode
        ? f
        : { ...f, status: "pending", resultBlob: undefined, errorCode: undefined },
    );

    let imageEngine: typeof import("../watermark/image") | null = null;
    let pdfEngine: typeof import("../watermark/pdf") | null = null;
    let cancelled = false;

    try {
      for (let i = 0; i < queue.length; i += 1) {
        if (this.cancelRequested) {
          cancelled = true;
          break;
        }
        const current = queue[i]!;
        this.progress = { current: i + 1, total: queue.length };
        if (current.status === "error") {
          // Saltamos archivos ya marcados como error sin tocar su estado.
          continue;
        }
        this.files = this.files.map((f) =>
          f.id === current.id ? { ...f, status: "processing" } : f,
        );
        try {
          let blob: Blob;
          // Variables de nivel archivo ({fecha}, {nombre}) sobre el snapshot:
          // cada archivo recibe su propia config con el texto resuelto.
          const fileConfig = resolveFileLevelVariables(config, current.file.name, fechaHoy);
          if (current.type === "image") {
            if (!imageEngine) imageEngine = await import("../watermark/image");
            blob = await imageEngine.applyWatermarkToImage(current.file, fileConfig);
          } else {
            if (!pdfEngine) pdfEngine = await import("../watermark/pdf");
            blob = await pdfEngine.applyWatermarkToPdf(
              current.file,
              fileConfig,
              current.selectedPages ?? [],
            );
          }
          this.files = this.files.map((f) =>
            f.id === current.id ? { ...f, status: "done", resultBlob: blob } : f,
          );
        } catch (err) {
          const code: FileErrorCode = err instanceof WatermarkError
            ? toFileErrorCode(err)
            : "unknown";
          this.files = this.files.map((f) =>
            f.id === current.id ? { ...f, status: "error", errorCode: code } : f,
          );
        }
      }
    } finally {
      this.isProcessing = false;
      this.cancelRequested = false;
    }

    if (cancelled) {
      // Salida limpia: sin descarga ni error fatal, progreso reseteado. Los
      // archivos procesados conservan su resultado; el resto queda pending.
      this.progress = { current: 0, total: 0 };
      return;
    }

    const completed = this.files.filter((f) => f.status === "done" && f.resultBlob);
    if (completed.length === 0) {
      this.fatalErrorCode = "fatalNothingProcessed";
      return;
    }
    try {
      const { downloadResults } = await import("../zip");
      await downloadResults(completed);
    } catch {
      this.fatalErrorCode = "fatalPackagingFailure";
    }
  }

  // --- API de lote personalizado (v1.2.0) ---------------------------------

  setBatchRawText(raw: string): void {
    const parsed = parseBatchInput(raw);
    this.batchState = {
      ...this.batchState,
      rawText: raw,
      names: parsed.names,
      warnings: parsed.warnings,
    };
  }

  enableBatch(): void {
    this.batchState = { ...this.batchState, enabled: true };
  }

  disableBatch(): void {
    // Vaciamos tambien config.text si arrastraba un nombre de la vista previa
    // para evitar que un nombre del lote acabe persistido en localStorage al
    // volver a modo "texto" tras desactivar el lote.
    if (this.batchState.enabled && this.batchState.names.includes(this.config.text)) {
      this.config = { ...this.config, text: "" };
    }
    this.batchState = { enabled: false, names: [], rawText: "", warnings: [] };
  }

  /**
   * Procesa un PDF/imagen + N nombres y produce un único ZIP con una
   * subcarpeta por nombre (slug) y un `manifest.json` en la raíz.
   *
   * Estructura resultante:
   *   marcas-personalizadas-2026-05-08.zip
   *   ├── manifest.json
   *   ├── juan-perez/
   *   │   ├── informe-watermarked.pdf
   *   │   └── logo-watermarked.png
   *   └── maria-gomez/
   *       └── ...
   *
   * No persiste estado en localStorage. La privacidad del nombre se respeta
   * a nivel del store (`batchState`) y de los logs (no escribimos nombres).
   */
  async runWatermarkBatchPersonalized(): Promise<void> {
    if (!this.batchState.enabled) return;
    if (this.isProcessing) return;
    if (this.batchState.names.length === 0) return;
    if (this.files.length === 0) return;

    this.fatalErrorCode = null;
    // Misma puerta de seguridad que en runBatch: config invalida -> abortar
    // antes de procesar nada.
    if (!validateConfig(this.config).ok) {
      this.fatalErrorCode = "invalidConfig";
      return;
    }
    // Los nombres se dibujan como texto con fuentes WinAnsi: un nombre con
    // emoji/CJK/arabe haria lanzar a pdf-lib a mitad del lote. Lo detectamos
    // aqui, antes de generar un solo archivo.
    if (!this.batchState.names.every(isWinAnsiEncodable)) {
      this.fatalErrorCode = "textNotEncodable";
      return;
    }

    // Snapshots de cola y config: el lote no debe ver cambios en caliente.
    const names = [...this.batchState.names];
    const queue = [...this.files];
    const baseConfig: WatermarkConfig = { ...this.config };
    // Misma fecha fijada para todo el lote (variable {fecha}), como en runBatch.
    const fechaHoy = new Date().toLocaleDateString("es-ES");

    // Tope de pasos: cada paso genera un blob que se acumula en un unico
    // JSZip en RAM hasta el empaquetado final. Por encima del limite,
    // abortamos antes de generar nada.
    if (queue.length * names.length > LIMITS.maxBatchSteps) {
      this.fatalErrorCode = "batchTooManySteps";
      return;
    }

    this.isProcessing = true;
    this.cancelRequested = false;

    const folders = dedupeSlugs(names.map((n) => slugify(n)));
    const totalSteps = names.length * queue.length;
    this.progress = { current: 0, total: totalSteps };

    let imageEngine: typeof import("../watermark/image") | null = null;
    let pdfEngine: typeof import("../watermark/pdf") | null = null;

    const JSZipModule = await import("jszip");
    const zip = new JSZipModule.default();
    const manifest: BatchManifestEntry[] = [];
    let stepCounter = 0;
    let successCount = 0;
    let cancelled = false;
    // Un archivo que falla para un nombre fallara para todos (el error es del
    // archivo, no del nombre): lo marcamos una vez y lo saltamos en adelante.
    const failedIds = new Set<string>();

    try {
      for (let i = 0; i < names.length; i += 1) {
        if (this.cancelRequested) {
          cancelled = true;
          break;
        }
        const personName = names[i]!;
        const folder = folders[i]!;
        const personConfig: WatermarkConfig = { ...baseConfig, text: personName };
        const filesPerPerson: string[] = [];

        for (const item of queue) {
          if (this.cancelRequested) {
            cancelled = true;
            break;
          }
          stepCounter += 1;
          this.progress = { current: stepCounter, total: totalSteps };

          if (item.status === "error" || failedIds.has(item.id)) continue;

          // Cada paso va aislado: un archivo malo no aborta el lote entero,
          // se marca en su FileItem y se continua con el siguiente.
          try {
            let blob: Blob;
            // El texto del lote personalizado es el propio nombre, pero las
            // variables de nivel archivo ({fecha}, {nombre}) aplican igual.
            const personFileConfig = resolveFileLevelVariables(
              personConfig,
              item.file.name,
              fechaHoy,
            );
            if (item.type === "image") {
              if (!imageEngine) imageEngine = await import("../watermark/image");
              blob = await imageEngine.applyWatermarkToImage(item.file, personFileConfig);
            } else {
              if (!pdfEngine) pdfEngine = await import("../watermark/pdf");
              blob = await pdfEngine.applyWatermarkToPdf(
                item.file,
                personFileConfig,
                item.selectedPages ?? [],
              );
            }

            const outputName = buildBatchOutputName(item.file.name, item.type);
            zip.file(`${folder}/${outputName}`, blob);
            filesPerPerson.push(outputName);
            successCount += 1;
          } catch (err) {
            const code: FileErrorCode = err instanceof WatermarkError
              ? toFileErrorCode(err)
              : "unknown";
            failedIds.add(item.id);
            this.files = this.files.map((f) =>
              f.id === item.id ? { ...f, status: "error", errorCode: code } : f,
            );
          }
        }

        if (cancelled) break;
        manifest.push({ name: personName, folder, files: filesPerPerson });
      }

      if (!cancelled) {
        if (successCount === 0) {
          // Misma semantica que runBatch: si nada salio bien, no hay ZIP.
          this.fatalErrorCode = "fatalNothingProcessed";
        } else {
          // Fallos parciales: ya estan marcados por archivo; el ZIP sale
          // con lo bueno.
          zip.file("manifest.json", JSON.stringify(manifest, null, 2));
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const { saveAs } = await import("file-saver");
          const stamp = todayStamp(new Date());
          saveAs(zipBlob, `marcas-personalizadas-${stamp}.zip`);
        }
      }
    } catch (err) {
      this.fatalErrorCode =
        err instanceof WatermarkError ? toFileErrorCode(err) : "fatalPackagingFailure";
    } finally {
      this.isProcessing = false;
      this.cancelRequested = false;
    }

    if (cancelled) {
      // Salida limpia: sin ZIP ni error fatal, progreso reseteado.
      this.progress = { current: 0, total: 0 };
    }
  }
}

// --- helpers privados del modulo (no exportados) --------------------------

// Resuelve las variables de nivel archivo ({fecha}, {nombre}) en el texto de
// la config para UN archivo concreto. {pagina}/{total} no se tocan aqui: las
// sustituye el motor en el bucle de paginas (ver watermark/pdf.ts).
// OJO: {nombre} puede introducir caracteres no WinAnsi (p. ej. un nombre de
// archivo en chino). En ese caso el motor PDF lanzara el error de
// codificacion WinAnsi al medir/dibujar el texto y el runner marcara el
// archivo como error ("unknown"); no hace falta mas tratamiento.
function resolveFileLevelVariables(
  config: WatermarkConfig,
  fileName: string,
  fecha: string,
): WatermarkConfig {
  const dot = fileName.lastIndexOf(".");
  const nombre = dot <= 0 ? fileName : fileName.slice(0, dot);
  return { ...config, text: applyTextVariables(config.text, { fecha, nombre }) };
}

// Mapea los códigos tecnicos de WatermarkError (dominio) a los códigos
// estables que la UI traduce con las claves "errors.*" de i18n.
function toFileErrorCode(err: WatermarkError): FileErrorCode {
  switch (err.code) {
    case "PROTECTED_PDF":
      return "pdfProtected";
    case "PARSE_ERROR":
      return "pdfDamaged";
    case "INVALID_FORMAT":
      return "formatRejected";
    case "TOO_LARGE":
      return "fileTooLarge";
    case "BATCH_LIMIT":
      return "limitBatch";
    default:
      // OUT_OF_MEMORY y UNKNOWN no tienen clave propia: mensaje generico.
      return "unknown";
  }
}

function todayStamp(date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildBatchOutputName(originalName: string, type: "pdf" | "image"): string {
  const dot = originalName.lastIndexOf(".");
  const base = dot === -1 ? originalName : originalName.slice(0, dot);
  const ext =
    dot === -1
      ? type === "pdf"
        ? "pdf"
        : "png"
      : originalName.slice(dot + 1).toLowerCase();
  return `${base}-watermarked.${ext}`;
}

// Re-export para que callers externos (UI) puedan leer los limites sin
// importar dos modulos distintos.
export { BATCH_LIMITS };

export const editor = new EditorStore();
