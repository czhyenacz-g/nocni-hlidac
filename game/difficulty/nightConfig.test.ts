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
    expect(config.briefing.lines).toEqual(["První směna.", "Stačí vydržet do rána."]);
  });

  it("night 2: still no generator faults, but bulb lifetime turns on", () => {
    const config = getNightConfig(2);
    expect(config.features.generatorFaultsEnabled).toBe(false);
    expect(config.features.bulbLifetimeEnabled).toBe(true);
    expect(config.briefing.lines).toEqual([
      "Viděl jsem to na kameře.",
      "Jen tak tak jsem stihl zavřít dveře.",
      "Žárovka u nich svítí nějak slabě...",
    ]);
  });

  it("night 3: generator faults turn on", () => {
    const config = getNightConfig(3);
    expect(config.features.generatorFaultsEnabled).toBe(true);
    expect(config.features.monsterRetreatVerificationEnabled).toBe(false);
    expect(config.briefing.lines).toEqual(["Generátor včera ztichl.", "Nejhorší zvuk v mém životě."]);
  });

  it("night 4: monster retreat verification turns on", () => {
    const config = getNightConfig(4);
    expect(config.features.monsterRetreatVerificationEnabled).toBe(true);
    expect(config.features.generatorFaultsEnabled).toBe(true);
    expect(config.features.bulbLifetimeEnabled).toBe(true);
    expect(config.briefing.lines).toEqual(["Na kameře nebylo nic vidět.", "Do dveří stejně něco udeřilo."]);
  });

  it.each([5, 6, 7, 8, 9, 10])("night %i: everything on, shared fallback-style briefing", (nightNumber) => {
    const config = getNightConfig(nightNumber);
    expect(config.features).toEqual(DEFAULT_NIGHT_FEATURES);
    expect(config.briefing.title).toBe(`Noc ${nightNumber}`);
    expect(config.briefing.lines).toEqual(["Služby jsou čím dál horší.", "Tohle místo se rozpadá."]);
  });

  it("undefined night (999) uses the same fallback briefing and all default features", () => {
    const config = getNightConfig(999);
    expect(config.features).toEqual(DEFAULT_NIGHT_FEATURES);
    expect(config.briefing.title).toBe("Noc 999");
    expect(config.briefing.lines).toEqual(["Služby jsou čím dál horší.", "Tohle místo se rozpadá."]);
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

// "Jít ven" (EmergencyMiniGame z left_wall) je zatím zapnuté pro všechny
// noci — vývoj/ruční testování, žádná NIGHT_CONFIGS položka je zatím
// nevypíná. Budoucí záměr (noc 1–5 emergencyRunsEnabled: false, noc 6+
// true) je zdokumentovaný v nightConfig.ts, ne (ještě) v tomhle chování.
describe("DEFAULT_NIGHT_FEATURES — emergency runs", () => {
  it("emergencyRunsEnabled defaults to true", () => {
    expect(DEFAULT_NIGHT_FEATURES.emergencyRunsEnabled).toBe(true);
  });

  it("batteryRunEnabled defaults to true", () => {
    expect(DEFAULT_NIGHT_FEATURES.batteryRunEnabled).toBe(true);
  });

  it("bulbRunEnabled defaults to false (no bulb run mission exists in /play yet)", () => {
    expect(DEFAULT_NIGHT_FEATURES.bulbRunEnabled).toBe(false);
  });
});

describe("getNightConfig — emergency runs stay on for every night (current dev default)", () => {
  it("night 1 has emergencyRunsEnabled and batteryRunEnabled true", () => {
    const config = getNightConfig(1);
    expect(config.features.emergencyRunsEnabled).toBe(true);
    expect(config.features.batteryRunEnabled).toBe(true);
  });

  it.each([2, 3, 4, 5, 6, 7, 20])("night %i keeps the default true (no per-night override yet)", (nightNumber) => {
    const config = getNightConfig(nightNumber);
    expect(config.features.emergencyRunsEnabled).toBe(true);
    expect(config.features.batteryRunEnabled).toBe(true);
  });
});
