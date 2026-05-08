<script lang="ts">
  import { editor } from "../lib/state/editor.svelte";
  import FileDropzone from "./FileDropzone.svelte";
  import type { FileItem } from "../lib/watermark/types";
  import { t, type Lang } from "../i18n/t";

  type Props = { lang?: Lang };
  const { lang = "es" }: Props = $props();

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function statusLabel(item: FileItem): string {
    switch (item.status) {
      case "pending":
        return t("fileList.statusPending", lang);
      case "processing":
        return t("fileList.statusProcessing", lang);
      case "done":
        return t("fileList.statusDone", lang);
      case "error":
        return t("fileList.statusError", lang);
    }
  }
</script>

<aside class="file-list" aria-label={t("fileList.ariaLabel", lang)}>
  <FileDropzone variant="compact" {lang} />

  <ul>
    {#each editor.files as item (item.id)}
      <li
        class="file-item"
        class:active={item.id === editor.activeFileId}
        class:error={item.status === "error"}
      >
        <button
          class="file-button"
          aria-pressed={item.id === editor.activeFileId}
          aria-label={`${t("fileList.activateAria", lang)} ${item.file.name}`}
          onclick={() => editor.setActive(item.id)}
          type="button"
        >
          <div class="thumb" aria-hidden="true">
            {#if item.type === "image"}
              <img src={item.previewUrl} alt="" loading="lazy" />
            {:else}
              <div class="thumb-pdf">PDF</div>
            {/if}
          </div>
          <div class="meta">
            <strong class="name">{item.file.name}</strong>
            <span class="info">
              {formatSize(item.file.size)}
              {#if item.type === "pdf" && item.pageCount}
                &middot; {item.pageCount} {t("fileList.pagesShort", lang)}
              {/if}
            </span>
            <span class="status">{statusLabel(item)}</span>
            {#if item.errorMessage}
              <span class="error-msg">{item.errorMessage}</span>
            {/if}
          </div>
        </button>
        <button
          class="remove"
          type="button"
          aria-label={`${t("fileList.removeAria", lang)} ${item.file.name}`}
          onclick={() => editor.removeFile(item.id)}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </li>
    {/each}
  </ul>
</aside>

<style>
  .file-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--surface);
    border: var(--border-thick);
    box-shadow: var(--shadow-default);
    border-radius: var(--radius-lg);
    width: 320px;
    flex-shrink: 0;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .file-item {
    display: flex;
    align-items: stretch;
    gap: var(--space-2);
    border: var(--border-thin);
    box-shadow: var(--shadow-default);
    border-radius: var(--radius-md);
    background: var(--surface);
    overflow: hidden;
  }
  .file-item.active {
    background: var(--accent-lavender);
  }
  .file-item.error {
    border-color: var(--danger);
  }
  .file-button {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    color: var(--ink);
    font-weight: 600;
  }
  .thumb {
    width: 48px;
    height: 48px;
    border: var(--border-thin);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .thumb-pdf {
    font-family: var(--font-mono);
    font-size: var(--text-tiny);
    font-weight: 800;
  }
  .meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }
  .name {
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
  .info,
  .status {
    font-size: var(--text-tiny);
    color: var(--ink-muted);
  }
  .error-msg {
    font-size: var(--text-tiny);
    color: var(--danger);
    font-weight: 800;
  }
  .remove {
    background: transparent;
    border: none;
    border-left: var(--border-thin);
    padding: var(--space-2);
    cursor: pointer;
    color: var(--ink);
    flex-shrink: 0;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* El SVG no debe capturar el click: que llegue siempre al boton padre. */
  .remove svg {
    pointer-events: none;
  }
  .remove:hover {
    background: var(--accent-pink);
  }
</style>
