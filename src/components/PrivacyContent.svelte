<script lang="ts">
  import { t, type Lang } from "../i18n/t";

  type Props = { lang: Lang };
  const { lang }: Props = $props();
</script>

<main class="legal">
  <h1>{t("privacyPage.h1", lang)}</h1>
  <p class="updated">{t("privacyPage.updated", lang)}</p>

  <p class="lead">{t("privacyPage.lead1", lang)}</p>
  <p class="lead">{t("privacyPage.lead2", lang)}</p>

  <h2>{t("privacyPage.h2_1", lang)}</h2>
  <p>{t("privacyPage.p1_1", lang)}</p>
  <p>{t("privacyPage.p1_2", lang)}</p>
  <ul>
    <li>{t("privacyPage.li1_1", lang)}</li>
    <li>{t("privacyPage.li1_2", lang)}</li>
    <li>{t("privacyPage.li1_3", lang)}</li>
  </ul>

  <h2>{t("privacyPage.h2_2", lang)}</h2>
  <p>{t("privacyPage.p2_1", lang)}</p>
  <p>{@html t("privacyPage.p2_2", lang)}</p>

  <h2>{t("privacyPage.h2_3", lang)}</h2>
  <p>{t("privacyPage.p3_1", lang)}</p>
  <ul>
    <li>{@html t("privacyPage.li3_1", lang)}</li>
    <li>{@html t("privacyPage.li3_2", lang)}</li>
    <li>{@html t("privacyPage.li3_3", lang)}</li>
  </ul>

  <h2>{t("privacyPage.h2_4", lang)}</h2>
  <p>{@html t("privacyPage.p4_1", lang)}</p>
  <ul>
    <li>{t("privacyPage.li4_1", lang)}</li>
    <li>{t("privacyPage.li4_2", lang)}</li>
    <li>{t("privacyPage.li4_3", lang)}</li>
    <li>{t("privacyPage.li4_4", lang)}</li>
    <li>{t("privacyPage.li4_5", lang)}</li>
    <li>{t("privacyPage.li4_6", lang)}</li>
    <li>{t("privacyPage.li4_7", lang)}</li>
  </ul>

  <h2>{t("privacyPage.h2_5", lang)}</h2>
  <p>{@html t("privacyPage.p5_1", lang)}</p>
  <p>{@html t("privacyPage.p5_2", lang)}</p>
  <p>{t("privacyPage.p5_3", lang)}</p>
  <p>{t("privacyPage.p5_4", lang)}</p>
  <ul>
    <li>{t("privacyPage.li5_1", lang)}</li>
    <li>{t("privacyPage.li5_2", lang)}</li>
    <li>{t("privacyPage.li5_3", lang)}</li>
    <li>{t("privacyPage.li5_4", lang)}</li>
  </ul>
  <p>{@html t("privacyPage.p5_5", lang)}</p>
  <ul>
    <li>{t("privacyPage.li5_5", lang)}</li>
    <li>{t("privacyPage.li5_6", lang)}</li>
    <li>{t("privacyPage.li5_7", lang)}</li>
    <li>{t("privacyPage.li5_8", lang)}</li>
  </ul>
  <p>{@html t("privacyPage.p5_6", lang)}</p>
  <p>{@html t("privacyPage.p5_7", lang)}</p>
  <p>{@html t("privacyPage.p5_8", lang)}</p>

  <h2>{t("privacyPage.h2_6", lang)}</h2>
  <p>{t("privacyPage.p6_1", lang)}</p>
  <ol>
    <li>{t("privacyPage.ol6_1", lang)}</li>
    <li>{t("privacyPage.ol6_2", lang)}</li>
    <li>{@html t("privacyPage.ol6_3", lang)}</li>
    <li>{t("privacyPage.ol6_4", lang)}</li>
    <li>{t("privacyPage.ol6_5", lang)}</li>
  </ol>

  <figure class="flow-diagram">
    <svg
      viewBox="0 0 760 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t("privacyPage.diagramAria", lang)}
    >
      <rect width="760" height="320" fill="#FFF8E7" />

      <text x="380" y="34" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="14" fill="#000">
        {t("privacyPage.diagramFlow1Title", lang)}
      </text>

      <g transform="translate(40, 60)">
        <rect width="160" height="90" fill="#C5B4FF" stroke="#000" stroke-width="3" rx="6" />
        <text x="80" y="40" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="13" fill="#000">{t("privacyPage.diagramFlow1Box1", lang)}</text>
        <text x="80" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="600" font-size="11" fill="#000">{t("privacyPage.diagramFlow1Box1Sub", lang)}</text>
      </g>

      <g>
        <line x1="200" y1="105" x2="298" y2="105" stroke="#000" stroke-width="3" stroke-linecap="round" />
        <polygon points="294,98 310,105 294,112" fill="#000" />
      </g>

      <g transform="translate(310, 60)">
        <rect width="160" height="90" fill="#FFCDA8" stroke="#000" stroke-width="3" rx="6" />
        <text x="80" y="40" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="13" fill="#000">{t("privacyPage.diagramFlow1Box2", lang)}</text>
        <text x="80" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="600" font-size="11" fill="#000">{t("privacyPage.diagramFlow1Box2Sub", lang)}</text>
      </g>

      <g>
        <line x1="470" y1="105" x2="568" y2="105" stroke="#000" stroke-width="3" stroke-linecap="round" />
        <polygon points="564,98 580,105 564,112" fill="#000" />
      </g>

      <g transform="translate(580, 60)">
        <rect width="160" height="90" fill="#C6F5A6" stroke="#000" stroke-width="3" rx="6" />
        <text x="80" y="40" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="13" fill="#000">{t("privacyPage.diagramFlow1Box3", lang)}</text>
        <text x="80" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="600" font-size="11" fill="#000">{t("privacyPage.diagramFlow1Box3Sub", lang)}</text>
      </g>

      <text x="380" y="172" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="600" font-size="11" fill="#000">
        {t("privacyPage.diagramFlow1Foot", lang)}
      </text>

      <line x1="40" y1="190" x2="720" y2="190" stroke="#000" stroke-width="1" stroke-dasharray="4 4" opacity="0.4" />

      <text x="380" y="216" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="14" fill="#000">
        {t("privacyPage.diagramFlow2Title", lang)}
      </text>

      <g transform="translate(40, 240)">
        <rect width="200" height="60" fill="#FFB5C5" stroke="#000" stroke-width="3" rx="6" />
        <text x="100" y="28" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="13" fill="#000">{t("privacyPage.diagramFlow2Box1", lang)}</text>
        <text x="100" y="46" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="600" font-size="11" fill="#000">{t("privacyPage.diagramFlow2Box1Sub", lang)}</text>
      </g>

      <g>
        <line x1="240" y1="270" x2="498" y2="270" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6" />
        <polygon points="494,263 510,270 494,277" fill="#000" />
      </g>

      <g transform="translate(520, 240)">
        <rect width="200" height="60" fill="#FFFFFF" stroke="#000" stroke-width="3" rx="6" />
        <text x="100" y="28" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="800" font-size="13" fill="#000">{t("privacyPage.diagramFlow2Box2", lang)}</text>
        <text x="100" y="46" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-weight="600" font-size="11" fill="#000">{t("privacyPage.diagramFlow2Box2Sub", lang)}</text>
      </g>
    </svg>
    <figcaption>{t("privacyPage.diagramCaption", lang)}</figcaption>
  </figure>

  <p>{@html t("privacyPage.p6_2", lang)}</p>

  <h2>{t("privacyPage.h2_7", lang)}</h2>
  <p>{@html t("privacyPage.p7_1", lang)}</p>
  <p>{@html t("privacyPage.p7_2", lang)}</p>
  <p>{@html t("privacyPage.p7_3", lang)}</p>

  <h2>{t("privacyPage.h2_8", lang)}</h2>
  <p>{t("privacyPage.p8_1", lang)}</p>
  <p>{@html t("privacyPage.p8_2", lang)}</p>
  <p>{@html t("privacyPage.p8_3", lang)}</p>

  <h2>{t("privacyPage.h2_9", lang)}</h2>
  <p>{t("privacyPage.p9_1", lang)}</p>
  <p>{t("privacyPage.p9_2", lang)}</p>

  <h2>{t("privacyPage.h2_10", lang)}</h2>
  <p>{t("privacyPage.p10_1", lang)}</p>
  <ul>
    <li>{@html t("privacyPage.li10_1", lang)}</li>
    <li>{@html t("privacyPage.li10_2", lang)}</li>
    <li>
      {@html t("privacyPage.li10_3", lang)}
      <ul>
        <li>{@html t("privacyPage.li10_3_a", lang)}</li>
        <li>{@html t("privacyPage.li10_3_b", lang)}</li>
      </ul>
      {t("privacyPage.li10_3_foot", lang)}
    </li>
  </ul>
  <p>{t("privacyPage.p10_2", lang)}</p>

  <h2>{t("privacyPage.h2_11", lang)}</h2>
  <p>{t("privacyPage.p11_1", lang)}</p>

  <h2>{t("privacyPage.h2_12", lang)}</h2>
  <p>{t("privacyPage.p12_1", lang)}</p>
  <p>{t("privacyPage.p12_2", lang)}</p>

  <h2>{t("privacyPage.h2_13", lang)}</h2>
  <p>{@html t("privacyPage.p13_1", lang)}</p>

  <h2>{t("privacyPage.h2_14", lang)}</h2>
  <p>{t("privacyPage.p14_1", lang)}</p>

  <p class="back">
    <a href={lang === "en" ? "/en/" : "/"}>{t("privacyPage.back", lang)}</a>
  </p>
</main>

<style>
  .legal {
    max-width: 760px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-5);
    line-height: 1.6;
  }
  .legal :global(h1) {
    font-size: var(--text-h1);
    margin-bottom: var(--space-3);
  }
  .legal :global(h2) {
    font-size: var(--text-h2);
    margin-top: var(--space-5);
    margin-bottom: var(--space-2);
  }
  .legal :global(ul) {
    padding-left: var(--space-5);
  }
  .legal :global(.updated) {
    color: var(--ink-muted);
    font-size: var(--text-small);
  }
  .legal :global(.back) {
    margin-top: var(--space-6);
  }
  .flow-diagram {
    margin: var(--space-5) 0;
    border: var(--border-thick);
    border-radius: var(--radius-lg);
    background: var(--bg);
    box-shadow: var(--shadow-default);
    overflow: hidden;
  }
  .flow-diagram :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .flow-diagram :global(figcaption) {
    text-align: center;
    padding: var(--space-3);
    font-size: var(--text-small);
    color: var(--ink-muted);
    font-weight: 600;
    border-top: var(--border-thin);
    background: var(--surface);
  }
</style>
