<script lang="ts">
  import { editor } from "../lib/state/editor.svelte";
  import { LIMITS } from "../lib/watermark/types";
  import { t, type Lang } from "../i18n/t";

  type Props = { variant?: "hero" | "compact"; lang?: Lang };
  const { variant = "hero", lang = "es" }: Props = $props();

  let isDragOver = $state(false);
  let errorMessage = $state<string | null>(null);
  let inputRef: HTMLInputElement | null = $state(null);
  let errorTimer: ReturnType<typeof setTimeout> | null = null;

  function showError(msg: string) {
    errorMessage = msg;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = setTimeout(() => {
      errorMessage = null;
    }, 4000);
  }

  async function handleFiles(filesList: FileList | File[] | null) {
    if (!filesList) return;
    const arr = Array.from(filesList);
    if (arr.length === 0) return;
    const result = await editor.addFiles(arr);
    if (result.rejected.length > 0) {
      const first = result.rejected[0]!;
      showError(`${first.file.name}: ${first.reason}`);
    }
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }
  function onDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }
  function onDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    const files = event.dataTransfer?.files ?? null;
    void handleFiles(files);
  }
  function onPick() {
    inputRef?.click();
  }
  function onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    void handleFiles(target.files);
    target.value = "";
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick();
    }
  }
</script>

<div
  class="dropzone {variant === 'hero' ? 'hero' : 'compact'}"
  class:dragover={isDragOver}
  class:error={errorMessage !== null}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  onclick={onPick}
  onkeydown={onKey}
  role="button"
  tabindex="0"
  aria-label={t("dropzone.ariaLabel", lang)}
>
  {#if variant === "hero"}
    <svg
      aria-hidden="true"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
    <h2>{t("dropzone.title", lang)}</h2>
    <p>{t("dropzone.subtitle", lang)}</p>
    <p class="formats">{t("dropzone.formats", lang)}</p>
  {:else}
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    <span>{t("dropzone.addMore", lang)}</span>
  {/if}

  <input
    bind:this={inputRef}
    type="file"
    accept={[...LIMITS.ACCEPTED_MIME_TYPES, ...LIMITS.ACCEPTED_EXTENSIONS].join(",")}
    multiple
    hidden
    onchange={onInputChange}
  />
</div>

{#if errorMessage}
  <div class="error-msg" role="alert" aria-live="polite">{errorMessage}</div>
{/if}

<style>
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--surface);
    border: 3px dashed var(--ink);
    box-shadow: var(--shadow-large);
    border-radius: var(--radius-lg);
    color: var(--ink);
    cursor: pointer;
    transition: transform var(--motion-hover), background var(--motion-hover), border var(--motion-hover);
  }
  .hero {
    padding: var(--space-8) var(--space-6);
    gap: var(--space-3);
    min-height: 320px;
  }
  .compact {
    flex-direction: row;
    padding: var(--space-3) var(--space-4);
    gap: var(--space-2);
    box-shadow: var(--shadow-default);
    font-weight: 800;
    text-transform: uppercase;
    font-size: var(--text-small);
  }
  .dropzone.dragover {
    background: var(--accent-pink);
    border-style: solid;
    box-shadow: 8px 8px 0 #000;
  }
  .dropzone.error {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  }
  .dropzone:focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 2px;
  }
  h2 {
    font-size: var(--text-h1);
    margin: 0;
  }
  p {
    margin: 0;
    color: var(--ink-muted);
  }
  .formats {
    font-size: var(--text-small);
  }
  .error-msg {
    margin-top: var(--space-3);
    background: color-mix(in srgb, var(--danger) 15%, var(--surface));
    border: 2px solid var(--danger);
    box-shadow: var(--shadow-default);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 600;
    color: var(--ink);
  }
</style>
