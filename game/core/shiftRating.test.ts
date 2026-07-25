import { describe, expect, it } from "vitest";
import { resolveShiftRating } from "./shiftRating";

// Hranice přesně podle zadání — počítáno z milisekund, "více než X do Y
// sekund VČETNĚ" (`<=`), S výhradně přesně 0 ms.
describe("resolveShiftRating", () => {
  it.each([
    [0, "S"],
    [1, "A"],
    [10_000, "A"],
    [10_001, "B"],
    [20_000, "B"],
    [20_001, "C"],
    [30_000, "C"],
    [30_001, "D"],
    [40_000, "D"],
    [40_001, "E"],
  ] as const)("%i ms => %s", (ms, expected) => {
    expect(resolveShiftRating(ms)).toBe(expected);
  });

  it("large values stay E", () => {
    expect(resolveShiftRating(120_000)).toBe("E");
  });
});
