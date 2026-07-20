import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTitanEncounterNights,
  resetTitanEncounterNights,
  rollTitanEncounterNights,
  TITAN_ENCOUNTER_RANGES,
} from "./titanEncounterNights";

const STORAGE_KEY = "nocni-hlidac:object13:titan-encounter-nights";

// Stejný fake localStorage vzor jako roomBulbsStorage.test.ts/bulbInventory.test.ts
// — Vitest tu běží v node prostředí (žádné jsdom), takže
// getTitanEncounterNights/resetTitanEncounterNights by jinak vždy spadly do
// SSR-safe (`typeof window === "undefined"`) větve.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rollTitanEncounterNights — deterministic with an injected random source", () => {
  it("first value is always within 11-15", () => {
    for (const seed of [0, 0.25, 0.5, 0.75, 0.999]) {
      const [first] = rollTitanEncounterNights(() => seed);
      expect(first).toBeGreaterThanOrEqual(11);
      expect(first).toBeLessThanOrEqual(15);
    }
  });

  it("second value is always within 16-21", () => {
    for (const seed of [0, 0.25, 0.5, 0.75, 0.999]) {
      const [, second] = rollTitanEncounterNights(() => seed);
      expect(second).toBeGreaterThanOrEqual(16);
      expect(second).toBeLessThanOrEqual(21);
    }
  });

  it("third value is always within 22-30", () => {
    for (const seed of [0, 0.25, 0.5, 0.75, 0.999]) {
      const [, , third] = rollTitanEncounterNights(() => seed);
      expect(third).toBeGreaterThanOrEqual(22);
      expect(third).toBeLessThanOrEqual(30);
    }
  });

  it("returns exactly three values", () => {
    expect(rollTitanEncounterNights(() => 0)).toHaveLength(3);
  });

  it("night 10 can never appear (not inside any range)", () => {
    for (const [min, max] of TITAN_ENCOUNTER_RANGES) {
      expect(10).not.toBeGreaterThanOrEqual(min);
    }
  });

  it("with random() = 0, picks the minimum of each range; with random() just under 1, the maximum", () => {
    expect(rollTitanEncounterNights(() => 0)).toEqual([11, 16, 22]);
    expect(rollTitanEncounterNights(() => 0.999999)).toEqual([15, 21, 30]);
  });
});

describe("getTitanEncounterNights — persistence across calls", () => {
  it("rolls and persists a fresh triple on first call (no prior storage)", () => {
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    const first = getTitanEncounterNights();
    expect(first).toHaveLength(3);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("subsequent calls return the SAME triple — never re-rolled on every call", () => {
    const first = getTitanEncounterNights();
    const second = getTitanEncounterNights();
    const third = getTitanEncounterNights();
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("an old save without this key gets a safe backward-compatible fallback (rolled once, then persisted)", () => {
    window.localStorage.removeItem(STORAGE_KEY);
    const rolled = getTitanEncounterNights();
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual(rolled);
  });

  it("a corrupted/tampered stored value is discarded and replaced with a fresh valid triple", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([999, -1, "x"]));
    const rolled = getTitanEncounterNights();
    expect(rolled).toHaveLength(3);
    expect(rolled[0]).toBeGreaterThanOrEqual(11);
    expect(rolled[0]).toBeLessThanOrEqual(15);
  });

  it("a value with the wrong length is discarded", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([13, 18]));
    const rolled = getTitanEncounterNights();
    expect(rolled).toHaveLength(3);
  });
});

describe("resetTitanEncounterNights — only a genuinely new run may roll a different triple", () => {
  it("rolls and persists a NEW triple, overwriting the old one", () => {
    const first = getTitanEncounterNights();
    const second = resetTitanEncounterNights();
    // Not asserting inequality (a same-value re-roll is statistically possible
    // and not itself a bug) — asserting persistence + shape instead.
    expect(second).toHaveLength(3);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual(second);
    // A subsequent getTitanEncounterNights() call must now return the reset value, not the old one.
    expect(getTitanEncounterNights()).toEqual(second);
    void first;
  });
});
