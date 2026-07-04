import { describe, expect, it } from "vitest";
import { computeHeartbeatTargetStress, computeHeartbeatVolumes } from "./heartbeatStress";
import { OBJECT13_CAMERAS } from "../cameras/cameras.object13";
import { EnemyStage } from "../core/types";

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

  it("plays only slow below the crossfade window", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(40);
    expect(slowVolume).toBeCloseTo(0.22, 5);
    expect(fastVolume).toBe(0);
  });

  it("plays only fast at max stress", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(100);
    expect(slowVolume).toBe(0);
    expect(fastVolume).toBeCloseTo(0.7, 5);
  });

  it("crossfades between slow and fast between stress 60 and 80", () => {
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(70);
    expect(slowVolume).toBeGreaterThan(0);
    expect(fastVolume).toBeGreaterThan(0);
  });
});
