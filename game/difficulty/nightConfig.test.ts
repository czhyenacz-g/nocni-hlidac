import { describe, expect, it } from "vitest";
import { DEFAULT_NIGHT_FEATURES, getNightConfig } from "./nightConfig";

describe("getNightConfig", () => {
  it("night 1: no generator faults, no bulb lifetime, no retreat verification", () => {
    const config = getNightConfig(1);
    expect(config.features.generatorFaultsEnabled).toBe(false);
    expect(config.features.bulbLifetimeEnabled).toBe(false);
    expect(config.features.monsterRetreatVerificationEnabled).toBe(false);
    expect(config.features.bulbReplacementEnabled).toBe(true);
    expect(config.briefing.title).toBe("Noc 1");
  });

  it("night 2: still no generator faults, but bulb lifetime turns on", () => {
    const config = getNightConfig(2);
    expect(config.features.generatorFaultsEnabled).toBe(false);
    expect(config.features.bulbLifetimeEnabled).toBe(true);
  });

  it("night 3: generator faults turn on", () => {
    const config = getNightConfig(3);
    expect(config.features.generatorFaultsEnabled).toBe(true);
    expect(config.features.monsterRetreatVerificationEnabled).toBe(false);
  });

  it("night 4: monster retreat verification turns on", () => {
    const config = getNightConfig(4);
    expect(config.features.monsterRetreatVerificationEnabled).toBe(true);
    expect(config.features.generatorFaultsEnabled).toBe(true);
    expect(config.features.bulbLifetimeEnabled).toBe(true);
  });

  it("night 5: everything on, custom briefing", () => {
    const config = getNightConfig(5);
    expect(config.features).toEqual(DEFAULT_NIGHT_FEATURES);
    expect(config.briefing.title).toBe("Noc 5");
    expect(config.briefing.lines.length).toBeGreaterThan(0);
  });

  it("undefined night (999) uses fallback briefing and all default features", () => {
    const config = getNightConfig(999);
    expect(config.features).toEqual(DEFAULT_NIGHT_FEATURES);
    expect(config.briefing.title).toBe("Noc 999");
    expect(config.briefing.lines.length).toBeGreaterThan(0);
  });

  it("never returns undefined values in features, for any defined or undefined night", () => {
    for (const nightNumber of [1, 2, 3, 4, 5, 6, 42]) {
      const { features } = getNightConfig(nightNumber);
      for (const value of Object.values(features)) {
        expect(value).not.toBeUndefined();
        expect(typeof value).toBe("boolean");
      }
    }
  });

  it("invalid input (0, negative, NaN) is treated safely as night 1", () => {
    expect(getNightConfig(0).nightNumber).toBe(1);
    expect(getNightConfig(-5).nightNumber).toBe(1);
    expect(getNightConfig(NaN).nightNumber).toBe(1);
    expect(getNightConfig(0).features.generatorFaultsEnabled).toBe(false);
  });
});
