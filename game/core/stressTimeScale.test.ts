import { describe, expect, it, vi } from "vitest";
import { computeStressTimeScale } from "./stressTimeScale";

describe("computeStressTimeScale", () => {
  it("stress 0 => scale 1.0 (normal speed)", () => {
    expect(computeStressTimeScale(0)).toBeCloseTo(1, 5);
  });

  it("stress 0.5 => scale 0.75 (MAX_STRESS_TIME_SLOWDOWN 0.5)", () => {
    expect(computeStressTimeScale(0.5)).toBeCloseTo(0.75, 5);
  });

  it("stress 1 => scale 0.5", () => {
    expect(computeStressTimeScale(1)).toBeCloseTo(0.5, 5);
  });

  it("never drops below the configured minimum, even for out-of-range input", () => {
    expect(computeStressTimeScale(2)).toBeCloseTo(0.5, 5);
    expect(computeStressTimeScale(-1)).toBeCloseTo(1, 5);
  });

  it("nightMultiplier defaults to 1 (no change vs. calling without it)", () => {
    expect(computeStressTimeScale(0.5, 1)).toBeCloseTo(computeStressTimeScale(0.5), 5);
  });

  it("nightMultiplier > 1 makes the same stress slow time down more (later nights)", () => {
    // Noc 10: stressTimeSlowdownMultiplier 1.5 (viz game/difficulty/nightScaling.ts)
    expect(computeStressTimeScale(1, 1.5)).toBeCloseTo(0.25, 5); // 1 - 1 * 0.5 * 1.5
    expect(computeStressTimeScale(0.5, 1.5)).toBeCloseTo(0.625, 5); // 1 - 0.5 * 0.5 * 1.5
  });

  it("still clamps to 0, even if stress * MAX_STRESS_TIME_SLOWDOWN * nightMultiplier would overshoot 1", () => {
    expect(computeStressTimeScale(1, 3)).toBe(0);
  });

  it("disabled slowdown => scale 1.0 regardless of stress", async () => {
    vi.resetModules();
    vi.doMock("../balancing/constants", () => ({
      STRESS_TIME_SLOWDOWN_ENABLED: false,
      MAX_STRESS_TIME_SLOWDOWN: 0.5,
    }));
    const { computeStressTimeScale: computeWithDisabled } = await import("./stressTimeScale");
    expect(computeWithDisabled(1)).toBe(1);
    vi.doUnmock("../balancing/constants");
    vi.resetModules();
  });
});
