import { describe, expect, it } from "vitest";
import {
  DEFAULT_BATTERY_RUN_LAYOUT_ID,
  applyEmergencyWorldEffects,
  canStartBatteryEmergencyRun,
  createBatteryEmergencyInput,
  shouldLaunchEmergencyMiniGame,
} from "./emergencyMiniGameIntegration";
import { MAX_POWER } from "../balancing/constants";
import { SERVICE_FLOOR_EVAC_PLAN } from "../minigame/layouts/serviceFloorEvacPlan";

describe("createBatteryEmergencyInput", () => {
  it("has objective collect_item and itemToCollect battery", () => {
    const input = createBatteryEmergencyInput();
    expect(input.objective).toBe("collect_item");
    expect(input.itemToCollect).toBe("battery");
  });

  it("has no shotgun and no ammo (stealth run)", () => {
    const input = createBatteryEmergencyInput();
    expect(input.equipment).toEqual({ hasShotgun: false, ammo: 0 });
  });

  it("uses service_floor_evac_plan as the layoutId (the real, larger map, not the alpha baseline)", () => {
    const input = createBatteryEmergencyInput();
    expect(input.layoutId).toBe("service_floor_evac_plan");
    expect(input.layoutId).toBe(SERVICE_FLOOR_EVAC_PLAN.id);
    expect(input.layoutId).toBe(DEFAULT_BATTERY_RUN_LAYOUT_ID);
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
