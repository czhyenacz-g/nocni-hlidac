import { describe, expect, it } from "vitest";
import { computeBulbReplacementProgressRatio } from "./bulbReplacementProgress";
import { BULB_REPLACE_DURATION_MS } from "../balancing/constants";

describe("computeBulbReplacementProgressRatio", () => {
  it("is 0 at the start", () => {
    expect(computeBulbReplacementProgressRatio(0)).toBe(0);
  });

  it("is 0.5 at half the duration", () => {
    expect(computeBulbReplacementProgressRatio(BULB_REPLACE_DURATION_MS / 2)).toBe(0.5);
  });

  it("is 1 at completion", () => {
    expect(computeBulbReplacementProgressRatio(BULB_REPLACE_DURATION_MS)).toBe(1);
  });

  it("clamps to 1 above the duration", () => {
    expect(computeBulbReplacementProgressRatio(BULB_REPLACE_DURATION_MS * 2)).toBe(1);
  });
});
