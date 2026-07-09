import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest tu běží v node prostředí (žádné jsdom) — window je jinak undefined,
// stejný fake localStorage vzor jako bulbInventory.test.ts.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("monsterDefeatReward", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a new campaign (no stored value yet) starts with nothing unlocked", async () => {
    const { getMonsterDefeatReward } = await import("./monsterDefeatReward");
    expect(getMonsterDefeatReward()).toEqual({
      hasDefeatedMonster: false,
      doubleBarrelUnlocked: false,
      monsterDefeatsCount: 0,
    });
  });

  it("recordMonsterDefeat sets hasDefeatedMonster", async () => {
    const { recordMonsterDefeat } = await import("./monsterDefeatReward");
    expect(recordMonsterDefeat().hasDefeatedMonster).toBe(true);
  });

  it("recordMonsterDefeat sets doubleBarrelUnlocked", async () => {
    const { recordMonsterDefeat } = await import("./monsterDefeatReward");
    expect(recordMonsterDefeat().doubleBarrelUnlocked).toBe(true);
  });

  it("recordMonsterDefeat bumps monsterDefeatsCount to 1 on the first true ending", async () => {
    const { recordMonsterDefeat } = await import("./monsterDefeatReward");
    expect(recordMonsterDefeat().monsterDefeatsCount).toBe(1);
  });

  it("a second recordMonsterDefeat bumps the count again, keeping the unlocks true", async () => {
    const { recordMonsterDefeat } = await import("./monsterDefeatReward");
    recordMonsterDefeat();
    const second = recordMonsterDefeat();
    expect(second.monsterDefeatsCount).toBe(2);
    expect(second.hasDefeatedMonster).toBe(true);
    expect(second.doubleBarrelUnlocked).toBe(true);
  });

  it("a third recordMonsterDefeat keeps incrementing", async () => {
    const { recordMonsterDefeat } = await import("./monsterDefeatReward");
    recordMonsterDefeat();
    recordMonsterDefeat();
    expect(recordMonsterDefeat().monsterDefeatsCount).toBe(3);
  });

  it("getMonsterDefeatReward reflects the persisted value across reads", async () => {
    const { getMonsterDefeatReward, recordMonsterDefeat } = await import("./monsterDefeatReward");
    recordMonsterDefeat();
    expect(getMonsterDefeatReward()).toEqual({
      hasDefeatedMonster: true,
      doubleBarrelUnlocked: true,
      monsterDefeatsCount: 1,
    });
    // Reading again doesn't change anything.
    expect(getMonsterDefeatReward().monsterDefeatsCount).toBe(1);
  });

  it("survives corrupted JSON in storage by falling back to defaults", async () => {
    window.localStorage.setItem("nocni-hlidac:object13:monster-defeat-reward", "{not valid json");
    const { getMonsterDefeatReward } = await import("./monsterDefeatReward");
    expect(getMonsterDefeatReward()).toEqual({
      hasDefeatedMonster: false,
      doubleBarrelUnlocked: false,
      monsterDefeatsCount: 0,
    });
  });

  it("resetMonsterDefeatReward restores defaults and persists them", async () => {
    const { recordMonsterDefeat, resetMonsterDefeatReward, getMonsterDefeatReward } = await import(
      "./monsterDefeatReward"
    );
    recordMonsterDefeat();
    recordMonsterDefeat();

    const reset = resetMonsterDefeatReward();
    expect(reset).toEqual({ hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 });
    expect(getMonsterDefeatReward()).toEqual({ hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 });
  });
});

describe("monsterDefeatReward outside the browser (SSR-safe)", () => {
  it("getMonsterDefeatReward returns defaults when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { getMonsterDefeatReward } = await import("./monsterDefeatReward");
    expect(getMonsterDefeatReward()).toEqual({
      hasDefeatedMonster: false,
      doubleBarrelUnlocked: false,
      monsterDefeatsCount: 0,
    });
    vi.unstubAllGlobals();
  });
});
