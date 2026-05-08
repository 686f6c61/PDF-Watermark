<script lang="ts">
  // Selector de idioma neobrutalista. Renderiza dos enlaces (ES / EN) que
  // navegan a las rutas equivalentes. No precisa hidratacion JS (los enlaces
  // funcionan tambien con JavaScript desactivado), pero al ser un componente
  // Svelte permite pasar `lang` para marcar correctamente aria-current.
  import { t, type Lang } from "../i18n/t";

  type Props = { lang: Lang };
  const { lang }: Props = $props();
</script>

<nav class="lang-switch" aria-label={t("header.languageSwitchAria", lang)}>
  <a
    class="lang-btn"
    href="/"
    aria-current={lang === "es" ? "page" : undefined}
    data-active={lang === "es"}
  >
    {t("header.languageEs", lang)}
  </a>
  <a
    class="lang-btn"
    href="/en/"
    aria-current={lang === "en" ? "page" : undefined}
    data-active={lang === "en"}
  >
    {t("header.languageEn", lang)}
  </a>
</nav>

<style>
  .lang-switch {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    border: var(--border-thin);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--surface);
    box-shadow: var(--shadow-default);
  }
  .lang-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    padding: var(--space-1) var(--space-3);
    font-weight: 800;
    color: var(--ink);
    text-decoration: none;
    font-family: var(--font-display);
    font-size: var(--text-small);
    transition: transform var(--motion-hover), background var(--motion-hover);
  }
  .lang-btn[data-active="true"] {
    background: var(--accent-lavender);
  }
  .lang-btn:hover {
    background: var(--accent-lime);
  }
  @media (prefers-reduced-motion: reduce) {
    .lang-btn {
      transition: none;
    }
  }
</style>
