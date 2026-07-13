import { describe, expect, it } from "vitest";
import { computeNightScaling } from "./nightScaling";

describe("computeNightScaling", () => {
  it("night 1 => energyDrainMultiplier 1.00", () => {
    expect(computeNightScaling(1).energyDrainMultiplier).toBeCloseTo(1.0, 5);
  });

  it("night 2 => energyDrainMultiplier 1.07", () => {
    expect(computeNightScaling(2).energyDrainMultiplier).toBeCloseTo(1.07, 5);
  });

  it("night 3 => energyDrainMultiplier 1.14", () => {
    expect(computeNightScaling(3).energyDrainMultiplier).toBeCloseTo(1.14, 5);
  });

  it("night 4 => energyDrainMultiplier 1.21", () => {
    expect(computeNightScaling(4).energyDrainMultiplier).toBeCloseTo(1.21, 5);
  });

  it("night 5 => energyDrainMultiplier 1.36", () => {
    expect(computeNightScaling(5).energyDrainMultiplier).toBeCloseTo(1.36, 5);
  });

  it("night 6 => energyDrainMultiplier 1.57", () => {
    expect(computeNightScaling(6).energyDrainMultiplier).toBeCloseTo(1.57, 5);
  });

  it("night 7 => energyDrainMultiplier 1.78", () => {
    expect(computeNightScaling(7).energyDrainMultiplier).toBeCloseTo(1.78, 5);
  });

  it("night 8 => energyDrainMultiplier 1.99", () => {
    expect(computeNightScaling(8).energyDrainMultiplier).toBeCloseTo(1.99, 5);
  });

  it("night 9 => energyDrainMultiplier 2.20", () => {
    expect(computeNightScaling(9).energyDrainMultiplier).toBeCloseTo(2.2, 5);
  });

  it("night 10 => energyDrainMultiplier 2.50", () => {
    expect(computeNightScaling(10).energyDrainMultiplier).toBeCloseTo(2.5, 5);
  });

  it("night 11 => energyDrainMultiplier still capped at 2.50", () => {
    expect(computeNightScaling(11).energyDrainMultiplier).toBeCloseTo(2.5, 5);
  });

  it("a much higher night (50) => energyDrainMultiplier still capped at 2.50", () => {
    expect(computeNightScaling(50).energyDrainMultiplier).toBeCloseTo(2.5, 5);
  });

  it("night 0 => treated safely as night 1", () => {
    expect(computeNightScaling(0).energyDrainMultiplier).toBeCloseTo(1.0, 5);
    expect(computeNightScaling(0).currentNight).toBe(1);
  });

  it("negative night => treated safely as night 1", () => {
    expect(computeNightScaling(-3).energyDrainMultiplier).toBeCloseTo(1.0, 5);
    expect(computeNightScaling(-3).currentNight).toBe(1);
  });

  it("NaN night => treated safely as night 1", () => {
    expect(computeNightScaling(NaN).energyDrainMultiplier).toBeCloseTo(1.0, 5);
    expect(computeNightScaling(NaN).currentNight).toBe(1);
  });

  it("fractional night is floored, same convention as getNightConfig", () => {
    expect(computeNightScaling(5.9).currentNight).toBe(5);
    expect(computeNightScaling(5.9).energyDrainMultiplier).toBeCloseTo(1.36, 5);
  });

  it("applies only to drain: base drain 10 stays 10 at night 1, becomes 13.6 at night 5", () => {
    const baseDrain = 10;
    expect(baseDrain * computeNightScaling(1).energyDrainMultiplier).toBeCloseTo(10, 5);
    expect(baseDrain * computeNightScaling(5).energyDrainMultiplier).toBeCloseTo(13.6, 5);
  });
});
