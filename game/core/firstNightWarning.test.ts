import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest tu běží v node prostředí (žádné jsdom) — window je jinak undefined,
// takže hasUsedFirstNightTechnicianWarning/markFirstNightTechnicianWarningUsed
// by pořád spadly do SSR-safe větve. Fake localStorage přes vi.stubGlobal je
// nejmenší způsob, jak otestovat skutečnou perzistenci (stejný vzor jako
// bulbInventory.test.ts).
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("firstNightWarning", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts unused", async () => {
    const { hasUsedFirstNightTechnicianWarning } = await import("./firstNightWarning");
    expect(hasUsedFirstNightTechnicianWarning()).toBe(false);
  });

  it("is marked used after markFirstNightTechnicianWarningUsed, and stays used across reads", async () => {
    const { hasUsedFirstNightTechnicianWarning, markFirstNightTechnicianWarningUsed } = await import(
      "./firstNightWarning"
    );
    markFirstNightTechnicianWarningUsed();
    expect(hasUsedFirstNightTechnicianWarning()).toBe(true);
    expect(hasUsedFirstNightTechnicianWarning()).toBe(true);
  });

  it("is safe (returns false, never throws) without window/localStorage (SSR)", async () => {
    vi.unstubAllGlobals();
    const { hasUsedFirstNightTechnicianWarning, markFirstNightTechnicianWarningUsed } = await import(
      "./firstNightWarning"
    );
    expect(() => markFirstNightTechnicianWarningUsed()).not.toThrow();
    expect(hasUsedFirstNightTechnicianWarning()).toBe(false);
  });
});
