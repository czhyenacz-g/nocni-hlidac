import { describe, expect, it } from "vitest";
import { DEFAULT_NIGHT_FEATURES, SHOTGUN_LOOT_MIN_NIGHT, canSpawnShotgun, getNightConfig } from "./nightConfig";
import { MONSTER_TRUE_ENDING_REQUIRED_HITS, MONSTER_TRUE_ENDING_REQUIRED_HITS_ADMIN } from "../core/monsterEnding";

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

  // shotgunLootEnabled je vždy dopočítané z canSpawnShotgun (viz níže), proto
  // se tu porovnává relativně k SHOTGUN_LOOT_MIN_NIGHT, ne natvrdo — hodnota
  // je DOČASNĚ 1 (ruční testování brokovnice, viz nightConfig.ts), časem se
  // vrátí na 10, tenhle test má projít v obou případech.
  it.each([5, 6, 7, 8, 9])("night %i: everything on (default) except shotgunLootEnabled by threshold, shared fallback-style briefing", (nightNumber) => {
    const config = getNightConfig(nightNumber);
    expect(config.features).toEqual({ ...DEFAULT_NIGHT_FEATURES, shotgunLootEnabled: canSpawnShotgun(nightNumber) });
    expect(config.briefing.title).toBe(`Noc ${nightNumber}`);
    expect(config.briefing.lines).toEqual(["Služby jsou čím dál horší.", "Tohle místo se rozpadá."]);
  });

  it("night SHOTGUN_LOOT_MIN_NIGHT: shotgunLootEnabled turns on (other features may still have per-night overrides, see NIGHT_CONFIGS)", () => {
    const config = getNightConfig(SHOTGUN_LOOT_MIN_NIGHT);
    expect(config.features.shotgunLootEnabled).toBe(true);
    expect(config.briefing.title).toBe(`Noc ${SHOTGUN_LOOT_MIN_NIGHT}`);
  });

  it("undefined night (999) uses the same fallback briefing and all default features except shotgunLootEnabled", () => {
    const config = getNightConfig(999);
    expect(config.features).toEqual({ ...DEFAULT_NIGHT_FEATURES, shotgunLootEnabled: canSpawnShotgun(999) });
    expect(config.briefing.title).toBe("Noc 999");
    expect(config.briefing.lines).toEqual(["Služby jsou čím dál horší.", "Tohle místo se rozpadá."]);
  });

  it("never returns undefined values in features, for any defined or undefined night", () => {
    for (const nightNumber of [1, 2, 3, 4, 5, 6, 42]) {
      const { features } = getNightConfig(nightNumber);
      for (const [key, value] of Object.entries(features)) {
        expect(value).not.toBeUndefined();
        // monsterTrueEndingRequiredHits is the one non-boolean flag (viz
        // game/core/monsterEnding.ts#resolveMonsterTrueEndingRequiredHits) —
        // every other feature stays a plain on/off boolean.
        expect(typeof value).toBe(key === "monsterTrueEndingRequiredHits" ? "number" : "boolean");
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

// Testy jsou psané relativně k SHOTGUN_LOOT_MIN_NIGHT, ne natvrdo k "10", ať
// zůstanou platné i kdyby se práh znovu změnil.
describe("canSpawnShotgun", () => {
  it("is false one night before the threshold", () => {
    expect(canSpawnShotgun(SHOTGUN_LOOT_MIN_NIGHT - 1)).toBe(false);
  });

  it("is true from the threshold night onward", () => {
    expect(canSpawnShotgun(SHOTGUN_LOOT_MIN_NIGHT)).toBe(true);
    expect(canSpawnShotgun(SHOTGUN_LOOT_MIN_NIGHT + 1)).toBe(true);
  });

  it("defaults isAdmin to false — same as calling without the second argument", () => {
    expect(canSpawnShotgun(1, false)).toBe(canSpawnShotgun(1));
    expect(canSpawnShotgun(SHOTGUN_LOOT_MIN_NIGHT, false)).toBe(canSpawnShotgun(SHOTGUN_LOOT_MIN_NIGHT));
  });

  // Admin výjimka (viz zadání "u admina ať je výjimka už od noci 1") —
  // isAdmin: true obchází SHOTGUN_LOOT_MIN_NIGHT úplně, i pro noc 1.
  it("isAdmin: true bypasses the threshold entirely, even on night 1", () => {
    expect(canSpawnShotgun(1, true)).toBe(true);
    expect(canSpawnShotgun(SHOTGUN_LOOT_MIN_NIGHT - 1, true)).toBe(true);
  });
});

describe("getNightConfig — shotgunLootEnabled follows canSpawnShotgun", () => {
  it("matches canSpawnShotgun for every night number, both below and at/above the threshold", () => {
    for (const nightNumber of [1, 2, 3, 4, 5, 9, 10, 11, 50]) {
      expect(getNightConfig(nightNumber).features.shotgunLootEnabled).toBe(canSpawnShotgun(nightNumber));
    }
  });

  it("isAdmin: true turns shotgunLootEnabled on even for night 1 (regular players stay gated by the threshold)", () => {
    expect(getNightConfig(1, true).features.shotgunLootEnabled).toBe(true);
    expect(getNightConfig(1, false).features.shotgunLootEnabled).toBe(false);
    expect(getNightConfig(1).features.shotgunLootEnabled).toBe(false);
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

// Admin zkrácený práh pro true ending (viz zadání "for admin reduce
// necessary monster death count to 2", game/core/monsterEnding.ts) — stejný
// vzor jako shotgunLootEnabled/canSpawnShotgun výše.
describe("getNightConfig — monsterTrueEndingRequiredHits follows resolveMonsterTrueEndingRequiredHits", () => {
  it("regular players (isAdmin false or omitted) get the full MONSTER_TRUE_ENDING_REQUIRED_HITS (10)", () => {
    expect(getNightConfig(1).features.monsterTrueEndingRequiredHits).toBe(MONSTER_TRUE_ENDING_REQUIRED_HITS);
    expect(getNightConfig(1, false).features.monsterTrueEndingRequiredHits).toBe(MONSTER_TRUE_ENDING_REQUIRED_HITS);
  });

  it("admin gets the shortened threshold (2), on any night including night 1", () => {
    expect(getNightConfig(1, true).features.monsterTrueEndingRequiredHits).toBe(MONSTER_TRUE_ENDING_REQUIRED_HITS_ADMIN);
    expect(getNightConfig(5, true).features.monsterTrueEndingRequiredHits).toBe(MONSTER_TRUE_ENDING_REQUIRED_HITS_ADMIN);
  });

  it("defaults to the full (non-admin) threshold in DEFAULT_NIGHT_FEATURES", () => {
    expect(DEFAULT_NIGHT_FEATURES.monsterTrueEndingRequiredHits).toBe(MONSTER_TRUE_ENDING_REQUIRED_HITS);
  });
});
