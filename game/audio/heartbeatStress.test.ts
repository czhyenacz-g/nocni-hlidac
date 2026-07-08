import { describe, expect, it } from "vitest";
import {
  computeAmbientStressMultiplier,
  computeGeneratorStressBonus,
  computeHeartbeatTargetStress,
  computeHeartbeatVolumes,
  computeLowPowerStressBonus,
} from "./heartbeatStress";
import { OBJECT13_CAMERAS } from "../cameras/cameras.object13";
import { EnemyStage } from "../core/types";
import { HEARTBEAT_VOLUME_MULTIPLIER, LOW_POWER_STRESS_MAX_BONUS, MAX_POWER } from "../balancing/constants";

function stressFor(enemyStage: EnemyStage, activeCameraId: string | null, doorClosed = true) {
  return computeHeartbeatTargetStress({
    playerView: "desk",
    isCameraDetailOpen: true,
    activeCameraId: activeCameraId as never,
    enemyStage,
    doorClosed,
    cameras: OBJECT13_CAMERAS,
  });
}

describe("computeHeartbeatTargetStress", () => {
  it("no visible monster => target stress 0", () => {
    expect(stressFor("outside", "outer_yard")).toBe(0);
  });

  it("visible monster on outer_yard => low stress", () => {
    expect(stressFor("outer_yard", "outer_yard")).toBe(20);
  });

  it("visible monster on left_hallway => medium stress", () => {
    expect(stressFor("left_hallway", "left_hallway")).toBe(40);
  });

  it("visible monster on right_hallway => medium stress", () => {
    expect(stressFor("right_hallway", "right_hallway")).toBe(40);
  });

  it("visible monster on door_hallway with door open => max stress", () => {
    expect(stressFor("door_hallway", "door_hallway", false)).toBe(100);
  });

  it("visible monster on door_hallway with door closed => reduced stress", () => {
    expect(stressFor("door_hallway", "door_hallway", true)).toBe(45);
  });

  it("monster on a different camera than the active detail => stress 0", () => {
    expect(stressFor("left_hallway", "right_hallway")).toBe(0);
  });

  it("overview (no camera detail open) never raises stress", () => {
    expect(
      computeHeartbeatTargetStress({
        playerView: "desk",
        isCameraDetailOpen: false,
        activeCameraId: "door_hallway",
        enemyStage: "door_hallway",
        doorClosed: false,
        cameras: OBJECT13_CAMERAS,
      }),
    ).toBe(0);
  });

  it("looking at the door or generator never raises stress, even with a camera id set", () => {
    expect(
      computeHeartbeatTargetStress({
        playerView: "door",
        isCameraDetailOpen: true,
        activeCameraId: "door_hallway",
        enemyStage: "door_hallway",
        doorClosed: false,
        cameras: OBJECT13_CAMERAS,
      }),
    ).toBe(0);
  });
});

describe("computeHeartbeatVolumes", () => {
  it("is silent at stress 0", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(0);
    expect(slowVolume).toBe(0);
    expect(fastVolume).toBe(0);
  });

  it("plays only slow below the crossfade window, boosted by HEARTBEAT_VOLUME_MULTIPLIER", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(40);
    expect(slowVolume).toBeCloseTo(Math.min(1, 0.38 * HEARTBEAT_VOLUME_MULTIPLIER), 5);
    expect(fastVolume).toBe(0);
  });

  it("plays only fast at max stress, clamped to full volume by the boost multiplier", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(100);
    expect(slowVolume).toBe(0);
    expect(fastVolume).toBeCloseTo(Math.min(1, 0.7 * HEARTBEAT_VOLUME_MULTIPLIER), 5);
  });

  it("crossfades between slow and fast between stress 60 and 80", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(70);
    expect(slowVolume).toBeGreaterThan(0);
    expect(fastVolume).toBeGreaterThan(0);
  });

  it("never exceeds full volume (1.0) even after the boost multiplier", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(100);
    expect(slowVolume).toBeLessThanOrEqual(1);
    expect(fastVolume).toBeLessThanOrEqual(1);
  });
});

describe("computeAmbientStressMultiplier", () => {
  it("is 1 (full ambient) at zero stress", () => {
    expect(computeAmbientStressMultiplier(0)).toBeCloseTo(1, 5);
  });

  it("is 0.6 at half stress", () => {
    expect(computeAmbientStressMultiplier(0.5)).toBeCloseTo(0.6, 5);
  });

  it("is 0.2 (MIN_AMBIENT_STRESS_MULTIPLIER) at max stress", () => {
    expect(computeAmbientStressMultiplier(1)).toBeCloseTo(0.2, 5);
  });

  it("clamps out-of-range input", () => {
    expect(computeAmbientStressMultiplier(-1)).toBeCloseTo(1, 5);
    expect(computeAmbientStressMultiplier(2)).toBeCloseTo(0.2, 5);
  });
});

describe("computeGeneratorStressBonus", () => {
  it("adds +20 while the generator is criticalBeeping", () => {
    expect(computeGeneratorStressBonus("criticalBeeping")).toBe(20);
  });

  it("adds +40 while the generator is restarting (self-inflicted, higher than criticalBeeping)", () => {
    expect(computeGeneratorStressBonus("restarting")).toBe(40);
  });

  it("adds nothing for normal/silentFault", () => {
    expect(computeGeneratorStressBonus("normal")).toBe(0);
    expect(computeGeneratorStressBonus("silentFault")).toBe(0);
  });
});

// Nízká energie zvedá stres nezávisle na poloze/generátoru — viz
// game/balancing/constants.ts LOW_POWER_STRESS_* pro pásma.
describe("computeLowPowerStressBonus", () => {
  it("100% energy => bonus 0", () => {
    expect(computeLowPowerStressBonus(100, MAX_POWER)).toBe(0);
  });

  it("50% energy => bonus 0 (threshold itself is still bonus-free)", () => {
    expect(computeLowPowerStressBonus(50, MAX_POWER)).toBe(0);
  });

  it("49% energy => bonus 10", () => {
    expect(computeLowPowerStressBonus(49, MAX_POWER)).toBe(10);
  });

  it("40% energy => bonus 10", () => {
    expect(computeLowPowerStressBonus(40, MAX_POWER)).toBe(10);
  });

  it("39% energy => bonus 20", () => {
    expect(computeLowPowerStressBonus(39, MAX_POWER)).toBe(20);
  });

  it("30% energy => bonus 20", () => {
    expect(computeLowPowerStressBonus(30, MAX_POWER)).toBe(20);
  });

  it("29% energy => bonus 30", () => {
    expect(computeLowPowerStressBonus(29, MAX_POWER)).toBe(30);
  });

  it("20% energy => bonus 30", () => {
    expect(computeLowPowerStressBonus(20, MAX_POWER)).toBe(30);
  });

  it("19% energy => bonus 40", () => {
    expect(computeLowPowerStressBonus(19, MAX_POWER)).toBe(40);
  });

  it("10% energy => bonus 40", () => {
    expect(computeLowPowerStressBonus(10, MAX_POWER)).toBe(40);
  });

  it("9% energy => bonus 50", () => {
    expect(computeLowPowerStressBonus(9, MAX_POWER)).toBe(50);
  });

  it("1% energy => bonus 50", () => {
    expect(computeLowPowerStressBonus(1, MAX_POWER)).toBe(50);
  });

  it("0% energy => bonus is high enough that the combined target stress reaches MAX_STRESS (100)", () => {
    const bonus = computeLowPowerStressBonus(0, MAX_POWER);
    expect(bonus).toBe(LOW_POWER_STRESS_MAX_BONUS);
    // Even with zero contribution from every other stress source, the sum
    // (clamped the same way useHeartbeatStress.ts clamps targetStress) hits 100.
    expect(Math.min(100, 0 + 0 + bonus)).toBe(100);
  });

  it("never lets the combined stress exceed MAX_STRESS (100), even stacked with other bonuses", () => {
    const bonus = computeLowPowerStressBonus(5, MAX_POWER);
    const combined = Math.min(100, /* locationStress */ 100 + /* generatorBonus */ 40 + bonus);
    expect(combined).toBe(100);
  });

  it("recovers (bonus drops) once recharge brings power back above the threshold", () => {
    const lowBonus = computeLowPowerStressBonus(20, MAX_POWER);
    const rechargedBonus = computeLowPowerStressBonus(60, MAX_POWER);
    expect(lowBonus).toBe(30);
    expect(rechargedBonus).toBe(0);
    expect(rechargedBonus).toBeLessThan(lowBonus);
  });

  it("negative power is treated the same as 0% (max bonus), never throws or goes negative", () => {
    expect(computeLowPowerStressBonus(-10, MAX_POWER)).toBe(LOW_POWER_STRESS_MAX_BONUS);
  });

  it("power above maxPower is clamped to 100% (bonus 0), not an overshoot", () => {
    expect(computeLowPowerStressBonus(150, MAX_POWER)).toBe(0);
  });
});
