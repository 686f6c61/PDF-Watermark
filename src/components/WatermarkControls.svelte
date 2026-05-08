<script lang="ts">
  import { editor } from "../lib/state/editor.svelte";
  import { LIMITS, type FontFamily, type Pattern } from "../lib/watermark/types";
  import { downloadBatchTemplate } from "../lib/batch-template";
  import { t, type Lang } from "../i18n/t";

  type Props = { lang?: Lang };
  const { lang = "es" }: Props = $props();

  const COLOR_PRESETS = ["#000000", "#FFFFFF", "#FF0000"] as const;
  const FONT_FAMILIES: Array<{ value: FontFamily; key: string }> = [
    { value: "sans", key: "controls.fontSans" },
    { value: "serif", key: "controls.fontSerif" },
    { value: "mono", key: "controls.fontMono" },
  ];
  const PATTERNS: Array<{ value: Pattern; key: string; icon: string }> = [
    { value: "diagonal", key: "controls.patternDiagonal", icon: "diagonal" },
    { value: "single-center", key: "controls.patternCenter", icon: "center" },
    { value: "corner", key: "controls.patternCorner", icon: "corner" },
    { value: "spiral", key: "controls.patternSpiral", icon: "spiral" },
  ];

  const densityVisible = $derived(
    editor.config.pattern === "diagonal" || editor.config.pattern === "spiral",
  );

  // Modo activo de la marca: texto, imagen o lote personalizado. Estado
  // local porque el usuario puede pulsar "Imagen" antes de subir nada
  // (tenemos que mostrar el input file), y NO podemos derivarlo solo de
  // imageDataUrl (eso seria un circulo: sin imagen no hay modo imagen, asi
  // que el input file no aparece, asi que el usuario no puede subir imagen).
  type WatermarkMode = "text" | "image" | "batch";
  let watermarkMode = $state<WatermarkMode>(
    typeof editor.config.imageDataUrl === "string" && editor.config.imageDataUrl.length > 0
      ? "image"
      : "text",
  );

  // Si el usuario carga una imagen desde fuera (por ejemplo restaurando
  // configuracion de localStorage al recargar), sincronizamos al modo imagen.
  // Solo si no estamos ya en modo lote: el lote tiene precedencia mientras
  // este activo.
  $effect(() => {
    if (
      typeof editor.config.imageDataUrl === "string" &&
      editor.config.imageDataUrl.length > 0 &&
      watermarkMode === "text"
    ) {
      watermarkMode = "image";
    }
  });

  // Indice del nombre seleccionado para la vista previa cuando el lote esta
  // activo. Se resetea si el numero de nombres cambia.
  let batchPreviewIndex = $state(0);
  $effect(() => {
    if (batchPreviewIndex >= editor.batchState.names.length) {
      batchPreviewIndex = 0;
    }
  });

  // Sincroniza el config.text con el nombre seleccionado para que el preview
  // (que reacciona a config.text) muestre la marca real del destinatario.
  $effect(() => {
    if (
      watermarkMode === "batch" &&
      editor.batchState.enabled &&
      editor.batchState.names.length > 0
    ) {
      const selected = editor.batchState.names[batchPreviewIndex] ?? "";
      if (selected.length > 0 && editor.config.text !== selected) {
        editor.updateConfig({ text: selected });
      }
    }
  });

  let batchTextarea: HTMLTextAreaElement | null = $state(null);

  const showResetCustomPosition = $derived(
    editor.config.pattern === "single-center" && editor.config.customPosition !== null && editor.config.customPosition !== undefined,
  );

  let imageError = $state<string | null>(null);

  function setText(event: Event) {
    const target = event.target as HTMLInputElement;
    editor.updateConfig({ text: target.value.slice(0, LIMITS.MAX_TEXT_LENGTH) });
  }
  function setFontSize(event: Event) {
    editor.updateConfig({ fontSize: Number((event.target as HTMLInputElement).value) });
  }
  function setOpacity(event: Event) {
    editor.updateConfig({ opacity: Number((event.target as HTMLInputElement).value) });
  }
  function setRotation(event: Event) {
    editor.updateConfig({ rotation: Number((event.target as HTMLInputElement).value) });
  }
  function setDensity(event: Event) {
    editor.updateConfig({ density: Number((event.target as HTMLInputElement).value) });
  }
  function setColor(event: Event) {
    editor.updateConfig({ color: (event.target as HTMLInputElement).value });
  }
  function setColorHex(value: string) {
    editor.updateConfig({ color: value });
  }
  function setPattern(value: Pattern) {
    editor.updateConfig({ pattern: value });
  }
  function setFontFamily(value: FontFamily) {
    editor.updateConfig({ fontFamily: value });
  }
  function resetRotation() {
    editor.updateConfig({ rotation: 0 });
  }
  function clearStorage() {
    editor.clearStorage();
  }
  function resetCustomPosition() {
    editor.clearCustomPosition();
  }

  function setMode(mode: WatermarkMode) {
    watermarkMode = mode;
    if (mode === "text") {
      editor.setWatermarkImage(null);
      editor.disableBatch();
      imageError = null;
    } else if (mode === "image") {
      editor.disableBatch();
    } else {
      // mode === "batch": desactivamos imagen y activamos el lote.
      editor.setWatermarkImage(null);
      editor.enableBatch();
      // Foco en textarea al cambiar a modo lote (accesibilidad).
      queueMicrotask(() => batchTextarea?.focus());
    }
  }

  function onBatchInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    editor.setBatchRawText(target.value);
  }

  async function onBatchFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = "";
    if (!file) return;
    const text = await file.text();
    editor.setBatchRawText(text);
  }

  function onDownloadTemplate() {
    downloadBatchTemplate(lang);
  }

  function onBatchPreviewSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    batchPreviewIndex = Number(target.value);
  }

  // Mensajes de error/aviso del lote (mapeados a las claves de i18n).
  const batchMessages = $derived.by((): Array<{ kind: "error" | "warn"; text: string }> => {
    const out: Array<{ kind: "error" | "warn"; text: string }> = [];
    const warnings = editor.batchState.warnings;
    const noFiles = editor.files.length === 0;
    if (watermarkMode !== "batch") return out;
    if (noFiles) {
      out.push({ kind: "error", text: t("batch.errorNoFiles", lang) });
    }
    if (warnings.includes("empty") && editor.batchState.rawText.length > 0) {
      out.push({ kind: "error", text: t("batch.errorTooFew", lang) });
    }
    if (warnings.includes("too-many")) {
      out.push({ kind: "warn", text: t("batch.errorTooMany", lang) });
    }
    if (warnings.includes("duplicates")) {
      out.push({ kind: "warn", text: t("batch.errorDuplicates", lang) });
    }
    if (warnings.includes("invalid-length")) {
      out.push({ kind: "warn", text: t("batch.errorInvalidLength", lang) });
    }
    return out;
  });

  function batchCounterText(): string {
    const template = t("batch.counter", lang);
    return template.replace("{count}", editor.batchState.names.length.toString());
  }

  // Carga del archivo PNG/WebP. Validamos en el cliente antes de aceptar:
  // mime, tamaño y dimensiones. Si pasa, leemos como data URL y guardamos.
  function onImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = "";
    if (!file) return;
    imageError = null;
    const validMime = (LIMITS.WATERMARK_IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
    if (!validMime) {
      imageError = t("controls.imageInvalid", lang);
      return;
    }
    if (file.size > LIMITS.WATERMARK_IMAGE_MAX_BYTES) {
      imageError = t("controls.imageInvalid", lang);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) {
        imageError = t("controls.imageInvalid", lang);
        return;
      }
      // Validamos dimensiones tras cargar la imagen en memoria.
      const img = new Image();
      img.onload = () => {
        if (
          img.naturalWidth > LIMITS.WATERMARK_IMAGE_MAX_DIMENSION ||
          img.naturalHeight > LIMITS.WATERMARK_IMAGE_MAX_DIMENSION
        ) {
          imageError = t("controls.imageInvalid", lang);
          return;
        }
        editor.setWatermarkImage(dataUrl);
      };
      img.onerror = () => {
        imageError = t("controls.imageInvalid", lang);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      imageError = t("controls.imageInvalid", lang);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    editor.setWatermarkImage(null);
    imageError = null;
  }
</script>

<aside class="controls" aria-label={t("controls.ariaLabel", lang)}>
  <h3>{t("controls.title", lang)}</h3>

  <fieldset>
    <legend class="legend">{t("controls.modeAriaLabel", lang)}</legend>
    <div class="row" role="radiogroup" aria-label={t("controls.modeAriaLabel", lang)}>
      <button
        type="button"
        class="brut-btn"
        aria-pressed={watermarkMode === "text"}
        data-active={watermarkMode === "text"}
        onclick={() => setMode("text")}
        disabled={editor.isProcessing}
      >
        {t("controls.modeText", lang)}
      </button>
      <button
        type="button"
        class="brut-btn"
        aria-pressed={watermarkMode === "image"}
        data-active={watermarkMode === "image"}
        onclick={() => setMode("image")}
        disabled={editor.isProcessing}
      >
        {t("controls.modeImage", lang)}
      </button>
      <button
        type="button"
        class="brut-btn"
        aria-pressed={watermarkMode === "batch"}
        data-active={watermarkMode === "batch"}
        onclick={() => setMode("batch")}
        disabled={editor.isProcessing}
      >
        {t("controls.modeBatch", lang)}
      </button>
    </div>
  </fieldset>

  {#if watermarkMode === "batch"}
    <fieldset>
      <h4 class="batch-title">{t("batch.title", lang)}</h4>
      <p class="hint use-case">{t("batch.useCase", lang)}</p>

      <label for="wm-batch-text" class="legend">{t("batch.placeholder", lang)}</label>
      <textarea
        id="wm-batch-text"
        class="brut-input batch-textarea"
        bind:this={batchTextarea}
        placeholder={t("batch.placeholder", lang)}
        rows="8"
        value={editor.batchState.rawText}
        oninput={onBatchInput}
        disabled={editor.isProcessing}
        aria-describedby="wm-batch-counter wm-batch-messages"
      ></textarea>
      <div id="wm-batch-counter" class="counter" aria-live="polite">
        {batchCounterText()}
      </div>

      <div class="row batch-actions">
        <label class="brut-btn small file-button">
          {t("batch.uploadFile", lang)}
          <input
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onchange={onBatchFileChange}
            disabled={editor.isProcessing}
          />
        </label>
        <button
          type="button"
          class="brut-btn small"
          onclick={onDownloadTemplate}
          disabled={editor.isProcessing}
        >
          {t("batch.downloadTemplate", lang)}
        </button>
      </div>

      {#if editor.batchState.names.length > 0}
        <label for="wm-batch-preview" class="legend">{t("batch.previewLabel", lang)}</label>
        <select
          id="wm-batch-preview"
          class="brut-input"
          value={batchPreviewIndex}
          onchange={onBatchPreviewSelect}
          disabled={editor.isProcessing}
        >
          {#each editor.batchState.names as name, idx (idx)}
            <option value={idx}>{name}</option>
          {/each}
        </select>
      {/if}

      <div id="wm-batch-messages" class="batch-messages" aria-live="polite">
        {#each batchMessages as msg (msg.text)}
          <p class={msg.kind === "error" ? "invalid-msg" : "warn-msg"} role={msg.kind === "error" ? "alert" : undefined}>
            {msg.text}
          </p>
        {/each}
      </div>
    </fieldset>
  {:else if watermarkMode === "image"}
    <fieldset>
      <label for="wm-image" class="legend">{t("controls.imageUpload", lang)}</label>
      <input
        id="wm-image"
        class="brut-input"
        type="file"
        accept="image/png,image/webp"
        onchange={onImageChange}
        disabled={editor.isProcessing}
      />
      {#if editor.config.imageDataUrl}
        <div class="image-preview-row">
          <img
            class="image-preview"
            src={editor.config.imageDataUrl}
            alt={t("controls.imagePreviewAlt", lang)}
          />
          <button
            type="button"
            class="brut-btn small"
            onclick={removeImage}
            disabled={editor.isProcessing}
          >
            {t("controls.imageRemove", lang)}
          </button>
        </div>
      {/if}
      <p class="hint">{t("controls.imageHint", lang)}</p>
      {#if imageError}
        <p class="invalid-msg" role="alert">{imageError}</p>
      {/if}
    </fieldset>
  {:else}
    <fieldset>
      <label for="wm-text">{t("controls.textLabel", lang)}</label>
      <input
        id="wm-text"
        class="brut-input"
        type="text"
        maxlength={LIMITS.MAX_TEXT_LENGTH}
        placeholder={t("controls.textPlaceholder", lang)}
        value={editor.config.text}
        oninput={setText}
        class:invalid={editor.config.text.trim().length === 0}
        disabled={editor.isProcessing}
      />
      <div class="counter" aria-live="polite">
        {editor.config.text.length}/{LIMITS.MAX_TEXT_LENGTH}
      </div>
    </fieldset>

    <fieldset>
      <legend class="legend">{t("controls.fontFamilyLegend", lang)}</legend>
      <div class="row" role="radiogroup" aria-label={t("controls.fontFamilyAria", lang)}>
        {#each FONT_FAMILIES as font (font.value)}
          <button
            type="button"
            class="brut-btn"
            aria-pressed={editor.config.fontFamily === font.value}
            data-active={editor.config.fontFamily === font.value}
            onclick={() => setFontFamily(font.value)}
            disabled={editor.isProcessing}
          >
            {t(font.key, lang)}
          </button>
        {/each}
      </div>
    </fieldset>
  {/if}

  <fieldset>
    <label for="wm-size">{t("controls.size", lang)}: <span class="value">{editor.config.fontSize}px</span></label>
    <input
      id="wm-size"
      type="range"
      min={LIMITS.MIN_FONT_SIZE}
      max={LIMITS.MAX_FONT_SIZE}
      step="1"
      value={editor.config.fontSize}
      oninput={setFontSize}
      disabled={editor.isProcessing}
    />
  </fieldset>

  {#if watermarkMode === "text" || watermarkMode === "batch"}
    <fieldset>
      <label for="wm-color">{t("controls.color", lang)}</label>
      <div class="row">
        <input
          id="wm-color"
          type="color"
          value={editor.config.color}
          oninput={setColor}
          disabled={editor.isProcessing}
        />
        {#each COLOR_PRESETS as preset (preset)}
          <button
            type="button"
            class="brut-btn color-preset"
            style:background={preset}
            aria-label={`${t("controls.color", lang)} ${preset}`}
            aria-pressed={editor.config.color.toLowerCase() === preset.toLowerCase()}
            onclick={() => setColorHex(preset)}
            disabled={editor.isProcessing}
          ></button>
        {/each}
        <span class="hex value">{editor.config.color.toUpperCase()}</span>
      </div>
    </fieldset>
  {/if}

  <fieldset>
    <label for="wm-opacity">
      {t("controls.opacity", lang)}: <span class="value">{Math.round(editor.config.opacity * 100)}%</span>
    </label>
    <input
      id="wm-opacity"
      type="range"
      min={LIMITS.MIN_OPACITY}
      max={LIMITS.MAX_OPACITY}
      step="0.05"
      value={editor.config.opacity}
      oninput={setOpacity}
      disabled={editor.isProcessing}
    />
  </fieldset>

  <fieldset>
    <label for="wm-rotation">
      {t("controls.rotation", lang)}: <span class="value">{editor.config.rotation}°</span>
    </label>
    <div class="row">
      <input
        id="wm-rotation"
        type="range"
        min={LIMITS.MIN_ROTATION}
        max={LIMITS.MAX_ROTATION}
        step="1"
        value={editor.config.rotation}
        oninput={setRotation}
        disabled={editor.isProcessing}
      />
      <button class="brut-btn small" type="button" onclick={resetRotation} disabled={editor.isProcessing}>
        {t("controls.resetRotation", lang)}
      </button>
    </div>
  </fieldset>

  <fieldset>
    <legend class="legend">{t("controls.patternLegend", lang)}</legend>
    <div class="grid" role="radiogroup" aria-label={t("controls.patternAria", lang)}>
      {#each PATTERNS as pattern (pattern.value)}
        <button
          type="button"
          class="brut-btn pattern-chip"
          aria-pressed={editor.config.pattern === pattern.value}
          data-active={editor.config.pattern === pattern.value}
          onclick={() => setPattern(pattern.value)}
          disabled={editor.isProcessing}
        >
          <span class="pattern-icon" aria-hidden="true">
            {#if pattern.icon === "diagonal"}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
            {:else if pattern.icon === "center"}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="3" />
              </svg>
            {:else if pattern.icon === "corner"}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="14" y="14" width="6" height="6" />
                <rect x="3" y="3" width="18" height="18" />
              </svg>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 12 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 m 0 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0" />
              </svg>
            {/if}
          </span>
          <span>{t(pattern.key, lang)}</span>
        </button>
      {/each}
    </div>
  </fieldset>

  {#if showResetCustomPosition}
    <fieldset>
      <p class="hint">{t("controls.resetCustomPositionHint", lang)}</p>
      <button
        class="brut-btn small"
        type="button"
        onclick={resetCustomPosition}
        disabled={editor.isProcessing}
      >
        {t("controls.resetCustomPosition", lang)}
      </button>
    </fieldset>
  {/if}

  {#if densityVisible}
    <fieldset>
      <label for="wm-density">{t("controls.density", lang)}: <span class="value">{editor.config.density}</span></label>
      <input
        id="wm-density"
        type="range"
        min={LIMITS.MIN_DENSITY}
        max={LIMITS.MAX_DENSITY}
        step="1"
        value={editor.config.density}
        oninput={setDensity}
        disabled={editor.isProcessing}
      />
    </fieldset>
  {/if}

  <fieldset class="storage-row">
    <button class="brut-btn small" type="button" onclick={clearStorage} disabled={editor.isProcessing}>
      {t("controls.clearStorage", lang)}
    </button>
  </fieldset>
</aside>

<style>
  .controls {
    width: 360px;
    flex-shrink: 0;
    background: var(--surface);
    border: var(--border-thick);
    box-shadow: var(--shadow-default);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  h3 {
    font-size: var(--text-h2);
    margin: 0 0 var(--space-2) 0;
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  legend.legend {
    float: none;
    width: 100%;
    padding: 0;
    margin: 0;
    display: block;
  }
  .legend,
  label {
    font-size: var(--text-small);
    font-weight: 800;
  }
  .value {
    font-family: var(--font-mono);
    background: var(--surface);
    border: var(--border-thin);
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    margin-left: var(--space-2);
    font-size: var(--text-tiny);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }
  .pattern-chip {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    justify-content: flex-start;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-small);
  }
  .pattern-icon {
    display: inline-flex;
  }
  input[type="color"] {
    width: 40px;
    height: 40px;
    padding: 0;
    border: var(--border-thin);
    border-radius: var(--radius-sm);
    background: var(--surface);
    cursor: pointer;
  }
  .color-preset {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: var(--radius-sm);
  }
  .hex {
    margin-left: auto;
  }
  .counter {
    align-self: flex-end;
    font-family: var(--font-mono);
    font-size: var(--text-tiny);
    color: var(--ink-muted);
  }
  input.invalid {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent-lavender);
  }
  .small {
    font-size: var(--text-small);
    padding: var(--space-2) var(--space-3);
  }
  .storage-row {
    margin-top: auto;
  }
  .image-preview-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  /* Input file ocupa el 100% del fieldset para no desbordar la columna. */
  input[type="file"] {
    max-width: 100%;
    box-sizing: border-box;
  }
  .image-preview-row {
    flex-wrap: wrap;
  }
  .image-preview {
    max-width: 120px;
    max-height: 80px;
    object-fit: contain;
    border: var(--border-thin);
    box-shadow: var(--shadow-default);
    background: var(--bg);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
  }
  .hint {
    margin: 0;
    font-size: var(--text-tiny);
    color: var(--ink-muted);
    line-height: 1.3;
  }
  .invalid-msg {
    margin: 0;
    color: var(--danger);
    font-weight: 700;
    font-size: var(--text-small);
  }
  .warn-msg {
    margin: 0;
    color: var(--ink);
    background: color-mix(in srgb, var(--accent-peach) 50%, var(--surface));
    border: var(--border-thin);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: var(--text-small);
  }
  .batch-title {
    margin: 0;
    font-size: var(--text-h2);
  }
  .use-case {
    margin: 0 0 var(--space-2) 0;
  }
  .batch-textarea {
    width: 100%;
    min-height: 160px;
    font-family: var(--font-mono);
    font-size: var(--text-small);
    resize: vertical;
    box-sizing: border-box;
  }
  .batch-actions {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .batch-messages {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  /* Imitamos un boton bonito sobre el input file nativo. */
  .file-button {
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }
  .file-button input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
</style>
