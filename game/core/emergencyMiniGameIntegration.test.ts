import { describe, expect, it } from "vitest";
import {
  DEFAULT_BATTERY_RUN_LAYOUT_ID,
  applyEmergencyWorldEffects,
  canStartBatteryEmergencyRun,
  canStartShotgunEmergencyRun,
  createBatteryEmergencyInput,
  createShotgunEmergencyInput,
  resolveBulbsGainedFromWorldEffects,
  resolveExtraLootItems,
  resolveIsFinalMonsterHit,
  resolveOfficeThreatTriggeredFromWorldEffects,
  shouldLaunchEmergencyMiniGame,
} from "./emergencyMiniGameIntegration";
import { MAX_POWER } from "../balancing/constants";
import { SERVICE_FLOOR_EVAC_PLAN } from "../minigame/layouts/serviceFloorEvacPlan";
import { MONSTER_TRUE_ENDING_REQUIRED_HITS } from "./monsterEnding";

describe("createBatteryEmergencyInput", () => {
  it("has objective collect_item and itemToCollect battery", () => {
    const input = createBatteryEmergencyInput({ hasShotgun: false, ammo: 0 });
    expect(input.objective).toBe("collect_item");
    expect(input.itemToCollect).toBe("battery");
  });

  it("passes the equipment argument through unchanged (real player equipment, not hardcoded)", () => {
    expect(createBatteryEmergencyInput({ hasShotgun: false, ammo: 0 }).equipment).toEqual({ hasShotgun: false, ammo: 0 });
    expect(createBatteryEmergencyInput({ hasShotgun: true, ammo: 1 }).equipment).toEqual({ hasShotgun: true, ammo: 1 });
  });

  it("extraLootItems defaults to an empty array when not passed", () => {
    expect(createBatteryEmergencyInput({ hasShotgun: false, ammo: 0 }).extraLootItems).toEqual([]);
  });

  it("passes extraLootItems through unchanged when provided (sandbox výprava)", () => {
    expect(createBatteryEmergencyInput({ hasShotgun: false, ammo: 0 }, ["bulb", "shotgun"]).extraLootItems).toEqual([
      "bulb",
      "shotgun",
    ]);
  });

  it("uses service_floor_evac_plan as the layoutId (the real, larger map, not the alpha baseline)", () => {
    const input = createBatteryEmergencyInput({ hasShotgun: false, ammo: 0 });
    expect(input.layoutId).toBe("service_floor_evac_plan");
    expect(input.layoutId).toBe(SERVICE_FLOOR_EVAC_PLAN.id);
    expect(input.layoutId).toBe(DEFAULT_BATTERY_RUN_LAYOUT_ID);
  });

  it("isFinalMonsterHit defaults to false when not passed", () => {
    expect(createBatteryEmergencyInput({ hasShotgun: false, ammo: 0 }).isFinalMonsterHit).toBe(false);
  });

  it("passes isFinalMonsterHit through unchanged when provided (hidden true ending)", () => {
    expect(createBatteryEmergencyInput({ hasShotgun: false, ammo: 0 }, [], true).isFinalMonsterHit).toBe(true);
  });
});

describe("createShotgunEmergencyInput", () => {
  it("has objective collect_item and itemToCollect shotgun", () => {
    const input = createShotgunEmergencyInput({ hasShotgun: false, ammo: 0 });
    expect(input.objective).toBe("collect_item");
    expect(input.itemToCollect).toBe("shotgun");
  });

  it("passes the equipment argument through unchanged", () => {
    expect(createShotgunEmergencyInput({ hasShotgun: false, ammo: 0 }).equipment).toEqual({ hasShotgun: false, ammo: 0 });
  });

  it("uses the same layout as the battery run", () => {
    expect(createShotgunEmergencyInput({ hasShotgun: false, ammo: 0 }).layoutId).toBe(DEFAULT_BATTERY_RUN_LAYOUT_ID);
  });

  it("extraLootItems defaults to an empty array when not passed", () => {
    expect(createShotgunEmergencyInput({ hasShotgun: false, ammo: 0 }).extraLootItems).toEqual([]);
  });

  it("passes extraLootItems through unchanged when provided", () => {
    expect(createShotgunEmergencyInput({ hasShotgun: false, ammo: 0 }, ["battery", "bulb"]).extraLootItems).toEqual([
      "battery",
      "bulb",
    ]);
  });

  it("isFinalMonsterHit defaults to false when not passed", () => {
    expect(createShotgunEmergencyInput({ hasShotgun: false, ammo: 0 }).isFinalMonsterHit).toBe(false);
  });

  it("passes isFinalMonsterHit through unchanged when provided (hidden true ending)", () => {
    expect(createShotgunEmergencyInput({ hasShotgun: false, ammo: 0 }, [], true).isFinalMonsterHit).toBe(true);
  });
});

// Hidden true ending (viz zadání, game/core/monsterEnding.ts) — spočítá se
// PŘED spuštěním výpravy (viz app/play/page.tsx), ne uvnitř minihry. Za
// jednu výpravu se počítá nejvýš jeden zásah, proto "monsterHitsToday + 1".
describe("resolveIsFinalMonsterHit", () => {
  it("false for hits 1 through 8 (well below the threshold)", () => {
    for (let hits = 0; hits < MONSTER_TRUE_ENDING_REQUIRED_HITS - 2; hits++) {
      expect(resolveIsFinalMonsterHit(hits)).toBe(false);
    }
  });

  it("false when the NEXT hit would be the 9th (still one more after it)", () => {
    expect(resolveIsFinalMonsterHit(MONSTER_TRUE_ENDING_REQUIRED_HITS - 2)).toBe(false);
  });

  it("true when the NEXT hit would be the 10th (the actual threshold)", () => {
    expect(resolveIsFinalMonsterHit(MONSTER_TRUE_ENDING_REQUIRED_HITS - 1)).toBe(true);
  });

  it("stays true past the threshold too (defensive, shouldn't normally happen)", () => {
    expect(resolveIsFinalMonsterHit(MONSTER_TRUE_ENDING_REQUIRED_HITS)).toBe(true);
  });
});

// Sandbox výprava (viz zadání) — battery/bulb garantované na KAŽDÉ výpravě,
// shotgun podmíněně. Primární položka se nikdy nevrací i v extraLootItems.
describe("resolveExtraLootItems", () => {
  it("battery primary: guarantees bulb, no shotgun before night 10", () => {
    const items = resolveExtraLootItems({
      primaryItemId: "battery",
      nightFeatures: { emergencyRunsEnabled: true, shotgunLootEnabled: false },
      hasShotgun: false,
    });
    expect(items).toEqual(["bulb"]);
  });

  it("battery primary: adds shotgun once night 10+ and the player doesn't have it yet", () => {
    const items = resolveExtraLootItems({
      primaryItemId: "battery",
      nightFeatures: { emergencyRunsEnabled: true, shotgunLootEnabled: true },
      hasShotgun: false,
    });
    expect(items).toEqual(["bulb", "shotgun"]);
  });

  it("battery primary: never adds shotgun once the player already has it", () => {
    const items = resolveExtraLootItems({
      primaryItemId: "battery",
      nightFeatures: { emergencyRunsEnabled: true, shotgunLootEnabled: true },
      hasShotgun: true,
    });
    expect(items).toEqual(["bulb"]);
  });

  it("shotgun primary: guarantees battery + bulb, never re-adds shotgun itself", () => {
    const items = resolveExtraLootItems({
      primaryItemId: "shotgun",
      nightFeatures: { emergencyRunsEnabled: true, shotgunLootEnabled: true },
      hasShotgun: false,
    });
    expect(items).toEqual(["battery", "bulb"]);
  });

  it("bulb primary: guarantees battery, never re-adds bulb itself", () => {
    const items = resolveExtraLootItems({
      primaryItemId: "bulb",
      nightFeatures: { emergencyRunsEnabled: true, shotgunLootEnabled: false },
      hasShotgun: false,
    });
    expect(items).toEqual(["battery"]);
  });

  // Zadání (true ending odměna): hráč s odemčenou dvouhlavňovkou má
  // `state.hasShotgun === true` od začátku runu (viz
  // shotgunEquipment.ts#createFreshRunShotgunEquipment) — tahle funkce
  // nezná/nepotřebuje znát hasDoubleBarrelShotgun zvlášť, `hasShotgun: true`
  // už samo o sobě zaručuje, že se běžná brokovnice nespawne jako loot,
  // stejně jako u hráče, co si obyčejnou brokovnici jen přinesl dřív.
  it("never adds shotgun loot for a player who already owns a double-barrel shotgun (hasShotgun: true either way)", () => {
    const items = resolveExtraLootItems({
      primaryItemId: "battery",
      nightFeatures: { emergencyRunsEnabled: true, shotgunLootEnabled: true },
      hasShotgun: true,
    });
    expect(items).toEqual(["bulb"]);
  });
});

// Žárovka — ověření napojení do hlavní hry (viz zadání) — sečte
// "bulbs_serviced" efekty, app/play/page.tsx z toho dispatchne ADD_BULBS_REMAINING.
describe("resolveBulbsGainedFromWorldEffects", () => {
  it("counts one bulbs_serviced effect", () => {
    expect(resolveBulbsGainedFromWorldEffects([{ type: "bulbs_serviced" }])).toBe(1);
  });

  it("counts multiple bulbs_serviced effects (future-proofing, MVP only ever produces one)", () => {
    expect(resolveBulbsGainedFromWorldEffects([{ type: "bulbs_serviced" }, { type: "bulbs_serviced" }])).toBe(2);
  });

  it("ignores unrelated effect types", () => {
    expect(resolveBulbsGainedFromWorldEffects([{ type: "energy_recharged", amount: 35 }, { type: "shotgun_acquired" }])).toBe(0);
  });

  it("returns 0 for undefined/empty effects", () => {
    expect(resolveBulbsGainedFromWorldEffects(undefined)).toBe(0);
    expect(resolveBulbsGainedFromWorldEffects([])).toBe(0);
  });
});

// Zamčené dveře kanceláře (viz zadání) — app/play/page.tsx z tohohle
// dispatchne APPLY_OFFICE_THREAT_ON_RETURN (intensity "high"), stejně jako
// pro existující officeThreatOnReturn, jen z jiného spouštěče.
describe("resolveOfficeThreatTriggeredFromWorldEffects", () => {
  it("true when monster_reached_office is present", () => {
    expect(resolveOfficeThreatTriggeredFromWorldEffects([{ type: "monster_reached_office" }])).toBe(true);
  });

  it("true even alongside other effects", () => {
    expect(
      resolveOfficeThreatTriggeredFromWorldEffects([{ type: "energy_recharged", amount: 35 }, { type: "monster_reached_office" }]),
    ).toBe(true);
  });

  it("false when absent", () => {
    expect(resolveOfficeThreatTriggeredFromWorldEffects([{ type: "energy_recharged", amount: 35 }])).toBe(false);
  });

  it("false for undefined/empty effects", () => {
    expect(resolveOfficeThreatTriggeredFromWorldEffects(undefined)).toBe(false);
    expect(resolveOfficeThreatTriggeredFromWorldEffects([])).toBe(false);
  });
});

describe("canStartShotgunEmergencyRun", () => {
  it("true when emergency runs + shotgun loot are enabled and the player doesn't have it yet", () => {
    expect(canStartShotgunEmergencyRun({ emergencyRunsEnabled: true, shotgunLootEnabled: true }, false)).toBe(true);
  });

  it("false when shotgunLootEnabled is false (before night 10)", () => {
    expect(canStartShotgunEmergencyRun({ emergencyRunsEnabled: true, shotgunLootEnabled: false }, false)).toBe(false);
  });

  it("false when emergencyRunsEnabled is false", () => {
    expect(canStartShotgunEmergencyRun({ emergencyRunsEnabled: false, shotgunLootEnabled: true }, false)).toBe(false);
  });

  it("false once the player already has the shotgun — never offered again", () => {
    expect(canStartShotgunEmergencyRun({ emergencyRunsEnabled: true, shotgunLootEnabled: true }, true)).toBe(false);
  });
});

describe("DEFAULT_BATTERY_RUN_LAYOUT_ID", () => {
  it("is exactly SERVICE_FLOOR_EVAC_PLAN.id, not a duplicated magic string", () => {
    expect(DEFAULT_BATTERY_RUN_LAYOUT_ID).toBe(SERVICE_FLOOR_EVAC_PLAN.id);
  });
});

describe("applyEmergencyWorldEffects", () => {
  it("increases power for energy_recharged", () => {
    expect(applyEmergencyWorldEffects(50, [{ type: "energy_recharged", amount: 35 }])).toBe(85);
  });

  it("does not exceed MAX_POWER", () => {
    expect(applyEmergencyWorldEffects(MAX_POWER - 10, [{ type: "energy_recharged", amount: 35 }])).toBe(MAX_POWER);
  });

  it("sums multiple energy_recharged effects", () => {
    expect(
      applyEmergencyWorldEffects(0, [
        { type: "energy_recharged", amount: 10 },
        { type: "energy_recharged", amount: 20 },
      ]),
    ).toBe(30);
  });

  it("returns power unchanged when effects is undefined or empty", () => {
    expect(applyEmergencyWorldEffects(50, undefined)).toBe(50);
    expect(applyEmergencyWorldEffects(50, [])).toBe(50);
  });

  it("does not throw on unsupported/unknown effect types and leaves power unchanged", () => {
    expect(
      applyEmergencyWorldEffects(50, [{ type: "generator_repaired" }, { type: "bulbs_serviced" }, { type: "shotgun_acquired" }, { type: "ammo_acquired", amount: 1 }]),
    ).toBe(50);
  });

  it("mixes a supported and unsupported effect correctly", () => {
    expect(
      applyEmergencyWorldEffects(50, [{ type: "generator_repaired" }, { type: "energy_recharged", amount: 35 }]),
    ).toBe(85);
  });
});

// Night feature flag guard (viz NightFeatureFlags.emergencyRunsEnabled/
// batteryRunEnabled v game/difficulty/nightConfig.ts) — jediné místo, které
// rozhoduje, jestli "Jít ven pro baterii" jde tuhle noc spustit. Používá ho
// jak LeftWallView (zobrazení tlačítka), tak
// app/play/page.tsx#handleStartEmergencyRun (skutečné spuštění).
describe("canStartBatteryEmergencyRun", () => {
  it("true when both emergencyRunsEnabled and batteryRunEnabled are true", () => {
    expect(canStartBatteryEmergencyRun({ emergencyRunsEnabled: true, batteryRunEnabled: true })).toBe(true);
  });

  it("false when emergencyRunsEnabled is false, even if batteryRunEnabled is true", () => {
    expect(canStartBatteryEmergencyRun({ emergencyRunsEnabled: false, batteryRunEnabled: true })).toBe(false);
  });

  it("false when batteryRunEnabled is false, even if emergencyRunsEnabled is true", () => {
    expect(canStartBatteryEmergencyRun({ emergencyRunsEnabled: true, batteryRunEnabled: false })).toBe(false);
  });

  it("false when both are false", () => {
    expect(canStartBatteryEmergencyRun({ emergencyRunsEnabled: false, batteryRunEnabled: false })).toBe(false);
  });
});

// Regrese pro bug: smrt v minihře -> nová směna -> minihra se otevřela znovu
// místo kanceláře (viz app/play/page.tsx#emergencyRunReadySeq efekt). Kořen:
// emergencyRunReadySeq se při nové směně resetuje na 0 (createInitialGameState),
// což je taky "změna" oproti nenulové hodnotě z předchozí směny — prostý
// `!==` diff by to mylně vyhodnotil jako "windup právě doběhl".
describe("shouldLaunchEmergencyMiniGame", () => {
  it("true on a real increase (windup just completed)", () => {
    expect(shouldLaunchEmergencyMiniGame(0, 1)).toBe(true);
    expect(shouldLaunchEmergencyMiniGame(3, 4)).toBe(true);
  });

  it("false when the value is unchanged", () => {
    expect(shouldLaunchEmergencyMiniGame(2, 2)).toBe(false);
  });

  it("false when the value resets DOWN to 0 (new shift after a previous nonzero seq) — the actual bug", () => {
    expect(shouldLaunchEmergencyMiniGame(1, 0)).toBe(false);
    expect(shouldLaunchEmergencyMiniGame(5, 0)).toBe(false);
  });

  it("false for any decrease, not just resets to 0", () => {
    expect(shouldLaunchEmergencyMiniGame(5, 3)).toBe(false);
  });
});
