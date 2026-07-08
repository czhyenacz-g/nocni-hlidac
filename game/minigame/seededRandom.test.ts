import { describe, expect, it } from "vitest";
import { createRandomSeed, createSeededRandom } from "./seededRandom";

describe("createSeededRandom", () => {
  it("the same seed always produces the same sequence of numbers", () => {
    const a = createSeededRandom("battery_storage_layout");
    const b = createSeededRandom("battery_storage_layout");

    const sequenceA = [a(), a(), a(), a()];
    const sequenceB = [b(), b(), b(), b()];
    expect(sequenceA).toEqual(sequenceB);
  });

  it("a different seed (very likely) produces a different sequence", () => {
    const a = createSeededRandom("seed-one");
    const b = createSeededRandom("seed-two");

    expect(a()).not.toBe(b());
  });

  it("always returns numbers in [0, 1)", () => {
    const rng = createSeededRandom("range-check");
    for (let i = 0; i < 200; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("an empty-string seed still produces a deterministic sequence", () => {
    const a = createSeededRandom("");
    const b = createSeededRandom("");
    expect(a()).toBe(b());
  });
});

describe("createRandomSeed", () => {
  it("produces a non-empty string", () => {
    expect(typeof createRandomSeed()).toBe("string");
    expect(createRandomSeed().length).toBeGreaterThan(0);
  });

  it("two calls (very likely) produce different seeds", () => {
    expect(createRandomSeed()).not.toBe(createRandomSeed());
  });
});
