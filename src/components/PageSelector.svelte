<script lang="ts">
  import { editor } from "../lib/state/editor.svelte";
  import type { FileItem } from "../lib/watermark/types";
  import { t, type Lang } from "../i18n/t";

  type Props = { file: FileItem; lang?: Lang };
  const { file, lang = "es" }: Props = $props();

  function isSelected(pageNumber: number): boolean {
    return file.selectedPages?.includes(pageNumber) ?? false;
  }

  function isCurrent(pageNumber: number): boolean {
    return editor.getPreviewPage(file.id) === pageNumber;
  }

  // Bug B: antes un solo click hacia navegar Y togglear a la vez. El usuario
  // que hojeaba paginas terminaba desmarcandolas sin querer y el resultado
  // descargado solo marcaba una pagina. Ahora separamos en dos botones:
  // uno para navegar (chip-nav) y otro para togglear (chip-toggle).
  function navigate(pageNumber: number) {
    editor.setPreviewPage(file.id, pageNumber);
  }

  function toggle(pageNumber: number) {
    if (file.pageCount === 1) return;
    editor.togglePage(file.id, pageNumber);
  }

  function describeNav(pageNumber: number): string {
    const vista = isCurrent(pageNumber) ? t("pageSelector.viewCurrent", lang) : "";
    return `${t("pageSelector.viewPage", lang)} ${pageNumber}${vista}`;
  }

  function describeToggle(pageNumber: number): string {
    const accion = isSelected(pageNumber)
      ? t("pageSelector.unmarkPage", lang)
      : t("pageSelector.markPage", lang);
    return `${accion} ${pageNumber}`;
  }

  const pages = $derived(
    file.pageCount ? Array.from({ length: file.pageCount }, (_, i) => i + 1) : [],
  );
</script>

<div class="selector" role="group" aria-label={t("pageSelector.groupAria", lang)}>
  <span class="legend">{t("pageSelector.legend", lang)}</span>
  <div class="chips">
    {#each pages as pageNumber (pageNumber)}
      <div
        class="chip"
        data-selected={isSelected(pageNumber)}
        data-current={isCurrent(pageNumber)}
      >
        <button
          type="button"
          class="chip-nav"
          aria-current={isCurrent(pageNumber) ? "true" : undefined}
          aria-label={describeNav(pageNumber)}
          disabled={editor.isProcessing}
          onclick={() => navigate(pageNumber)}
        >
          {pageNumber}
        </button>
        <button
          type="button"
          class="chip-toggle"
          aria-pressed={isSelected(pageNumber)}
          aria-label={describeToggle(pageNumber)}
          disabled={editor.isProcessing || file.pageCount === 1}
          onclick={() => toggle(pageNumber)}
        >
          <span class="mark" aria-hidden="true">{isSelected(pageNumber) ? "✓" : ""}</span>
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .selector {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    padding: var(--space-3);
    background: var(--surface);
    border: var(--border-thin);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-default);
  }
  .legend {
    font-weight: 800;
    font-size: var(--text-small);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .chip {
    display: inline-flex;
    align-items: stretch;
    background: var(--surface);
    border: var(--border-thin);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-default);
    overflow: hidden;
  }
  .chip[data-selected="true"] {
    background: var(--accent-lavender);
  }
  .chip[data-current="true"] {
    outline: 3px solid var(--accent-pink);
    outline-offset: 2px;
  }
  .chip-nav,
  .chip-toggle {
    background: transparent;
    border: none;
    font-family: var(--font-mono);
    font-weight: 800;
    color: var(--ink);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    transition: transform var(--motion-hover);
  }
  .chip-nav {
    min-width: 32px;
    min-height: 40px;
  }
  .chip-toggle {
    min-width: 24px;
    min-height: 40px;
    border-left: var(--border-thin);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .chip-toggle .mark {
    display: inline-block;
    width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    border: var(--border-thin);
    border-radius: 2px;
    font-size: 12px;
    background: var(--surface);
  }
  .chip-nav:hover:not(:disabled),
  .chip-toggle:hover:not(:disabled) {
    transform: translate(1px, 1px);
  }
  .chip-nav:disabled,
  .chip-toggle:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
