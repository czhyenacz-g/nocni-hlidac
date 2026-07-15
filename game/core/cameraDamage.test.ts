import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attemptGhoulCameraAttack,
  canDebugTriggerGhoulCameraAttack,
  canRollGhoulCameraAttack,
  debugSkipActiveAttackToOffline,
  debugSkipToLastFrame,
  debugTriggerGhoulCameraAttack,
  getMaxDisabledCamerasForNight,
  INACTIVE_CAMERA_DAMAGE,
  isCameraFullyOffline,
  isEnemyOnDisabledCameraStage,
  isGhoulEnemy,
  resolveCameraAttackVisualPhase,
  resolveGhoulCameraAttackAnimationId,
  rollGhoulCameraAttack,
  updateCameraDamagePhase,
} from "./cameraDamage";
import { CAMERA_ATTACK_COOLDOWN_MS, CAMERA_FAILURE_TRANSITION_MS, GHOUL_CAMERA_ATTACK_CHANCE, GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS, GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS } from "./cameraDamageConfig";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { CameraDamageState, GameState, NightDefinition } from "./types";
import { BASIC_INTRUDER } from "../enemies/basicIntruder";

function stateWith(overrides: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    activeCameraId: "door_hallway",
    enemyStage: "door_hallway",
    ...overrides,
  };
}

function cameraDamageWith(overrides: Partial<CameraDamageState>): CameraDamageState {
  return { ...INACTIVE_CAMERA_DAMAGE, ...overrides };
}

const NOT_GHOUL_NIGHT: NightDefinition = {
  ...NIGHT_01,
  enemy: { ...BASIC_INTRUDER, id: "some_other_monster" },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isGhoulEnemy", () => {
  it("true for the game's only enemy (basic_intruder, narratively the Ghoul)", () => {
    expect(isGhoulEnemy(NIGHT_01)).toBe(true);
  });

  it("3. false for a hypothetical different enemy id", () => {
    expect(isGhoulEnemy(NOT_GHOUL_NIGHT)).toBe(false);
  });
});

describe("resolveGhoulCameraAttackAnimationId", () => {
  it("4. left hallway -> 'left_hallway'", () => {
    expect(resolveGhoulCameraAttackAnimationId("left_hallway", false)).toBe("left_hallway");
  });

  it("5. right hallway -> 'right_hallway'", () => {
    expect(resolveGhoulCameraAttackAnimationId("right_hallway", false)).toBe("right_hallway");
  });

  it("6. door hallway without light -> 'door_hallway'", () => {
    expect(resolveGhoulCameraAttackAnimationId("door_hallway", false)).toBe("door_hallway");
  });

  it("7. door hallway with light -> 'door_hallway_light'", () => {
    expect(resolveGhoulCameraAttackAnimationId("door_hallway", true)).toBe("door_hallway_light");
  });

  it("outer_yard has no sequence (null) — a real gap, not a bug", () => {
    expect(resolveGhoulCameraAttackAnimationId("outer_yard", false)).toBeNull();
  });
});

describe("getMaxDisabledCamerasForNight", () => {
  it("nights 1-10: max 1", () => {
    expect(getMaxDisabledCamerasForNight(1)).toBe(1);
    expect(getMaxDisabledCamerasForNight(10)).toBe(1);
  });

  it("nights 11-19: max 2", () => {
    expect(getMaxDisabledCamerasForNight(11)).toBe(2);
    expect(getMaxDisabledCamerasForNight(19)).toBe(2);
  });

  it("nights 20+: max 3", () => {
    expect(getMaxDisabledCamerasForNight(20)).toBe(3);
    expect(getMaxDisabledCamerasForNight(99)).toBe(3);
  });
});

describe("canRollGhoulCameraAttack", () => {
  it("true regardless of sonic repel outcome (this function doesn't even see sonicResult)", () => {
    expect(canRollGhoulCameraAttack(stateWith({}), NIGHT_01, 1)).toBe(true);
  });

  it("false for a non-Ghoul enemy", () => {
    expect(canRollGhoulCameraAttack(stateWith({}), NOT_GHOUL_NIGHT, 1)).toBe(false);
  });

  it("false without a valid active camera", () => {
    expect(canRollGhoulCameraAttack(stateWith({ activeCameraId: null }), NIGHT_01, 1)).toBe(false);
  });

  it("false when the active camera is already offline", () => {
    const state = stateWith({ cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }) });
    expect(canRollGhoulCameraAttack(state, NIGHT_01, 1)).toBe(false);
  });

  it("false while a different camera is mid-attack (activeAttack !== null)", () => {
    const state = stateWith({
      activeCameraId: "outer_yard",
      enemyStage: "outer_yard",
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "left_hallway", startedAtMs: 0, animationId: "left_hallway" } }),
    });
    expect(canRollGhoulCameraAttack(state, NIGHT_01, 1)).toBe(false);
  });

  it("false once the night's limit is reached", () => {
    const state = stateWith({
      activeCameraId: "outer_yard",
      enemyStage: "outer_yard",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
    });
    expect(canRollGhoulCameraAttack(state, NIGHT_01, 1)).toBe(false);
  });

  it("eligible again once the limit for a later night is higher", () => {
    const state = stateWith({
      activeCameraId: "outer_yard",
      enemyStage: "outer_yard",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
    });
    expect(canRollGhoulCameraAttack(state, NIGHT_01, 11)).toBe(true);
  });

  it("false while the cooldown since the last attack hasn't expired", () => {
    const state = stateWith({ elapsedMs: 5000, cameraDamage: cameraDamageWith({ lastAttackAtMs: 5000 - 1000 }) });
    expect(canRollGhoulCameraAttack(state, NIGHT_01, 1)).toBe(false);
  });

  it("10. true once the cooldown has expired", () => {
    const state = stateWith({
      elapsedMs: 5000 + CAMERA_ATTACK_COOLDOWN_MS,
      cameraDamage: cameraDamageWith({ lastAttackAtMs: 5000 }),
    });
    expect(canRollGhoulCameraAttack(state, NIGHT_01, 1)).toBe(true);
  });

  it("false when the Ghoul isn't actually visible on the active camera", () => {
    const state = stateWith({ activeCameraId: "outer_yard", enemyStage: "left_hallway" });
    expect(canRollGhoulCameraAttack(state, NIGHT_01, 1)).toBe(false);
  });
});

describe("rollGhoulCameraAttack", () => {
  it("defaults to GHOUL_CAMERA_ATTACK_CHANCE (0.05)", () => {
    expect(GHOUL_CAMERA_ATTACK_CHANCE).toBe(0.05);
  });

  it("uses Math.random against the given chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.04);
    expect(rollGhoulCameraAttack(0.05)).toBe(true);
  });

  it("false when the roll lands above the chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(rollGhoulCameraAttack(0.05)).toBe(false);
  });
});

describe("attemptGhoulCameraAttack", () => {
  it("5. a guaranteed-hit roll starts an attack and locks in the animationId for the camera", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({ elapsedMs: 1234, activeCameraId: "left_hallway", enemyStage: "left_hallway" });
    const result = attemptGhoulCameraAttack(state, NIGHT_01, 1, false);
    expect(result).toEqual({
      disabledCameraIds: [],
      activeAttack: { cameraId: "left_hallway", startedAtMs: 1234, animationId: "left_hallway" },
      lastAttackAtMs: 1234,
      lastFootstepsAtMs: null,
    });
  });

  it("8. door hallway light state is read at the moment of the attack and locked into animationId", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({ elapsedMs: 0 });
    const result = attemptGhoulCameraAttack(state, NIGHT_01, 1, true);
    expect(result.activeAttack?.animationId).toBe("door_hallway_light");
  });

  it("outer_yard (no sequence) still starts an attack — animationId is null, falls back to CSS at render time", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({ activeCameraId: "outer_yard", enemyStage: "outer_yard" });
    const result = attemptGhoulCameraAttack(state, NIGHT_01, 1, false);
    expect(result.activeAttack?.animationId).toBeNull();
  });

  it("never triggers for a non-Ghoul enemy, even with a guaranteed-hit roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({});
    expect(attemptGhoulCameraAttack(state, NOT_GHOUL_NIGHT, 1, false)).toBe(state.cameraDamage);
  });

  it("a losing random roll leaves the camera functional/untouched", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = stateWith({});
    expect(attemptGhoulCameraAttack(state, NIGHT_01, 1, false)).toBe(state.cameraDamage);
  });

  it("an already-offline camera can never be re-attacked, even with a guaranteed-hit roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({ cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }) });
    expect(attemptGhoulCameraAttack(state, NIGHT_01, 1, false)).toBe(state.cameraDamage);
  });

  it("cannot exceed the night-1..10 limit of 1: a second camera stays untouched once one is already disabled", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({
      activeCameraId: "outer_yard",
      enemyStage: "outer_yard",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
    });
    expect(attemptGhoulCameraAttack(state, NIGHT_01, 1, false)).toBe(state.cameraDamage);
  });

  it("respects the night-20+ limit of 3: a third distinct camera CAN still be disabled", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({
      activeCameraId: "left_hallway",
      enemyStage: "left_hallway",
      elapsedMs: 999_999,
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway", "outer_yard"], lastAttackAtMs: 0 }),
    });
    const result = attemptGhoulCameraAttack(state, NIGHT_01, 20, false);
    expect(result.activeAttack?.cameraId).toBe("left_hallway");
  });

  it("after the cooldown expires (and the limit isn't exhausted), a new attack can start", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = stateWith({
      activeCameraId: "outer_yard",
      enemyStage: "outer_yard",
      elapsedMs: 100_000,
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"], lastAttackAtMs: 100_000 - CAMERA_ATTACK_COOLDOWN_MS }),
    });
    const result = attemptGhoulCameraAttack(state, NIGHT_01, 11, false);
    expect(result.activeAttack?.cameraId).toBe("outer_yard");
  });

  it("respects a debug chance override (100%) without touching the production constant", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const state = stateWith({});
    expect(attemptGhoulCameraAttack(state, NIGHT_01, 1, false, 1)).not.toBe(state.cameraDamage);
    expect(GHOUL_CAMERA_ATTACK_CHANCE).toBe(0.05);
  });
});

describe("resolveCameraAttackVisualPhase", () => {
  const animatingDurationMs = GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS + GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS;

  it("9. total frames+hold duration is well within CAMERA_FAILURE_TRANSITION_MS (offline never happens mid-animation)", () => {
    expect(animatingDurationMs).toBeLessThan(CAMERA_FAILURE_TRANSITION_MS);
  });

  it("14. approaching-camera covers the whole frames+hold window", () => {
    const cameraDamage = cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 1000, animationId: "door_hallway" } });
    expect(resolveCameraAttackVisualPhase(cameraDamage, "door_hallway", 1000 + animatingDurationMs - 1)).toBe("approaching-camera");
  });

  it("signal-failing starts exactly when frames+hold complete", () => {
    const cameraDamage = cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 1000, animationId: "door_hallway" } });
    expect(resolveCameraAttackVisualPhase(cameraDamage, "door_hallway", 1000 + animatingDurationMs)).toBe("signal-failing");
  });

  it("13. offline once the camera is in disabledCameraIds, regardless of elapsedMs", () => {
    const cameraDamage = cameraDamageWith({ disabledCameraIds: ["door_hallway"] });
    expect(resolveCameraAttackVisualPhase(cameraDamage, "door_hallway", 999_999_999)).toBe("offline");
  });

  it("idle for a camera with no attack at all", () => {
    expect(resolveCameraAttackVisualPhase(INACTIVE_CAMERA_DAMAGE, "door_hallway", 999_999)).toBe("idle");
  });
});

describe("updateCameraDamagePhase", () => {
  it("moves activeAttack into disabledCameraIds after ~5000ms and bumps cameraOfflineSeq", () => {
    const state = stateWith({
      elapsedMs: 6000,
      cameraOfflineSeq: 0,
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 1000, animationId: "door_hallway" } }),
    });
    const result = updateCameraDamagePhase(state, 1000 + CAMERA_FAILURE_TRANSITION_MS);
    expect(result.cameraDamage.disabledCameraIds).toEqual(["door_hallway"]);
    expect(result.cameraDamage.activeAttack).toBeNull();
    expect(result.cameraOfflineSeq).toBe(1);
  });

  it("does not transition before ~5000ms elapse", () => {
    const state = stateWith({
      cameraOfflineSeq: 0,
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 1000, animationId: "door_hallway" } }),
    });
    const result = updateCameraDamagePhase(state, 1000 + CAMERA_FAILURE_TRANSITION_MS - 1);
    expect(result.cameraDamage.activeAttack).not.toBeNull();
    expect(result.cameraOfflineSeq).toBe(0);
  });

  it("is a no-op without an active attack", () => {
    const state = stateWith({ cameraOfflineSeq: 0 });
    const result = updateCameraDamagePhase(state, 999_999);
    expect(result.cameraDamage).toBe(state.cameraDamage);
    expect(result.cameraOfflineSeq).toBe(0);
  });
});

describe("isCameraFullyOffline", () => {
  it("true only for a disabled camera", () => {
    const cameraDamage = cameraDamageWith({ disabledCameraIds: ["door_hallway"] });
    expect(isCameraFullyOffline(cameraDamage, "door_hallway")).toBe(true);
  });

  it("18. false mid-attack (sonic cannon still blocked separately, but this predicate is false until fully offline)", () => {
    const cameraDamage = cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 0, animationId: "door_hallway" } });
    expect(isCameraFullyOffline(cameraDamage, "door_hallway")).toBe(false);
  });

  it("false for null cameraId", () => {
    const cameraDamage = cameraDamageWith({ disabledCameraIds: ["door_hallway"] });
    expect(isCameraFullyOffline(cameraDamage, null)).toBe(false);
  });
});

describe("isEnemyOnDisabledCameraStage / 20. mic stays functional", () => {
  it("true when the Ghoul's location camera is offline", () => {
    const state = stateWith({ enemyStage: "door_hallway", cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }) });
    expect(isEnemyOnDisabledCameraStage(state, NIGHT_01)).toBe(true);
  });

  it("false when the Ghoul is elsewhere", () => {
    const state = stateWith({ enemyStage: "outer_yard", cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }) });
    expect(isEnemyOnDisabledCameraStage(state, NIGHT_01)).toBe(false);
  });
});

describe("canDebugTriggerGhoulCameraAttack / debugTriggerGhoulCameraAttack / debugSkipToLastFrame / debugSkipActiveAttackToOffline", () => {
  it("never calls Math.random / never reads the production chance", () => {
    const state = stateWith({});
    const randomSpy = vi.spyOn(Math, "random");
    expect(canDebugTriggerGhoulCameraAttack(state, NIGHT_01, 1)).toBe(true);
    debugTriggerGhoulCameraAttack(state, false);
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it("debugTriggerGhoulCameraAttack normally selects the sequence like production", () => {
    const state = stateWith({ activeCameraId: "outer_yard", elapsedMs: 500 });
    expect(debugTriggerGhoulCameraAttack(state, false).activeAttack?.animationId).toBeNull();
  });

  it("debugTriggerGhoulCameraAttack respects an explicit animationId override (dev 'pick a sequence')", () => {
    const state = stateWith({ activeCameraId: "outer_yard", elapsedMs: 500 });
    expect(debugTriggerGhoulCameraAttack(state, false, "door_hallway_light").activeAttack?.animationId).toBe("door_hallway_light");
  });

  it("debugSkipToLastFrame moves startedAtMs so elapsed exactly equals GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS", () => {
    const state = stateWith({ elapsedMs: 10_000, cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 8000, animationId: "door_hallway" } }) });
    const result = debugSkipToLastFrame(state);
    expect(result.activeAttack?.startedAtMs).toBe(10_000 - GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS);
  });

  it("debugSkipToLastFrame is a no-op without an active attack", () => {
    const state = stateWith({});
    expect(debugSkipToLastFrame(state)).toBe(state.cameraDamage);
  });

  it("debugSkipActiveAttackToOffline immediately disables the camera", () => {
    const state = stateWith({ cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 0, animationId: "door_hallway" } }) });
    const result = debugSkipActiveAttackToOffline(state);
    expect(result.disabledCameraIds).toEqual(["door_hallway"]);
    expect(result.activeAttack).toBeNull();
  });

  it("debugSkipActiveAttackToOffline is a no-op without an active attack", () => {
    const state = stateWith({});
    expect(debugSkipActiveAttackToOffline(state)).toBe(state.cameraDamage);
  });
});
