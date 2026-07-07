import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest tu běží v node prostředí (žádné jsdom) — window je jinak undefined,
// takže hasUnlockedAchievement/unlockAchievement by pořád spadly do
// SSR-safe větve. Fake localStorage přes vi.stubGlobal je nejmenší způsob,
// jak otestovat skutečnou perzistenci (stejný vzor jako bulbInventory.test.ts
// / firstNightWarning.test.ts).
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("achievementStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with no unlocked achievements", async () => {
    const { hasUnlockedAchievement } = await import("./achievementStorage");
    expect(hasUnlockedAchievement("meet_hynek")).toBe(false);
  });

  it("unlockAchievement returns true on first unlock, and the achievement stays unlocked", async () => {
    const { hasUnlockedAchievement, unlockAchievement } = await import("./achievementStorage");
    expect(unlockAchievement("meet_hynek")).toBe(true);
    expect(hasUnlockedAchievement("meet_hynek")).toBe(true);
  });

  it("unlockAchievement never unlocks the same achievement twice", async () => {
    const { unlockAchievement } = await import("./achievementStorage");
    expect(unlockAchievement("meet_hynek")).toBe(true);
    expect(unlockAchievement("meet_hynek")).toBe(false);
    expect(unlockAchievement("meet_hynek")).toBe(false);
  });

  it("is safe (returns false, never throws) without window/localStorage (SSR)", async () => {
    vi.unstubAllGlobals();
    const { hasUnlockedAchievement, unlockAchievement } = await import("./achievementStorage");
    expect(() => unlockAchievement("meet_hynek")).not.toThrow();
    expect(unlockAchievement("meet_hynek")).toBe(false);
    expect(hasUnlockedAchievement("meet_hynek")).toBe(false);
  });
});
