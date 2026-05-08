<script lang="ts">
  import { editor } from "../lib/state/editor.svelte";
  import { t, type Lang } from "../i18n/t";

  type Props = { lang?: Lang };
  const { lang = "es" }: Props = $props();

  const percent = $derived(
    editor.progress.total > 0
      ? Math.round((editor.progress.current / editor.progress.total) * 100)
      : 0,
  );
</script>

{#if editor.isProcessing || editor.progress.current > 0}
  <div class="progress-wrap">
    <span class="label" aria-live="polite">
      {#if editor.isProcessing}
        {t("actions.processing", lang)} {editor.progress.current} {t("preview.of", lang)} {editor.progress.total}
      {:else}
        {t("actions.ready", lang)}
      {/if}
    </span>
    <div
      class="bar"
      role="progressbar"
      aria-valuemin="0"
      aria-valuenow={editor.progress.current}
      aria-valuemax={editor.progress.total > 0 ? editor.progress.total : 1}
      aria-valuetext={`${t("actions.processing", lang)} ${editor.progress.current} ${t("preview.of", lang)} ${editor.progress.total}`}
    >
      <div class="fill" style:width={`${percent}%`}></div>
    </div>
  </div>
{/if}

<style>
  .progress-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
  }
  .label {
    font-weight: 800;
    font-size: var(--text-small);
  }
  .bar {
    background: var(--surface);
    border: var(--border-thin);
    height: 24px;
    width: 100%;
    overflow: hidden;
  }
  .fill {
    background: var(--accent-lime);
    height: 100%;
    transition: width 200ms ease-out;
  }
</style>
