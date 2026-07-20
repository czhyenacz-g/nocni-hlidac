import { describe, expect, it } from "vitest";
import { resolveNightDefinition } from "./nightRegistry";
import { NIGHT_01 } from "./night01";
import { NIGHT_15 } from "./night15";

describe("resolveNightDefinition", () => {
  const titanNights = [13, 18, 27];

  it("resolves to NIGHT_15 (Titan) for each of the three provided titan nights", () => {
    expect(resolveNightDefinition(13, titanNights)).toBe(NIGHT_15);
    expect(resolveNightDefinition(18, titanNights)).toBe(NIGHT_15);
    expect(resolveNightDefinition(27, titanNights)).toBe(NIGHT_15);
  });

  it("every other night resolves to NIGHT_01 (Imp) — current default, unchanged", () => {
    for (const n of [1, 2, 3, 4, 5, 10, 12, 14, 20, 30]) {
      expect(resolveNightDefinition(n, titanNights)).toBe(NIGHT_01);
    }
  });

  it("a different titanNights triple changes which nights resolve to Titan (no hardcoded night number)", () => {
    expect(resolveNightDefinition(15, [15, 20, 25])).toBe(NIGHT_15);
    expect(resolveNightDefinition(13, [15, 20, 25])).toBe(NIGHT_01);
  });
});
