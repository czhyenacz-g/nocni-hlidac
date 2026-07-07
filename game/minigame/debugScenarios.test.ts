import { describe, expect, it } from "vitest";
import { DEFAULT_MINIGAME_DEBUG_SCENARIO_ID, MINIGAME_DEBUG_SCENARIOS, getMiniGameDebugScenario } from "./debugScenarios";

describe("MINIGAME_DEBUG_SCENARIOS", () => {
  it("contains at least the 7 required scenarios", () => {
    expect(MINIGAME_DEBUG_SCENARIOS.length).toBeGreaterThanOrEqual(7);
  });

  it("every scenario has a valid EmergencyMiniGameInput (objective + numeric shots)", () => {
    for (const scenario of MINIGAME_DEBUG_SCENARIOS) {
      expect(["return_to_office", "collect_item", "survive"]).toContain(scenario.input.objective);
      expect(typeof scenario.input.shots).toBe("number");
      expect(scenario.id).toBeTruthy();
      expect(scenario.label).toBeTruthy();
      expect(scenario.description).toBeTruthy();
    }
  });

  it("ids are unique", () => {
    const ids = MINIGAME_DEBUG_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("'return to office' scenario uses objective return_to_office", () => {
    const scenario = getMiniGameDebugScenario("return_to_office");
    expect(scenario.input.objective).toBe("return_to_office");
    expect(scenario.label).toBe("Návrat do kanceláře");
  });

  it("'collect fuse' scenario uses objective collect_item and itemToCollect fuse", () => {
    const scenario = getMiniGameDebugScenario("collect_fuse");
    expect(scenario.input.objective).toBe("collect_item");
    expect(scenario.input.itemToCollect).toBe("fuse");
  });

  it("'collect bulb' scenario uses itemToCollect bulb", () => {
    expect(getMiniGameDebugScenario("collect_bulb").input.itemToCollect).toBe("bulb");
  });

  it("'collect toolbox' scenario uses itemToCollect toolbox", () => {
    expect(getMiniGameDebugScenario("collect_toolbox").input.itemToCollect).toBe("toolbox");
  });

  it("'survive' scenario uses objective survive", () => {
    expect(getMiniGameDebugScenario("survive").input.objective).toBe("survive");
  });

  it("the two 'no shot' scenarios set shots to 0", () => {
    expect(getMiniGameDebugScenario("return_no_shot").input.shots).toBe(0);
    expect(getMiniGameDebugScenario("collect_fuse_no_shot").input.shots).toBe(0);
  });

  it("the default scenario is 'return to office'", () => {
    expect(DEFAULT_MINIGAME_DEBUG_SCENARIO_ID).toBe("return_to_office");
    expect(getMiniGameDebugScenario(DEFAULT_MINIGAME_DEBUG_SCENARIO_ID).input.objective).toBe("return_to_office");
  });

  it("getMiniGameDebugScenario falls back to the first scenario for an unknown id", () => {
    expect(getMiniGameDebugScenario("does-not-exist")).toBe(MINIGAME_DEBUG_SCENARIOS[0]);
  });
});
