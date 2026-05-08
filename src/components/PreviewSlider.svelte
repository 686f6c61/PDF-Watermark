<script lang="ts">
  import { onDestroy } from "svelte";
  import { editor } from "../lib/state/editor.svelte";
  import { createPointerDrag, type PointerDragHandle } from "../lib/ui/pointer-drag";
  import type { FileItem } from "../lib/watermark/types";
  import { shouldRenderWatermark } from "../lib/watermark/preview-decision";
  import { t, type Lang } from "../i18n/t";

  type Props = { file: FileItem; lang?: Lang };
  const { file, lang = "es" }: Props = $props();

  let dividerPercent = $state(50);
  let originalCanvas: HTMLCanvasElement | null = $state(null);
  let watermarkedCanvas: HTMLCanvasElement | null = $state(null);
  let containerEl: HTMLDivElement | null = $state(null);
  let isReady = $state(false);
  let errorMessage = $state<string | null>(null);
  let renderToken = 0;
  let dragHandle: PointerDragHandle | null = null;
  let watermarkDragHandle: PointerDragHandle | null = null;

  const isPdf = $derived(file.type === "pdf");
  const totalPages = $derived(file.pageCount ?? 1);
  const currentPage = $derived(editor.getPreviewPage(file.id));
  const isSingleCenter = $derived(editor.config.pattern === "single-center");

  // Posicion actual de la marca (en porcentaje del frame). Si no hay
  // customPosition definida, la marca esta en el centro (50%, 50%).
  const markPercent = $derived({
    x: editor.config.customPosition ? editor.config.customPosition.x * 100 : 50,
    y: editor.config.customPosition ? editor.config.customPosition.y * 100 : 50,
  });

  let pdfjsModule: typeof import("pdfjs-dist") | null = null;

  async function loadPdfjs() {
    if (pdfjsModule) return pdfjsModule;
    const mod = await import("pdfjs-dist");
    mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfjsModule = mod;
    return mod;
  }

  async function renderImagePreview(token: number) {
    if (!originalCanvas || !watermarkedCanvas) return;
    const url = file.previewUrl;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Imagen invalida"));
      img.src = url;
    });
    if (token !== renderToken) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const maxWidth = 600;
    const scale = w > maxWidth ? maxWidth / w : 1;
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    [originalCanvas, watermarkedCanvas].forEach((cv) => {
      cv.width = cw;
      cv.height = ch;
    });
    const ctxOriginal = originalCanvas.getContext("2d")!;
    ctxOriginal.drawImage(img, 0, 0, cw, ch);

    const { applyWatermarkToImage } = await import("../lib/watermark/image");
    if (token !== renderToken) return;
    const blob = await applyWatermarkToImage(file.file, editor.config);
    const wmImg = new Image();
    const wmUrl = URL.createObjectURL(blob);
    try {
      await new Promise<void>((resolve, reject) => {
        wmImg.onload = () => resolve();
        wmImg.onerror = () => reject(new Error("Render invalido"));
        wmImg.src = wmUrl;
      });
      if (token !== renderToken) return;
      const ctxWm = watermarkedCanvas.getContext("2d")!;
      ctxWm.drawImage(wmImg, 0, 0, cw, ch);
    } finally {
      URL.revokeObjectURL(wmUrl);
    }
  }

  async function renderPdfPreview(token: number) {
    if (!originalCanvas || !watermarkedCanvas) return;
    const pdfjs = await loadPdfjs();
    if (token !== renderToken) return;
    const buffer = await file.file.arrayBuffer();
    const originalDoc = await pdfjs.getDocument({
      data: buffer.slice(0),
      isEvalSupported: false,
    }).promise;
    if (token !== renderToken) return;
    const page = await originalDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1.4 });
    originalCanvas.width = viewport.width;
    originalCanvas.height = viewport.height;
    watermarkedCanvas.width = viewport.width;
    watermarkedCanvas.height = viewport.height;
    await page.render({
      canvasContext: originalCanvas.getContext("2d")!,
      canvas: originalCanvas,
      viewport,
    }).promise;
    if (token !== renderToken) return;

    if (!shouldRenderWatermark(file, currentPage)) {
      paintSkippedNotice(watermarkedCanvas, originalCanvas);
      return;
    }

    const { applyWatermarkToPdf } = await import("../lib/watermark/pdf");
    const wmBlob = await applyWatermarkToPdf(file.file, editor.config, [currentPage]);
    if (token !== renderToken) return;
    const wmBuffer = await wmBlob.arrayBuffer();
    const wmDoc = await pdfjs.getDocument({
      data: wmBuffer,
      isEvalSupported: false,
    }).promise;
    const wmPage = await wmDoc.getPage(currentPage);
    const wmViewport = wmPage.getViewport({ scale: 1.4 });
    watermarkedCanvas.width = wmViewport.width;
    watermarkedCanvas.height = wmViewport.height;
    await wmPage.render({
      canvasContext: watermarkedCanvas.getContext("2d")!,
      canvas: watermarkedCanvas,
      viewport: wmViewport,
    }).promise;
  }

  function paintSkippedNotice(target: HTMLCanvasElement, source: HTMLCanvasElement) {
    const ctx = target.getContext("2d");
    if (!ctx) return;
    target.width = source.width;
    target.height = source.height;
    ctx.drawImage(source, 0, 0);
    const w = target.width;
    const h = target.height;
    const boxWidth = Math.min(w * 0.7, 520);
    const boxHeight = 80;
    const boxX = (w - boxWidth) / 2;
    const boxY = (h - boxHeight) / 2;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#FFF6E5";
    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 3;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1A1A1A";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t("preview.skippedNotice", lang), w / 2, boxY + boxHeight / 2);
    ctx.restore();
  }

  let renderTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      void doRender();
    }, 150);
  }

  async function doRender() {
    isReady = false;
    errorMessage = null;
    renderToken += 1;
    const myToken = renderToken;
    try {
      if (isPdf) {
        await renderPdfPreview(myToken);
      } else {
        await renderImagePreview(myToken);
      }
      if (myToken === renderToken) {
        isReady = true;
      }
    } catch (err) {
      if (myToken === renderToken) {
        errorMessage = err instanceof Error ? err.message : t("preview.previewError", lang);
      }
    }
  }

  $effect(() => {
    void file.id;
    void currentPage;
    void file.selectedPages;
    void editor.config.text;
    void editor.config.fontSize;
    void editor.config.color;
    void editor.config.opacity;
    void editor.config.rotation;
    void editor.config.pattern;
    void editor.config.density;
    void editor.config.fontFamily;
    void editor.config.customPosition;
    void editor.config.imageDataUrl;
    scheduleRender();
  });

  function startDrag(event: PointerEvent) {
    if (!containerEl) return;
    const target = containerEl;
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // ignoramos
    }
    dragHandle?.dispose();
    dragHandle = createPointerDrag({
      getPointerId: () => event.pointerId,
      onMove: (clientX) => {
        if (!containerEl) return;
        const rect = containerEl.getBoundingClientRect();
        const x = clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
        dividerPercent = pct;
      },
      releaseCapture: (pointerId) => {
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          // ignoramos
        }
      },
    });
    dragHandle.start();
  }

  // Snap al centro: si el usuario suelta la marca a menos del 5 % del centro
  // del frame, la fijamos exactamente en (0.5, 0.5). Mejora la sensacion del
  // arrastre y evita pixel-hunting para volver al centro.
  const SNAP_TOLERANCE = 0.05;

  function snapIfNearCenter(x: number, y: number): { x: number; y: number } {
    const dx = Math.abs(x - 0.5);
    const dy = Math.abs(y - 0.5);
    if (dx < SNAP_TOLERANCE && dy < SNAP_TOLERANCE) {
      return { x: 0.5, y: 0.5 };
    }
    return { x, y };
  }

  function startWatermarkDrag(event: PointerEvent) {
    if (!containerEl) return;
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // ignoramos
    }
    watermarkDragHandle?.dispose();
    watermarkDragHandle = createPointerDrag({
      getPointerId: () => event.pointerId,
      onMove: (clientX, clientY) => {
        if (!containerEl) return;
        const rect = containerEl.getBoundingClientRect();
        const xNorm = (clientX - rect.left) / rect.width;
        const yNorm = (clientY - rect.top) / rect.height;
        const clampedX = Math.max(0, Math.min(1, xNorm));
        const clampedY = Math.max(0, Math.min(1, yNorm));
        const snapped = snapIfNearCenter(clampedX, clampedY);
        editor.updateConfig({ customPosition: { x: snapped.x, y: snapped.y } });
      },
      releaseCapture: (pointerId) => {
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          // ignoramos
        }
      },
    });
    watermarkDragHandle.start();
  }

  // Teclado: las flechas mueven la marca de a 1% para ajuste fino accesible.
  function onWatermarkKey(event: KeyboardEvent) {
    if (!isSingleCenter) return;
    const step = 0.01;
    const current = editor.config.customPosition ?? { x: 0.5, y: 0.5 };
    let next = { ...current };
    if (event.key === "ArrowLeft") next.x -= step;
    else if (event.key === "ArrowRight") next.x += step;
    else if (event.key === "ArrowUp") next.y -= step;
    else if (event.key === "ArrowDown") next.y += step;
    else return;
    event.preventDefault();
    next.x = Math.max(0, Math.min(1, next.x));
    next.y = Math.max(0, Math.min(1, next.y));
    editor.updateConfig({ customPosition: next });
  }

  onDestroy(() => {
    dragHandle?.dispose();
    dragHandle = null;
    watermarkDragHandle?.dispose();
    watermarkDragHandle = null;
    if (renderTimer) clearTimeout(renderTimer);
  });

  function onDividerKey(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      dividerPercent = Math.max(0, dividerPercent - 5);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      dividerPercent = Math.min(100, dividerPercent + 5);
    }
  }

  function prevPage() {
    editor.setPreviewPage(file.id, currentPage - 1);
  }
  function nextPage() {
    editor.setPreviewPage(file.id, currentPage + 1);
  }
</script>

<section class="preview" aria-label={t("preview.ariaLabel", lang)}>
  {#if isPdf && totalPages > 1}
    <div class="pagination">
      <button class="brut-btn small" type="button" onclick={prevPage} disabled={currentPage <= 1}>
        {t("preview.previous", lang)}
      </button>
      <span aria-live="polite">{currentPage} {t("preview.of", lang)} {totalPages}</span>
      <button class="brut-btn small" type="button" onclick={nextPage} disabled={currentPage >= totalPages}>
        {t("preview.next", lang)}
      </button>
    </div>
  {/if}

  <div class="frame" bind:this={containerEl}>
    <div class="layer original" style:clip-path={`inset(0 ${100 - dividerPercent}% 0 0)`}>
      <canvas bind:this={originalCanvas}></canvas>
    </div>
    <div class="layer watermarked" style:clip-path={`inset(0 0 0 ${dividerPercent}%)`}>
      <canvas bind:this={watermarkedCanvas}></canvas>
    </div>

    <span class="tag tag-left">{t("preview.tagOriginal", lang)}</span>
    <span class="tag tag-right">{t("preview.tagWatermarked", lang)}</span>

    <button
      class="divider"
      type="button"
      style:left={`${dividerPercent}%`}
      role="slider"
      aria-label={t("preview.dividerAria", lang)}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(dividerPercent)}
      onpointerdown={startDrag}
      onkeydown={onDividerKey}
      tabindex="0"
    >
      <span class="handle" aria-hidden="true"></span>
    </button>

    {#if isSingleCenter}
      <button
        class="watermark-handle"
        type="button"
        style:left={`${markPercent.x}%`}
        style:top={`${markPercent.y}%`}
        aria-label={t("preview.dragHandleAria", lang)}
        onpointerdown={startWatermarkDrag}
        onkeydown={onWatermarkKey}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="5 9 2 12 5 15" />
          <polyline points="9 5 12 2 15 5" />
          <polyline points="15 19 12 22 9 19" />
          <polyline points="19 9 22 12 19 15" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      </button>
    {/if}

    {#if !isReady && !errorMessage}
      <div class="loading" role="status">
        {isPdf ? t("preview.loadingPdf", lang) : t("preview.loadingImage", lang)}
      </div>
    {/if}
    {#if errorMessage}
      <div class="error" role="alert">{errorMessage}</div>
    {/if}
  </div>
</section>

<style>
  .preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }
  .pagination {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface);
    border: var(--border-thin);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    box-shadow: var(--shadow-default);
    width: fit-content;
  }
  .small {
    font-size: var(--text-small);
    padding: var(--space-1) var(--space-3);
  }
  .frame {
    position: relative;
    background: var(--surface);
    border: var(--border-thick);
    box-shadow: var(--shadow-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    flex: 1;
    min-height: 480px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .layer canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .tag {
    position: absolute;
    top: var(--space-2);
    background: var(--surface);
    border: var(--border-thin);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-tiny);
    font-weight: 800;
    text-transform: uppercase;
    border-radius: var(--radius-sm);
  }
  .tag-left {
    left: var(--space-2);
  }
  .tag-right {
    right: var(--space-2);
  }
  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--ink);
    border: none;
    transform: translateX(-2px);
    cursor: ew-resize;
    padding: 0;
  }
  .handle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 32px;
    background: var(--accent-peach);
    border: var(--border-thick);
    box-shadow: var(--shadow-default);
    border-radius: var(--radius-sm);
  }
  .watermark-handle {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    background: var(--accent-pink);
    border: var(--border-thick);
    box-shadow: var(--shadow-default);
    border-radius: 50%;
    cursor: grab;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--ink);
    padding: 0;
    z-index: 5;
    touch-action: none;
  }
  .watermark-handle:active {
    cursor: grabbing;
  }
  .watermark-handle:focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    .watermark-handle {
      transition: none;
    }
  }
  .loading,
  .error {
    position: absolute;
    bottom: var(--space-3);
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface);
    border: var(--border-thin);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 600;
  }
  .error {
    background: color-mix(in srgb, var(--danger) 15%, var(--surface));
    border-color: var(--danger);
  }
</style>
