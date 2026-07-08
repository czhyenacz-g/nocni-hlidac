import { describe, expect, it } from "vitest";
import { DEFAULT_MINIGAME_DEBUG_SCENARIO_ID, MINIGAME_DEBUG_SCENARIOS, getMiniGameDebugScenario } from "./debugScenarios";

describe("MINIGAME_DEBUG_SCENARIOS", () => {
  it("contains at least the 11 required scenarios", () => {
    expect(MINIGAME_DEBUG_SCENARIOS.length).toBeGreaterThanOrEqual(11);
  });

  it("every scenario has a valid EmergencyMiniGameInput (objective + equipment)", () => {
    for (const scenario of MINIGAME_DEBUG_SCENARIOS) {
      expect(["return_to_office", "collect_item", "survive"]).toContain(scenario.input.objective);
      expect(scenario.input.equipment).toBeDefined();
      expect(typeof scenario.input.equipment?.hasShotgun).toBe("boolean");
      expect(typeof scenario.input.equipment?.ammo).toBe("number");
      expect(scenario.id).toBeTruthy();
      expect(scenario.label).toBeTruthy();
      expect(scenario.description).toBeTruthy();
    }
  });

  it("ids are unique", () => {
    const ids = MINIGAME_DEBUG_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("'return to office' scenario uses objective return_to_office with a shotgun and 1 ammo", () => {
    const scenario = getMiniGameDebugScenario("return_to_office");
    expect(scenario.input.objective).toBe("return_to_office");
    expect(scenario.input.equipment).toEqual({ hasShotgun: true, ammo: 1 });
  });

  it("'return_no_weapon' scenario has no shotgun", () => {
    expect(getMiniGameDebugScenario("return_no_weapon").input.equipment).toEqual({ hasShotgun: false, ammo: 0 });
  });

  it("'return_no_ammo' scenario has a shotgun but 0 ammo", () => {
    expect(getMiniGameDebugScenario("return_no_ammo").input.equipment).toEqual({ hasShotgun: true, ammo: 0 });
  });

  it("'collect fuse' scenario uses objective collect_item, itemToCollect fuse, shotgun + 1 ammo", () => {
    const scenario = getMiniGameDebugScenario("collect_fuse");
    expect(scenario.input.objective).toBe("collect_item");
    expect(scenario.input.itemToCollect).toBe("fuse");
    expect(scenario.input.equipment).toEqual({ hasShotgun: true, ammo: 1 });
  });

  it("'collect_fuse_no_weapon' scenario has no shotgun", () => {
    expect(getMiniGameDebugScenario("collect_fuse_no_weapon").input.equipment).toEqual({ hasShotgun: false, ammo: 0 });
  });

  it("'collect_fuse_no_ammo' scenario has a shotgun but 0 ammo", () => {
    expect(getMiniGameDebugScenario("collect_fuse_no_ammo").input.equipment).toEqual({ hasShotgun: true, ammo: 0 });
  });

  it("'collect bulb' scenario uses itemToCollect bulb", () => {
    expect(getMiniGameDebugScenario("collect_bulb").input.itemToCollect).toBe("bulb");
  });

  it("'collect toolbox' scenario uses itemToCollect toolbox", () => {
    expect(getMiniGameDebugScenario("collect_toolbox").input.itemToCollect).toBe("toolbox");
  });

  it("'collect_battery' scenario uses objective collect_item, itemToCollect battery, no shotgun", () => {
    const scenario = getMiniGameDebugScenario("collect_battery");
    expect(scenario.input.objective).toBe("collect_item");
    expect(scenario.input.itemToCollect).toBe("battery");
    expect(scenario.input.equipment).toEqual({ hasShotgun: false, ammo: 0 });
  });

  it("'collect_battery_with_shotgun' scenario uses itemToCollect battery with a shotgun and 1 ammo", () => {
    const scenario = getMiniGameDebugScenario("collect_battery_with_shotgun");
    expect(scenario.input.objective).toBe("collect_item");
    expect(scenario.input.itemToCollect).toBe("battery");
    expect(scenario.input.equipment).toEqual({ hasShotgun: true, ammo: 1 });
  });

  it("'survive' scenario uses objective survive", () => {
    expect(getMiniGameDebugScenario("survive").input.objective).toBe("survive");
  });

  it("no scenario relies on the deprecated 'shots' field anymore", () => {
    for (const scenario of MINIGAME_DEBUG_SCENARIOS) {
      expect(scenario.input.shots).toBeUndefined();
    }
  });

  it("the default scenario is 'return to office'", () => {
    expect(DEFAULT_MINIGAME_DEBUG_SCENARIO_ID).toBe("return_to_office");
    expect(getMiniGameDebugScenario(DEFAULT_MINIGAME_DEBUG_SCENARIO_ID).input.objective).toBe("return_to_office");
  });

  it("getMiniGameDebugScenario falls back to the first scenario for an unknown id", () => {
    expect(getMiniGameDebugScenario("does-not-exist")).toBe(MINIGAME_DEBUG_SCENARIOS[0]);
  });
});
