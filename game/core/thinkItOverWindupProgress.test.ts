import { describe, expect, it } from "vitest";
import { computeThinkItOverWindupProgressRatio } from "./thinkItOverWindupProgress";
import { THINK_IT_OVER_WINDUP_DURATION_MS } from "../balancing/constants";

describe("computeThinkItOverWindupProgressRatio", () => {
  it("is 0 at the start", () => {
    expect(computeThinkItOverWindupProgressRatio(0)).toBe(0);
  });

  it("is 0.5 at half the duration", () => {
    expect(computeThinkItOverWindupProgressRatio(THINK_IT_OVER_WINDUP_DURATION_MS / 2)).toBe(0.5);
  });

  it("is 1 at completion", () => {
    expect(computeThinkItOverWindupProgressRatio(THINK_IT_OVER_WINDUP_DURATION_MS)).toBe(1);
  });

  it("clamps to 1 above the duration", () => {
    expect(computeThinkItOverWindupProgressRatio(THINK_IT_OVER_WINDUP_DURATION_MS * 2)).toBe(1);
  });
});
