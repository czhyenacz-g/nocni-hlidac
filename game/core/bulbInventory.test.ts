import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BULBS_CONFIG } from "./bulbsConfig";

// Vitest tu běží v node prostředí (žádné jsdom) — window je jinak undefined,
// takže getBulbsRemaining/setBulbsRemaining by pořád spadly do SSR-safe
// větve. Fake localStorage přes vi.stubGlobal je nejmenší způsob, jak
// otestovat skutečnou perzistenci beze změny bulbInventory.ts.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("bulbInventory", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a new campaign (no stored value yet) starts with BULBS_CONFIG.startingCount (10)", async () => {
    const { getBulbsRemaining } = await import("./bulbInventory");
    expect(getBulbsRemaining()).toBe(BULBS_CONFIG.startingCount);
    expect(BULBS_CONFIG.startingCount).toBe(10);
  });

  it("keeps a manually set value across reads, simulating a night transition", async () => {
    const { getBulbsRemaining, setBulbsRemaining } = await import("./bulbInventory");
    setBulbsRemaining(8);

    // "Přechod do dalšího dne" v tomhle kroku nevolá nic navíc — jen se
    // znovu přečte uložená hodnota, přesně jako na začátku další noci.
    expect(getBulbsRemaining()).toBe(8);
    expect(getBulbsRemaining()).toBe(8);
  });

  it("never resets to the starting count once a lower value was saved", async () => {
    const { getBulbsRemaining, setBulbsRemaining } = await import("./bulbInventory");
    setBulbsRemaining(8);

    expect(getBulbsRemaining()).not.toBe(BULBS_CONFIG.startingCount);
    expect(getBulbsRemaining()).toBe(8);
  });
});
