import { describe, expect, it } from "vitest";
import {
  computeAmbientStressMultiplier,
  computeGeneratorStressBonus,
  computeHeartbeatTargetStress,
  computeHeartbeatVolumes,
} from "./heartbeatStress";
import { OBJECT13_CAMERAS } from "../cameras/cameras.object13";
import { EnemyStage } from "../core/types";
import { HEARTBEAT_VOLUME_MULTIPLIER } from "../balancing/constants";

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
    expect(slowVolume).toBeCloseTo(0.22 * HEARTBEAT_VOLUME_MULTIPLIER, 5);
    expect(fastVolume).toBe(0);
  });

  it("plays only fast at max stress, boosted by HEARTBEAT_VOLUME_MULTIPLIER", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(100);
    expect(slowVolume).toBe(0);
    expect(fastVolume).toBeCloseTo(0.7 * HEARTBEAT_VOLUME_MULTIPLIER, 5);
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

  it("adds nothing for normal/silentFault/restarting", () => {
    expect(computeGeneratorStressBonus("normal")).toBe(0);
    expect(computeGeneratorStressBonus("silentFault")).toBe(0);
    expect(computeGeneratorStressBonus("restarting")).toBe(0);
  });
});
