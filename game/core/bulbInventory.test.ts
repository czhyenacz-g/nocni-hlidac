import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BULBS_CONFIG } from "./bulbsConfig";
import { Object13PlayerProfileDto, Object13PlayerProfileLoadState } from "./object13PlayerProfile";

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

const VALID_PROFILE: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 1,
  profileData: { inventory: { items: { bulb: 42 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } },
  revision: 1,
  createdAt: "2026-07-16T12:00:00.000Z",
  updatedAt: "2026-07-16T12:00:00.000Z",
  lastSeenAt: "2026-07-16T12:00:00.000Z",
};

describe("resolveStartingBulbsRemaining", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("5. a ready profile is authoritative — VPS value wins over localStorage", async () => {
    const { resolveStartingBulbsRemaining, setBulbsRemaining } = await import("./bulbInventory");
    setBulbsRemaining(3); // local value present, should be ignored

    const loadState: Object13PlayerProfileLoadState = { status: "ready", profile: VALID_PROFILE };
    expect(resolveStartingBulbsRemaining(loadState)).toBe(42);
  });

  it("3. an anonymous (unauthorized) player reads localStorage", async () => {
    const { resolveStartingBulbsRemaining, setBulbsRemaining } = await import("./bulbInventory");
    setBulbsRemaining(7);

    expect(resolveStartingBulbsRemaining({ status: "unauthorized" })).toBe(7);
  });

  it("falls back to localStorage while the profile is still loading or unavailable (VPS outage)", async () => {
    const { resolveStartingBulbsRemaining, setBulbsRemaining } = await import("./bulbInventory");
    setBulbsRemaining(5);

    expect(resolveStartingBulbsRemaining({ status: "loading" })).toBe(5);
    expect(resolveStartingBulbsRemaining({ status: "idle" })).toBe(5);
    expect(resolveStartingBulbsRemaining({ status: "unavailable" })).toBe(5);
  });
});
