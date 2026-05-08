<script lang="ts">
  import { t, type Lang } from "../i18n/t";

  type Props = { lang?: Lang };
  const { lang = "es" }: Props = $props();
</script>

<section class="hiw" aria-labelledby="hiw-title">
  <header class="hiw-header">
    <h2 id="hiw-title">{t("howItWorks.title", lang)}</h2>
    <p>{t("howItWorks.lead", lang)}</p>
  </header>

  <figure class="diagram">
    <svg
      viewBox="0 0 760 280"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t("howItWorks.diagramAria", lang)}
    >
      <rect width="760" height="280" fill="#FFF8E7" />

      <g transform="translate(20, 100)">
        <text x="80" y="-16" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="14" fill="#000">
          {t("howItWorks.diagramStep1", lang)}
        </text>
        <rect width="160" height="110" fill="#C5B4FF" stroke="#000" stroke-width="3" rx="6" />
        <rect x="22" y="20" width="116" height="14" fill="#FFF" stroke="#000" stroke-width="2" />
        <rect x="22" y="44" width="92" height="8" fill="#000" opacity="0.5" />
        <rect x="22" y="60" width="116" height="8" fill="#000" opacity="0.5" />
        <rect x="22" y="76" width="70" height="8" fill="#000" opacity="0.5" />
      </g>

      <g>
        <line x1="190" y1="155" x2="248" y2="155" stroke="#000" stroke-width="3" stroke-linecap="round" />
        <polygon points="244,148 260,155 244,162" fill="#000" />
      </g>

      <g transform="translate(270, 60)">
        <text x="110" y="-16" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="14" fill="#000">
          {t("howItWorks.diagramStep2", lang)}
        </text>
        <rect width="220" height="190" fill="#FFCDA8" stroke="#000" stroke-width="3" rx="6" />
        <rect x="16" y="16" width="188" height="130" fill="#FFFFFF" stroke="#000" stroke-width="2" />
        <rect x="0" y="158" width="220" height="14" fill="#000" />
        <rect x="92" y="172" width="36" height="10" fill="#000" />

        <g transform="translate(110, 81)">
          <circle r="38" fill="#C6F5A6" stroke="#000" stroke-width="3" />
          <path d="M -16 0 L -4 14 L 18 -14" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </g>

      <g>
        <line x1="500" y1="155" x2="558" y2="155" stroke="#000" stroke-width="3" stroke-linecap="round" />
        <polygon points="554,148 570,155 554,162" fill="#000" />
      </g>

      <g transform="translate(580, 100)">
        <text x="80" y="-16" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="14" fill="#000">
          {t("howItWorks.diagramStep3", lang)}
        </text>
        <rect width="160" height="110" fill="#C6F5A6" stroke="#000" stroke-width="3" rx="6" />
        <rect x="22" y="20" width="116" height="14" fill="#FFF" stroke="#000" stroke-width="2" />
        <rect x="22" y="44" width="92" height="8" fill="#000" opacity="0.4" />
        <rect x="22" y="60" width="116" height="8" fill="#000" opacity="0.4" />
        <rect x="22" y="76" width="70" height="8" fill="#000" opacity="0.4" />
        <g transform="translate(80, 60) rotate(-18)" opacity="0.5">
          <text
            text-anchor="middle"
            font-family="Space Grotesk, sans-serif"
            font-weight="800"
            font-size="11"
            fill="#000"
          >MARK</text>
        </g>
      </g>
    </svg>
    <figcaption>{t("howItWorks.diagramCaption", lang)}</figcaption>
  </figure>

  <ul class="promises" aria-label={t("howItWorks.promisesAria", lang)}>
    <li>
      <span class="badge badge-pink" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20" />
          <polyline points="16 16 20 20 16 24" />
          <line x1="20" y1="20" x2="4" y2="20" />
        </svg>
      </span>
      <div>
        <strong>{t("howItWorks.promise1Title", lang)}</strong>
        <p>{t("howItWorks.promise1Body", lang)}</p>
      </div>
    </li>
    <li>
      <span class="badge badge-lavender" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="5" y1="5" x2="19" y2="19" />
        </svg>
      </span>
      <div>
        <strong>{t("howItWorks.promise2Title", lang)}</strong>
        <p>{t("howItWorks.promise2Body", lang)}</p>
      </div>
    </li>
    <li>
      <span class="badge badge-peach" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <div>
        <strong>{t("howItWorks.promise3Title", lang)}</strong>
        <p>{t("howItWorks.promise3Body", lang)}</p>
      </div>
    </li>
    <li>
      <span class="badge badge-lime" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <div>
        <strong>{t("howItWorks.promise4Title", lang)}</strong>
        <p>{t("howItWorks.promise4Body", lang)}</p>
      </div>
    </li>
  </ul>
</section>

<style>
  .hiw {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    background: var(--surface);
    border: var(--border-thick);
    box-shadow: var(--shadow-large);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
  }
  .hiw-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    text-align: center;
  }
  .hiw-header h2 {
    font-size: var(--text-h1);
  }
  .hiw-header p {
    color: var(--ink-muted);
    max-width: 60ch;
    margin: 0 auto;
    line-height: 1.5;
  }
  .diagram {
    margin: 0;
    border: var(--border-thin);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg);
  }
  .diagram svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .diagram figcaption {
    text-align: center;
    padding: var(--space-2) var(--space-3) var(--space-3);
    font-size: var(--text-small);
    color: var(--ink-muted);
    font-weight: 600;
    border-top: var(--border-thin);
    background: var(--surface);
  }
  .promises {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-3);
  }
  .promises li {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--bg);
    border: var(--border-thin);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-default);
  }
  .promises strong {
    display: block;
    font-weight: 800;
    margin-bottom: var(--space-1);
    line-height: 1.2;
  }
  .promises p {
    margin: 0;
    color: var(--ink-muted);
    font-size: var(--text-small);
    line-height: 1.4;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: var(--border-thin);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    color: var(--ink);
  }
  .badge-pink {
    background: var(--accent-pink);
  }
  .badge-lavender {
    background: var(--accent-lavender);
  }
  .badge-peach {
    background: var(--accent-peach);
  }
  .badge-lime {
    background: var(--accent-lime);
  }
</style>
