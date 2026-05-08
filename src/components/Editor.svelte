<script lang="ts">
  import { onMount } from "svelte";
  import { editor } from "../lib/state/editor.svelte";
  import FileDropzone from "./FileDropzone.svelte";
  import FileList from "./FileList.svelte";
  import WatermarkControls from "./WatermarkControls.svelte";
  import PreviewSlider from "./PreviewSlider.svelte";
  import PageSelector from "./PageSelector.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import HowItWorks from "./HowItWorks.svelte";
  import { t, type Lang } from "../i18n/t";

  type Props = { lang?: Lang };
  const { lang = "es" }: Props = $props();

  // Listeners globales: por defecto, si arrastras un archivo a una pagina y lo
  // sueltas fuera de cualquier zona drop registrada, el navegador lo abre en
  // una pestana nueva. Esto rompe la experiencia. Cancelamos ese comportamiento
  // a nivel de window: prevenimos el default en dragover y drop globales para
  // que solo nuestros dropzones (hero y FileDropzone) procesen drops.
  onMount(() => {
    const preventDefault = (event: DragEvent) => {
      // Solo intervenimos si el arrastre lleva archivos (no texto, links, etc.)
      if (event.dataTransfer && event.dataTransfer.types.includes("Files")) {
        event.preventDefault();
      }
    };
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  });

  function totalSizeMb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  async function applyAndDownload() {
    await editor.runBatch();
  }

  const empty = $derived(editor.files.length === 0);

  // Drop a nivel de seccion entera: cuando aun no hay archivos, dejamos que el
  // usuario suelte sobre cualquier parte del hero (no solo dentro del cuadrado
  // del FileDropzone). Esto soluciona el caso en que HowItWorks empuja el
  // dropzone fuera del viewport y la persona arrastra sobre la zona alta.
  let isHeroDragOver = $state(false);

  function onHeroDragOver(event: DragEvent) {
    if (!event.dataTransfer || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    isHeroDragOver = true;
  }

  function onHeroDragLeave(event: DragEvent) {
    // Solo reseteamos si el cursor sale realmente de la seccion (no de un hijo).
    if (event.currentTarget === event.target) {
      isHeroDragOver = false;
    }
  }

  async function onHeroDrop(event: DragEvent) {
    if (!event.dataTransfer || !event.dataTransfer.files.length) return;
    event.preventDefault();
    isHeroDragOver = false;
    const files = Array.from(event.dataTransfer.files);
    await editor.addFiles(files);
  }
</script>

{#if empty}
  <section
    class="hero"
    class:dragover={isHeroDragOver}
    aria-label={t("hero.screenAria", lang)}
    ondragover={onHeroDragOver}
    ondragleave={onHeroDragLeave}
    ondrop={onHeroDrop}
  >
    <h1>{t("hero.title", lang)}</h1>
    <p class="lead">{t("hero.lead", lang)}</p>
    <div class="dropzone-wrap">
      <FileDropzone variant="hero" {lang} />
    </div>
    <HowItWorks {lang} />
  </section>
{:else}
  <section class="editor" aria-label={t("controls.ariaLabel", lang)}>
    <FileList {lang} />
    <div class="center-col">
      {#if editor.activeFile}
        {#if editor.activeFile.type === "pdf"}
          <PageSelector file={editor.activeFile} {lang} />
        {/if}
        {#key editor.activeFile.id}
          <PreviewSlider file={editor.activeFile} {lang} />
        {/key}
      {:else}
        <div class="empty-preview">{t("errors.noPreview", lang)}</div>
      {/if}
    </div>
    <WatermarkControls {lang} />
  </section>

  <footer class="action-bar">
    <div class="counter">
      <strong>{editor.files.length}</strong>
      {editor.files.length === 1 ? t("actions.files", lang) : t("actions.filesPlural", lang)}
      &middot; {totalSizeMb(editor.totalSizeBytes)} MB
    </div>
    <ProgressBar {lang} />
    <button
      class="brut-btn-primary"
      type="button"
      onclick={applyAndDownload}
      disabled={!editor.canDownload}
    >
      {t("actions.applyDownload", lang)}
    </button>
  </footer>

  {#if editor.fatalError}
    <div class="fatal" role="alert" aria-live="polite">{editor.fatalError}</div>
  {/if}
{/if}

<style>
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-8) var(--space-5);
    text-align: center;
    transition: background var(--motion-hover);
  }
  .hero.dragover {
    background: color-mix(in srgb, var(--accent-pink) 25%, var(--bg));
  }
  .hero h1 {
    font-size: var(--text-hero);
    line-height: 1.1;
    max-width: 18ch;
  }
  .lead {
    font-size: var(--text-h2);
    color: var(--ink-muted);
    max-width: 50ch;
  }
  .dropzone-wrap {
    width: 100%;
    max-width: 720px;
  }
  .editor {
    display: flex;
    gap: var(--space-5);
    align-items: flex-start;
    padding: var(--space-5);
  }
  .center-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }
  .empty-preview {
    flex: 1;
    background: var(--surface);
    border: var(--border-thick);
    box-shadow: var(--shadow-default);
    border-radius: var(--radius-lg);
    padding: var(--space-7);
    text-align: center;
    font-weight: 800;
  }
  .action-bar {
    position: sticky;
    bottom: 0;
    margin-top: var(--space-5);
    background: var(--surface);
    border-top: var(--border-thick);
    padding: var(--space-4) var(--space-5);
    display: flex;
    align-items: center;
    gap: var(--space-5);
    z-index: 10;
  }
  .counter {
    font-weight: 600;
  }
  .fatal {
    margin: var(--space-3) var(--space-5);
    background: color-mix(in srgb, var(--danger) 15%, var(--surface));
    border: 2px solid var(--danger);
    box-shadow: var(--shadow-default);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 600;
  }
</style>
