import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Helper para resetear el modulo entre tests.
async function loadAnalyticsModule() {
  vi.resetModules();
  return await import("../../src/lib/analytics");
}

type AnalyticsWindow = {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __pwLoadAnalytics?: () => void;
};

function resetWindow() {
  const w = window as unknown as AnalyticsWindow;
  delete w.gtag;
  delete w.dataLayer;
  delete w.__pwLoadAnalytics;
}

function bootstrapGtag() {
  // Simula lo que hace /public/js/gtag-init.js: declara dataLayer, gtag y
  // emite el consent default denied. Sin este bootstrap, las funciones del
  // modulo deben ser no-op para no romper en entornos sin GA.
  const w = window as unknown as AnalyticsWindow;
  w.dataLayer = [];
  w.gtag = function gtag(...args: unknown[]) {
    (w.dataLayer as unknown[]).push(args);
  };
  w.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

describe("analytics.ts", () => {
  beforeEach(() => {
    resetWindow();
  });
  afterEach(() => {
    resetWindow();
  });

  describe("initAnalytics", () => {
    it("es no-op: el bootstrap real ocurre en /js/gtag-init.js", async () => {
      const mod = await loadAnalyticsModule();
      mod.initAnalytics();
      expect((window as unknown as AnalyticsWindow).gtag).toBeUndefined();
    });
  });

  describe("grantConsent", () => {
    it("delega en __pwLoadAnalytics cuando existe (carga condicional)", async () => {
      bootstrapGtag();
      const loadSpy = vi.fn();
      (window as unknown as AnalyticsWindow).__pwLoadAnalytics = loadSpy;
      const mod = await loadAnalyticsModule();
      mod.grantConsent();
      expect(loadSpy).toHaveBeenCalledTimes(1);
      // No emite un update propio: lo hace el loader dentro de gtag-init.js.
      const dataLayer = (window as unknown as AnalyticsWindow).dataLayer ?? [];
      const updates = dataLayer.filter((entry: unknown): entry is unknown[] =>
        Array.isArray(entry) && entry[0] === "consent" && entry[1] === "update",
      );
      expect(updates).toHaveLength(0);
    });

    it("fallback sin loader: emite consent update concediendo SOLO analytics_storage", async () => {
      bootstrapGtag();
      const mod = await loadAnalyticsModule();
      mod.grantConsent();
      const dataLayer = (window as unknown as AnalyticsWindow).dataLayer ?? [];
      const updates = dataLayer.filter((entry: unknown): entry is unknown[] =>
        Array.isArray(entry) && entry[0] === "consent" && entry[1] === "update",
      );
      expect(updates.length).toBeGreaterThan(0);
      const payload = (updates[updates.length - 1] as unknown[])[2] as Record<string, string>;
      expect(payload.analytics_storage).toBe("granted");
      // La promesa de la landing es "solo medimos visitas": las funciones
      // publicitarias no se conceden nunca.
      expect(payload.ad_storage).toBeUndefined();
      expect(payload.ad_user_data).toBeUndefined();
      expect(payload.ad_personalization).toBeUndefined();
    });

    it("es no-op si no hay ni loader ni gtag en window", async () => {
      const mod = await loadAnalyticsModule();
      mod.grantConsent();
      expect((window as unknown as AnalyticsWindow).dataLayer).toBeUndefined();
    });
  });

  describe("revokeConsent", () => {
    it("emite consent update denied si gtag esta presente", async () => {
      bootstrapGtag();
      const mod = await loadAnalyticsModule();
      mod.grantConsent();
      mod.revokeConsent();
      const dataLayer = (window as unknown as AnalyticsWindow).dataLayer ?? [];
      const updates = dataLayer.filter((entry: unknown): entry is unknown[] =>
        Array.isArray(entry) && entry[0] === "consent" && entry[1] === "update",
      );
      const last = updates[updates.length - 1] as unknown[];
      const payload = last[2] as Record<string, string>;
      expect(payload.analytics_storage).toBe("denied");
    });

    it("es no-op si gtag no esta inicializado en window", async () => {
      const mod = await loadAnalyticsModule();
      mod.revokeConsent();
      expect((window as unknown as AnalyticsWindow).dataLayer).toBeUndefined();
    });
  });
});
