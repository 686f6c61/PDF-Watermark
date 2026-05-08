import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Helper para resetear el modulo entre tests.
async function loadAnalyticsModule() {
  vi.resetModules();
  return await import("../../src/lib/analytics");
}

function resetWindow() {
  delete (window as unknown as { gtag?: unknown }).gtag;
  delete (window as unknown as { dataLayer?: unknown }).dataLayer;
}

function bootstrapGtag() {
  // Simula lo que hace /public/gtag-init.js: declara dataLayer, gtag y
  // emite el consent default denied. Sin este bootstrap, las funciones del
  // modulo deben ser no-op para no romper en entornos sin GA.
  const w = window as unknown as {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
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
    it("es no-op: el bootstrap real ocurre en /gtag-init.js inline", async () => {
      const mod = await loadAnalyticsModule();
      mod.initAnalytics();
      expect((window as unknown as { gtag?: unknown }).gtag).toBeUndefined();
    });
  });

  describe("grantConsent", () => {
    it("emite consent update granted si gtag esta presente", async () => {
      bootstrapGtag();
      const mod = await loadAnalyticsModule();
      mod.grantConsent();
      const dataLayer = (window as unknown as { dataLayer: unknown[] }).dataLayer;
      const updates = dataLayer.filter((entry: unknown): entry is unknown[] =>
        Array.isArray(entry) && entry[0] === "consent" && entry[1] === "update",
      );
      expect(updates.length).toBeGreaterThan(0);
      const payload = (updates[updates.length - 1] as unknown[])[2] as Record<string, string>;
      expect(payload.analytics_storage).toBe("granted");
      expect(payload.ad_storage).toBe("granted");
      expect(payload.ad_user_data).toBe("granted");
      expect(payload.ad_personalization).toBe("granted");
    });

    it("es no-op si gtag no esta inicializado en window", async () => {
      const mod = await loadAnalyticsModule();
      mod.grantConsent();
      expect((window as unknown as { dataLayer?: unknown }).dataLayer).toBeUndefined();
    });
  });

  describe("revokeConsent", () => {
    it("emite consent update denied si gtag esta presente", async () => {
      bootstrapGtag();
      const mod = await loadAnalyticsModule();
      mod.grantConsent();
      mod.revokeConsent();
      const dataLayer = (window as unknown as { dataLayer: unknown[] }).dataLayer;
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
      expect((window as unknown as { dataLayer?: unknown }).dataLayer).toBeUndefined();
    });
  });
});
