import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stejný fake localStorage vzor jako bulbInventory.test.ts — Vitest tu běží
// v node prostředí (žádné jsdom), takže getRoomBulbs/setRoomBulbs by jinak
// vždy spadly do SSR-safe větve.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("roomBulbs persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a new campaign (nothing stored yet) starts with the default 30000ms, not broken", async () => {
    const { getRoomBulbs } = await import("./roomBulbs");
    const bulbs = getRoomBulbs();
    expect(bulbs.nearRoom.remainingMs).toBe(30_000);
    expect(bulbs.nearRoom.broken).toBe(false);
  });

  it("keeps a weakened but unbroken bulb's value across reads, simulating a night transition", async () => {
    const { getRoomBulbs, setRoomBulbs } = await import("./roomBulbs");
    setRoomBulbs({ nearRoom: { remainingMs: 8000, maxMs: 30_000, broken: false } });

    // "Přechod do dalšího dne" v tomhle kroku nevolá nic navíc — jen se
    // znovu přečte uložená hodnota, přesně jako na začátku další noci.
    expect(getRoomBulbs().nearRoom.remainingMs).toBe(8000);
    expect(getRoomBulbs().nearRoom.remainingMs).toBe(8000);
  });

  it("never resets remainingMs back to 30000 once a lower value was saved", async () => {
    const { getRoomBulbs, setRoomBulbs } = await import("./roomBulbs");
    setRoomBulbs({ nearRoom: { remainingMs: 8000, maxMs: 30_000, broken: false } });

    expect(getRoomBulbs().nearRoom.remainingMs).not.toBe(30_000);
  });

  it("persists a broken bulb as broken across reads", async () => {
    const { getRoomBulbs, setRoomBulbs } = await import("./roomBulbs");
    setRoomBulbs({ nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } });

    expect(getRoomBulbs().nearRoom.broken).toBe(true);
  });
});
