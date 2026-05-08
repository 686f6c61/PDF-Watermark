<script lang="ts">
  import { t, type Lang } from "../i18n/t";

  type Props = { lang?: Lang };
  const { lang = "es" }: Props = $props();
</script>

<div
  class="privacy-badge"
  role="status"
  aria-label={t("privacyBadge.ariaLabel", lang)}
>
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
    <rect x="4" y="11" width="16" height="9" rx="1" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
  <span>{t("privacyBadge.text", lang)}</span>
</div>

<style>
  .privacy-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--accent-lime);
    border: var(--border-thin);
    box-shadow: var(--shadow-default);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
    font-weight: 600;
    color: var(--ink);
  }
</style>
