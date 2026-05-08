<script lang="ts" module>
  // Modulo expuesto a nivel de archivo: permite a otros componentes (por ejemplo
  // el boton "Configurar cookies" del footer) reabrir el banner sin acoplarse
  // a la instancia interna del componente.
  let reopenFn: (() => void) | null = null;

  export function reopenBanner(): void {
    reopenFn?.();
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { grantConsent, revokeConsent } from "../lib/analytics";
  import { t, type Lang } from "../i18n/t";

  const STORAGE_KEY = "pdf-watermark-consent";
  type Consent = "accepted" | "rejected" | null;

  type Props = { lang?: Lang };
  const { lang = "es" }: Props = $props();

  let visible = $state(false);
  let acceptButton: HTMLButtonElement | null = $state(null);

  function readConsent(): Consent {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "accepted" || raw === "rejected") {
        return raw;
      }
      return null;
    } catch {
      return null;
    }
  }

  function persistConsent(value: Exclude<Consent, null>): void {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage puede fallar en modo privado; aceptamos silenciosamente,
      // la decision se aplica a esta sesion aunque no persista.
    }
    window.dispatchEvent(new CustomEvent("consent-changed", { detail: value }));
  }

  function show(): void {
    visible = true;
    // El focus inicial debe ir al primer boton del dialogo para una experiencia
    // accesible coherente con role="dialog".
    queueMicrotask(() => acceptButton?.focus());
  }

  function hide(): void {
    visible = false;
  }

  function accept(): void {
    persistConsent("accepted");
    grantConsent();
    hide();
  }

  function reject(): void {
    persistConsent("rejected");
    revokeConsent();
    hide();
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Tabulacion ciclica entre los botones del dialogo.
    if (event.key !== "Tab") {
      return;
    }
    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>('[data-cookie-banner-focusable="true"]'),
    );
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    if (readConsent() === null) {
      show();
    }
    reopenFn = show;
    return () => {
      reopenFn = null;
    };
  });
</script>

{#if visible}
  <div
    class="cookie-banner"
    role="dialog"
    aria-modal="false"
    aria-labelledby="cookie-banner-title"
    aria-describedby="cookie-banner-desc"
    onkeydown={handleKeydown}
  >
    <div class="cookie-banner__inner">
      <div class="cookie-banner__copy">
        <h2 id="cookie-banner-title" class="cookie-banner__title">
          {t("cookies.title", lang)}
        </h2>
        <p id="cookie-banner-desc" class="cookie-banner__text">
          {t("cookies.body", lang)}
          <a
            href={lang === "en" ? "/en/privacy/" : "/privacidad/"}
            class="cookie-banner__link"
            data-cookie-banner-focusable="true"
          >
            {t("cookies.details", lang)}
          </a>
        </p>
      </div>
      <div class="cookie-banner__actions">
        <button
          type="button"
          class="brut-btn"
          onclick={reject}
          data-cookie-banner-focusable="true"
        >
          {t("cookies.reject", lang)}
        </button>
        <button
          type="button"
          class="brut-btn-primary cookie-banner__accept"
          onclick={accept}
          bind:this={acceptButton}
          data-cookie-banner-focusable="true"
        >
          {t("cookies.accept", lang)}
        </button>
        <button
          type="button"
          class="cookie-banner__settings"
          aria-label={t("cookies.settingsAria", lang)}
          disabled
        >
          {t("cookies.settings", lang)}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .cookie-banner {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    background: var(--surface);
    border-top: 3px solid var(--ink);
    box-shadow: 0 -6px 0 0 #000;
    padding: var(--space-5);
  }
  .cookie-banner__inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-5);
    flex-wrap: wrap;
  }
  .cookie-banner__copy {
    flex: 1 1 360px;
    min-width: 0;
  }
  .cookie-banner__title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-2);
  }
  .cookie-banner__text {
    margin: 0;
    color: var(--ink);
    line-height: 1.5;
    font-weight: 500;
  }
  .cookie-banner__link {
    color: var(--ink);
    font-weight: 700;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }
  .cookie-banner__link:hover {
    background: var(--accent-lime);
  }
  .cookie-banner__actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .cookie-banner__accept {
    padding: var(--space-3) var(--space-5);
    font-size: var(--text-body);
  }
  .cookie-banner__settings {
    background: transparent;
    border: none;
    color: var(--ink-muted);
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: var(--space-2);
    font-weight: 600;
  }
  .cookie-banner__settings:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  @media (max-width: 640px) {
    .cookie-banner__inner {
      flex-direction: column;
      align-items: stretch;
    }
    .cookie-banner__actions {
      justify-content: flex-end;
    }
  }
</style>
