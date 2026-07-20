import { describe, expect, it } from "vitest";
import { resolveNightDefinition } from "./nightRegistry";
import { NIGHT_01 } from "./night01";
import { NIGHT_15 } from "./night15";

describe("resolveNightDefinition", () => {
  it("night 15 resolves to NIGHT_15 (Titan)", () => {
    expect(resolveNightDefinition(15)).toBe(NIGHT_15);
  });

  it("every other night resolves to NIGHT_01 (Imp) — current default, unchanged", () => {
    for (const n of [1, 2, 3, 4, 5, 10, 14, 16, 20, 30]) {
      expect(resolveNightDefinition(n)).toBe(NIGHT_01);
    }
  });
});
