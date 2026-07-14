import { describe, expect, it } from "vitest";
import { computePowerDrainBreakdown } from "./powerDrain";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { computeNightScaling } from "../difficulty/nightScaling";
import { GameState } from "./types";

const NO_SCALING = computeNightScaling(1);

function stateAtDesk(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "desk",
    ...overrides,
  };
}

describe("computePowerDrainBreakdown — safe idle state", () => {
  it("desk + door open + light off + generator normal + no camera detail: no drain, net recharge", () => {
    const state = stateAtDesk();
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    expect(breakdown.sonicCannonActive).toBe(false);
    expect(breakdown.doorDrain).toBe(0);
    expect(breakdown.lightDrain).toBe(0);
    expect(breakdown.generatorExtraDrain).toBe(0);
    expect(breakdown.totalDrainPerSecond).toBe(0);
    expect(breakdown.netPerSecond).toBeCloseTo(NIGHT_01.rechargePerSecondWhenIdle, 10);
    expect(breakdown.netPerSecond).toBeGreaterThan(0);
  });
});

describe("computePowerDrainBreakdown — plain camera watching is free (no sonic cannon)", () => {
  it("camera overview (cameraOpen false) on desk does not drain like an active sonic cannon", () => {
    const state = stateAtDesk({ cameraOpen: false, cameraViewMode: "overview", activeCameraId: null, sonicCannonActive: false });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    expect(breakdown.sonicCannonActive).toBe(false);
    expect(breakdown.cameraDrain).toBe(0);
  });

  it("camera detail open (cameraOpen true) on desk WITHOUT the sonic cannon draws NO camera drain and still recharges — on request: 'watching alone is free'", () => {
    const state = stateAtDesk({
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: NIGHT_01.defaultCameraId,
      sonicCannonActive: false,
    });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    expect(breakdown.sonicCannonActive).toBe(false);
    expect(breakdown.cameraDrain).toBe(0);
    expect(breakdown.idleDrain).toBe(0);
    expect(breakdown.netPerSecond).toBeCloseTo(NIGHT_01.rechargePerSecondWhenIdle, 10);
    expect(breakdown.netPerSecond).toBeGreaterThan(0);
  });

  it("camera detail open while NOT on desk (playerView door/generator) never counts as sonicCannonActive, even if the flag were somehow true", () => {
    const state = stateAtDesk({
      playerView: "door",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: NIGHT_01.defaultCameraId,
      sonicCannonActive: true,
    });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    expect(breakdown.sonicCannonActive).toBe(false);
    expect(breakdown.cameraDrain).toBe(0);
  });
});

describe("computePowerDrainBreakdown — active sonic cannon drains exactly the old camera-watching rate", () => {
  it("sonic cannon active + camera detail open on desk: same idle+cameraOpen drain the old 'watching cameras' branch used, no recharge", () => {
    const state = stateAtDesk({
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: NIGHT_01.defaultCameraId,
      sonicCannonActive: true,
    });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    expect(breakdown.sonicCannonActive).toBe(true);
    expect(breakdown.cameraDrain).toBe(NIGHT_01.powerDrainPerSecond.cameraOpen);
    expect(breakdown.idleDrain).toBe(NIGHT_01.powerDrainPerSecond.idle);
    expect(breakdown.rechargePerSecondWhenIdle).toBe(0);
    expect(breakdown.netPerSecond).toBeLessThan(0);
  });

  it("sonic cannon active drains regardless of WHICH camera is aimed (even an empty one)", () => {
    const state = stateAtDesk({
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "door_hallway",
      sonicCannonActive: true,
    });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);
    expect(breakdown.cameraDrain).toBe(NIGHT_01.powerDrainPerSecond.cameraOpen);
  });
});

describe("computePowerDrainBreakdown — door/light drain isolation", () => {
  it("door drain only applies when doorClosed is true", () => {
    const closed = computePowerDrainBreakdown(stateAtDesk({ doorClosed: true }), NIGHT_01, NO_SCALING);
    const open = computePowerDrainBreakdown(stateAtDesk({ doorClosed: false }), NIGHT_01, NO_SCALING);

    expect(closed.doorDrain).toBe(NIGHT_01.powerDrainPerSecond.doorClosed);
    expect(open.doorDrain).toBe(0);
  });

  it("light drain only applies when lightOn is true", () => {
    const on = computePowerDrainBreakdown(stateAtDesk({ lightOn: true }), NIGHT_01, NO_SCALING);
    const off = computePowerDrainBreakdown(stateAtDesk({ lightOn: false }), NIGHT_01, NO_SCALING);

    expect(on.lightDrain).toBe(NIGHT_01.powerDrainPerSecond.lightOn);
    expect(off.lightDrain).toBe(0);
  });

  it("door and light drain stack (both closed+on at the same time)", () => {
    const state = stateAtDesk({ doorClosed: true, lightOn: true });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    expect(breakdown.drainBeforeMultiplier).toBeCloseTo(
      NIGHT_01.powerDrainPerSecond.doorClosed + NIGHT_01.powerDrainPerSecond.lightOn,
      10,
    );
  });
});

describe("computePowerDrainBreakdown — generator critical drain", () => {
  it("no extra drain while generatorState is normal", () => {
    const breakdown = computePowerDrainBreakdown(stateAtDesk({ generatorState: "normal" }), NIGHT_01, NO_SCALING);
    expect(breakdown.generatorExtraDrain).toBe(0);
  });

  it("no extra drain while generatorState is silentFault (silent grace period, not yet critical)", () => {
    const breakdown = computePowerDrainBreakdown(stateAtDesk({ generatorState: "silentFault" }), NIGHT_01, NO_SCALING);
    expect(breakdown.generatorExtraDrain).toBe(0);
  });

  it("applies the fixed extra drain while criticalBeeping, regardless of actual door/light state", () => {
    const state = stateAtDesk({ generatorState: "criticalBeeping", doorClosed: false, lightOn: false });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    const expectedExtra = 2 * NIGHT_01.powerDrainPerSecond.doorClosed + NIGHT_01.powerDrainPerSecond.lightOn;
    expect(breakdown.generatorExtraDrain).toBeCloseTo(expectedExtra, 10);
  });

  it("applies the same fixed extra drain while restarting", () => {
    const state = stateAtDesk({ generatorState: "restarting" });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    const expectedExtra = 2 * NIGHT_01.powerDrainPerSecond.doorClosed + NIGHT_01.powerDrainPerSecond.lightOn;
    expect(breakdown.generatorExtraDrain).toBeCloseTo(expectedExtra, 10);
  });

  it("extra drain disappears again once generatorState returns to normal (no residual drain after a fix)", () => {
    const during = computePowerDrainBreakdown(stateAtDesk({ generatorState: "restarting" }), NIGHT_01, NO_SCALING);
    const after = computePowerDrainBreakdown(stateAtDesk({ generatorState: "normal" }), NIGHT_01, NO_SCALING);

    expect(during.generatorExtraDrain).toBeGreaterThan(0);
    expect(after.generatorExtraDrain).toBe(0);
  });
});

describe("computePowerDrainBreakdown — night scaling applies exactly once", () => {
  it("multiplies the summed drain by nightScalingMultiplier exactly once, never compounded", () => {
    const scaling = computeNightScaling(5); // multiplier > 1, not the (night 10+) cap
    const state = stateAtDesk({ doorClosed: true, lightOn: true });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, scaling);

    expect(breakdown.nightScalingMultiplier).toBe(scaling.energyDrainMultiplier);
    expect(breakdown.totalDrainPerSecond).toBeCloseTo(breakdown.drainBeforeMultiplier * scaling.energyDrainMultiplier, 10);
  });

  it("never scales the recharge rate", () => {
    const scaling = computeNightScaling(5);
    const state = stateAtDesk();
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, scaling);

    expect(breakdown.rechargePerSecondWhenIdle).toBe(NIGHT_01.rechargePerSecondWhenIdle);
  });
});
