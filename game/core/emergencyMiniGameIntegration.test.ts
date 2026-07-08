import { describe, expect, it } from "vitest";
import { applyEmergencyWorldEffects, createBatteryEmergencyInput } from "./emergencyMiniGameIntegration";
import { MAX_POWER } from "../balancing/constants";

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
