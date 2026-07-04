import { describe, expect, it } from "vitest";
import { computeNightScaling } from "./nightScaling";

describe("computeNightScaling", () => {
  it("night 1 => energyDrainMultiplier 1.00", () => {
    expect(computeNightScaling(1).energyDrainMultiplier).toBeCloseTo(1.0, 5);
  });

  it("night 2 => energyDrainMultiplier 1.05", () => {
    expect(computeNightScaling(2).energyDrainMultiplier).toBeCloseTo(1.05, 5);
  });

  it("night 3 => energyDrainMultiplier 1.10", () => {
    expect(computeNightScaling(3).energyDrainMultiplier).toBeCloseTo(1.1, 5);
  });

  it("night 4 => energyDrainMultiplier 1.15", () => {
    expect(computeNightScaling(4).energyDrainMultiplier).toBeCloseTo(1.15, 5);
  });

  it("night 5 => energyDrainMultiplier 1.20", () => {
    expect(computeNightScaling(5).energyDrainMultiplier).toBeCloseTo(1.2, 5);
  });

  it("night 10 => energyDrainMultiplier still capped at 1.20", () => {
    expect(computeNightScaling(10).energyDrainMultiplier).toBeCloseTo(1.2, 5);
  });

  it("night 0 / negative / invalid => treated safely as night 1", () => {
    expect(computeNightScaling(0).energyDrainMultiplier).toBeCloseTo(1.0, 5);
    expect(computeNightScaling(-3).energyDrainMultiplier).toBeCloseTo(1.0, 5);
    expect(computeNightScaling(NaN).energyDrainMultiplier).toBeCloseTo(1.0, 5);
    expect(computeNightScaling(0).currentNight).toBe(1);
  });

  it("applies only to drain: base drain 10 stays 10 at night 1, becomes 12 at night 5", () => {
    const baseDrain = 10;
    expect(baseDrain * computeNightScaling(1).energyDrainMultiplier).toBeCloseTo(10, 5);
    expect(baseDrain * computeNightScaling(5).energyDrainMultiplier).toBeCloseTo(12, 5);
  });
});
