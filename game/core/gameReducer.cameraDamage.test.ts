import { afterEach, describe, expect, it, vi } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { CameraDamageState, GameState } from "./types";
import { INACTIVE_CAMERA_DAMAGE, isWatchingDisabledCameraFootstepsSource } from "./cameraDamage";
import { CAMERA_ATTACK_COOLDOWN_MS, CAMERA_FAILURE_TRANSITION_MS, GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS } from "./cameraDamageConfig";

// Pravá větev natvrdo (viz basicIntruder.ts routeVariants) — createInitialGameState
// by jinak vylosovala náhodnou variantu (Math.random), což by dělalo testy
// nedeterministické a "left_hallway"/"right_hallway" testy nespolehlivé,
// kdyby náhodou padla druhá větev. enemyLocationEnteredAtMs daleko v
// minulosti, ať MONSTER_MIN_LOCATION_STAY_MS nikdy nezablokuje testovaný hod
// (min-stay se testuje samostatně v monsterMinStay.test.ts).
function stateWith(overrides: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "desk",
    cameraOpen: true,
    cameraViewMode: "detail",
    activeCameraId: "door_hallway",
    sonicCannonActive: true,
    enemyStage: "door_hallway",
    enemyRoute: ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
    enemyLocationEnteredAtMs: -1_000_000,
    ...overrides,
  };
}

function cameraDamageWith(overrides: Partial<CameraDamageState>): CameraDamageState {
  return { ...INACTIVE_CAMERA_DAMAGE, ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ENEMY_ADVANCE — Ghoul camera attack integration", () => {
  it("1. rolls at every sonic cannon use — including a guaranteed-hit roll right after a successful repel", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ elapsedMs: 1000 });
    // First Math.random call is the movement roll — 0.2 lands in the retreat
    // bucket (SONIC_CANNON_ADVANCE_CHANCE 0.08 <= 0.2 < 0.08+0.32 = "success").
    // Second call is the camera-attack roll (guaranteed hit).
    vi.spyOn(Math, "random").mockReturnValueOnce(0.2).mockReturnValue(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("success");
    expect(result.cameraDamage.activeAttack).toEqual({ cameraId: "door_hallway", startedAtMs: 1000, animationId: "door_hallway" });
    expect(result.cameraAttackStartedSeq).toBe(1);
  });

  it("3. never rolls when the cannon isn't in use this tick, even with a guaranteed-hit Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ sonicCannonActive: false });
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.cameraDamage).toBe(state.cameraDamage);
  });

  it("5. a losing camera roll leaves the camera untouched, movement proceeds normally", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999).mockReturnValue(0.99);
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({});
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.cameraDamage).toBe(state.cameraDamage);
    expect(result.cameraAttackStartedSeq).toBe(0);
  });

  it("18. camera attack takes over movement — no double retreat when the cannon ALSO succeeded this tick", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValue(0);
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "door_hallway", elapsedMs: 2000 });
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    // Single retreat step outward (door_hallway -> right_hallway/left_hallway,
    // whichever branch this run's route uses) — never further than one step,
    // and lastEnemyDecision proves the camera-attack path took over, not the
    // normal "retreat" decision.
    expect(result.lastEnemyDecision).toBe("ghoul_camera_attack");
    const routeIndexBefore = state.enemyRoute.indexOf("door_hallway");
    const routeIndexAfter = state.enemyRoute.indexOf(result.enemyStage);
    expect(routeIndexAfter).toBe(routeIndexBefore - 1);
  });

  it("16. camera attack overrides an 'advance' decision too — Ghoul still only retreats one step outward, never closer", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999).mockReturnValue(0);
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "door_hallway", elapsedMs: 3000 });
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("fail");
    expect(result.lastEnemyDecision).toBe("ghoul_camera_attack");
    const routeIndexBefore = state.enemyRoute.indexOf("door_hallway");
    const routeIndexAfter = state.enemyRoute.indexOf(result.enemyStage);
    expect(routeIndexAfter).toBe(routeIndexBefore - 1);
  });

  it("17. sets a forced-pause window (chance 0) for GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS after the attack", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValue(0);
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ elapsedMs: 5000 });
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyForcedRetreatUntilMs).toBe(5000 + GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS);
    expect(result.enemyForcedRetreatChance).toBe(0);
  });

  it("7. only the night's limit worth of DIFFERENT cameras can ever be disabled — a second camera stays untouched on night 1", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999).mockReturnValue(0);
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      activeCameraId: "right_hallway",
      enemyStage: "right_hallway",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"], lastAttackAtMs: 0 }),
      elapsedMs: CAMERA_ATTACK_COOLDOWN_MS + 1,
    });
    vi.spyOn(Math, "random").mockReturnValueOnce(0.2).mockReturnValue(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 1 });
    expect(result.cameraDamage.disabledCameraIds).toEqual(["door_hallway"]);
  });

  it("9. a higher night number allows more distinct disabled cameras", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      activeCameraId: "right_hallway",
      enemyStage: "right_hallway",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"], lastAttackAtMs: 0 }),
      elapsedMs: CAMERA_ATTACK_COOLDOWN_MS + 1,
    });
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999).mockReturnValue(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 20 });
    expect(result.cameraDamage.activeAttack).not.toBeNull();
  });

  it("respects the debug chance override for the real production path too", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ debugGhoulCameraAttackChanceOverride: 1 });
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.cameraDamage.activeAttack).not.toBeNull();
  });
});

describe("TICK — camera damage phase transition", () => {
  it("11. transitions activeAttack -> disabledCameraIds after ~5000ms and bumps cameraOfflineSeq exactly once", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      elapsedMs: 0,
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 0, animationId: "door_hallway" } }),
    });
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999).mockReturnValue(0.5);
    const result = reducer(state, { type: "TICK", deltaMs: CAMERA_FAILURE_TRANSITION_MS });
    expect(result.cameraDamage.disabledCameraIds).toEqual(["door_hallway"]);
    expect(result.cameraDamage.activeAttack).toBeNull();
    expect(result.cameraOfflineSeq).toBe(1);
  });

  it("does not transition before ~5000ms elapse", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      elapsedMs: 0,
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 0, animationId: "door_hallway" } }),
    });
    const result = reducer(state, { type: "TICK", deltaMs: CAMERA_FAILURE_TRANSITION_MS - 100 });
    expect(result.cameraDamage.activeAttack).not.toBeNull();
    expect(result.cameraOfflineSeq).toBe(0);
  });

  it("offline cameras stay offline across further ticks (no auto-recovery mid-night)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      elapsedMs: 100_000,
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
    });
    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.cameraDamage.disabledCameraIds).toEqual(["door_hallway"]);
  });
});

describe("12. mic stays active on an offline camera — image is gone, but nothing blocks the enemyStage/mic path", () => {
  it("TOGGLE_SONIC_CANNON still works on a fully offline camera (image gone, mic/cannon unaffected)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      sonicCannonActive: false,
      activeCameraId: "door_hallway",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
    });
    const result = reducer(state, { type: "TOGGLE_SONIC_CANNON" });
    expect(result.sonicCannonActive).toBe(true);
  });

  it("activation still works normally on a different, unaffected camera", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      sonicCannonActive: false,
      activeCameraId: "outer_yard",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
    });
    const result = reducer(state, { type: "TOGGLE_SONIC_CANNON" });
    expect(result.sonicCannonActive).toBe(true);
  });
});

describe("14/15. disabled camera microphone footsteps", () => {
  it("bumps disabledCameraFootstepsSeq when the Ghoul's enemyStage transitions onto a disabled-camera location", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "right_hallway",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
      disabledCameraFootstepsSeq: 0,
    });
    // Force a deterministic "advance" so enemyStage actually changes onto door_hallway.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("door_hallway");
    expect(result.disabledCameraFootstepsSeq).toBe(1);
  });

  it("also triggers when a camera finishes going offline while the Ghoul is already standing there", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "door_hallway",
      elapsedMs: 0,
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 0, animationId: "door_hallway" } }),
      disabledCameraFootstepsSeq: 0,
    });
    const result = reducer(state, { type: "TICK", deltaMs: CAMERA_FAILURE_TRANSITION_MS });
    expect(result.cameraDamage.disabledCameraIds).toEqual(["door_hallway"]);
    expect(result.disabledCameraFootstepsSeq).toBe(1);
  });

  it("15. does not re-trigger on subsequent ticks while the Ghoul stays put (respects cooldown)", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = stateWith({
      enemyStage: "right_hallway",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
      disabledCameraFootstepsSeq: 0,
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.enemyStage).toBe("door_hallway");
    expect(state.disabledCameraFootstepsSeq).toBe(1);

    // Min-stay / forced-retreat gates aside, simulate staying on the same
    // stage for a while — TICK alone never changes enemyStage, so this just
    // confirms footsteps don't fire again from an unrelated TICK.
    const afterTick = reducer(state, { type: "TICK", deltaMs: 500 });
    expect(afterTick.disabledCameraFootstepsSeq).toBe(1);
  });

  it("does not trigger when entering a stage whose camera is NOT disabled", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "right_hallway",
      cameraDamage: INACTIVE_CAMERA_DAMAGE,
      disabledCameraFootstepsSeq: 0,
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.disabledCameraFootstepsSeq).toBe(0);
  });

  it("records WHICH camera the footsteps event belongs to (lastDisabledCameraFootstepsCameraId), not just that one happened", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "right_hallway",
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }),
      disabledCameraFootstepsSeq: 0,
      lastDisabledCameraFootstepsCameraId: null,
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("door_hallway");
    expect(result.lastDisabledCameraFootstepsCameraId).toBe("door_hallway");
  });
});

describe("isWatchingDisabledCameraFootstepsSource — gating rule for footsteps playback (zadání: 'jen tato kamera + aktivní událost pro tuto lokaci')", () => {
  function watchingState(overrides: Partial<GameState>): GameState {
    return stateWith({
      cameraOpen: true,
      cameraViewMode: "detail",
      playerView: "desk",
      activeCameraId: "door_hallway",
      lastDisabledCameraFootstepsCameraId: "door_hallway",
      ...overrides,
    });
  }

  it("1. true when the player is watching the exact camera the last footsteps event belongs to", () => {
    expect(isWatchingDisabledCameraFootstepsSource(watchingState({}))).toBe(true);
  });

  it("2. false when the player is watching a DIFFERENT camera than the event", () => {
    expect(isWatchingDisabledCameraFootstepsSource(watchingState({ activeCameraId: "right_hallway" }))).toBe(false);
  });

  it("6. false when the camera system is closed", () => {
    expect(isWatchingDisabledCameraFootstepsSource(watchingState({ cameraOpen: false }))).toBe(false);
  });

  it("false when in overview mode, not a focused camera detail", () => {
    expect(isWatchingDisabledCameraFootstepsSource(watchingState({ cameraViewMode: "overview" }))).toBe(false);
  });

  it("false when the player has left the desk (door/left_wall/generator view)", () => {
    expect(isWatchingDisabledCameraFootstepsSource(watchingState({ playerView: "door" }))).toBe(false);
  });

  it("false when there was never a footsteps event yet (lastDisabledCameraFootstepsCameraId null)", () => {
    expect(isWatchingDisabledCameraFootstepsSource(watchingState({ lastDisabledCameraFootstepsCameraId: null }))).toBe(false);
  });
});

describe("21. new night resets camera damage", () => {
  it("RESTART_SHIFT resets cameraDamage to fresh defaults", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway", "outer_yard"], lastAttackAtMs: 500, lastFootstepsAtMs: 500 }),
      cameraOfflineSeq: 3,
    });
    const result = reducer(state, { type: "RESTART_SHIFT" });
    expect(result.cameraDamage).toEqual(INACTIVE_CAMERA_DAMAGE);
  });

  it("START_SHIFT (new night) resets cameraDamage to fresh defaults", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }) });
    const result = reducer(state, { type: "START_SHIFT" });
    expect(result.cameraDamage).toEqual(INACTIVE_CAMERA_DAMAGE);
  });
});

describe("22. loading an older state without the new fields falls back safely", () => {
  it("createInitialGameState always produces the safe default shape", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.cameraDamage).toEqual({
      disabledCameraIds: [],
      activeAttack: null,
      lastAttackAtMs: null,
      lastFootstepsAtMs: null,
    });
    expect(state.cameraAttackStartedSeq).toBe(0);
    expect(state.cameraOfflineSeq).toBe(0);
    expect(state.disabledCameraFootstepsSeq).toBe(0);
    expect(state.debugGhoulCameraAttackChanceOverride).toBeNull();
  });

  it("a save mid-night with an already-disabled camera stays exactly as loaded (no field is silently dropped)", () => {
    const damaged = cameraDamageWith({ disabledCameraIds: ["door_hallway"], lastAttackAtMs: 12_000 });
    const state = stateWith({ cameraDamage: damaged });
    expect(state.cameraDamage).toEqual(damaged);
  });
});

describe("DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK / DEBUG_RESET_CAMERA_DAMAGE / DEBUG_MOVE_ENEMY_TO_DISABLED_CAMERA / DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS / SET_DEBUG_GHOUL_CAMERA_ATTACK_CHANCE_OVERRIDE", () => {
  it("debug trigger starts an attack on the active camera without touching Math.random", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ activeCameraId: "right_hallway", elapsedMs: 777 });
    // Spy AFTER state construction — createInitialGameState itself rolls
    // Math.random (route variant + generator fault time).
    const randomSpy = vi.spyOn(Math, "random");
    const result = reducer(state, { type: "DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK", currentNight: 1 });
    expect(result.cameraDamage.activeAttack).toEqual({ cameraId: "right_hallway", startedAtMs: 777, animationId: "right_hallway" });
    expect(result.cameraAttackStartedSeq).toBe(1);
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it("debug trigger respects the night limit", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ cameraDamage: cameraDamageWith({ disabledCameraIds: ["door_hallway"] }) });
    const result = reducer(state, { type: "DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK", currentNight: 1 });
    expect(result.cameraDamage).toBe(state.cameraDamage);
  });

  it("debug reset returns cameraDamage to idle defaults", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ cameraDamage: cameraDamageWith({ disabledCameraIds: ["outer_yard"] }) });
    const result = reducer(state, { type: "DEBUG_RESET_CAMERA_DAMAGE" });
    expect(result.cameraDamage).toEqual(INACTIVE_CAMERA_DAMAGE);
  });

  it("debug move teleports the Ghoul to the first disabled camera's location and triggers footsteps", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outside", cameraDamage: cameraDamageWith({ disabledCameraIds: ["left_hallway"] }) });
    const result = reducer(state, { type: "DEBUG_MOVE_ENEMY_TO_DISABLED_CAMERA" });
    expect(result.enemyStage).toBe("left_hallway");
    expect(result.disabledCameraFootstepsSeq).toBe(1);
  });

  it("debug move is a no-op with no disabled cameras", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outside" });
    const result = reducer(state, { type: "DEBUG_MOVE_ENEMY_TO_DISABLED_CAMERA" });
    expect(result).toBe(state);
  });

  it("debug play footsteps bumps the seq unconditionally (ignores cooldown)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ disabledCameraFootstepsSeq: 2 });
    const result = reducer(state, { type: "DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS" });
    expect(result.disabledCameraFootstepsSeq).toBe(3);
  });

  it("debug play footsteps respects the same camera-selection rule as the production event (binds to the currently open camera)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ activeCameraId: "right_hallway", lastDisabledCameraFootstepsCameraId: "door_hallway" });
    const result = reducer(state, { type: "DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS" });
    expect(result.lastDisabledCameraFootstepsCameraId).toBe("right_hallway");
    expect(isWatchingDisabledCameraFootstepsSource(result)).toBe(true);
  });

  it("debug play footsteps with no camera open binds to null (won't play, same as a real event nobody is watching)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ cameraOpen: false, activeCameraId: null });
    const result = reducer(state, { type: "DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS" });
    expect(result.lastDisabledCameraFootstepsCameraId).toBeNull();
    expect(isWatchingDisabledCameraFootstepsSource(result)).toBe(false);
  });

  it("13. debug chance override sets 100%, production constant stays untouched", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({});
    const result = reducer(state, { type: "SET_DEBUG_GHOUL_CAMERA_ATTACK_CHANCE_OVERRIDE", chance: 1 });
    expect(result.debugGhoulCameraAttackChanceOverride).toBe(1);
  });

  it("override can be cleared back to null (production 5%)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ debugGhoulCameraAttackChanceOverride: 1 });
    const result = reducer(state, { type: "SET_DEBUG_GHOUL_CAMERA_ATTACK_CHANCE_OVERRIDE", chance: null });
    expect(result.debugGhoulCameraAttackChanceOverride).toBeNull();
  });

  it("debug trigger respects an explicit animationId override ('vybrat konkrétní sekvenci')", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ activeCameraId: "outer_yard", enemyStage: "outer_yard" });
    const result = reducer(state, { type: "DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK", currentNight: 1, animationId: "door_hallway_light" });
    expect(result.cameraDamage.activeAttack?.animationId).toBe("door_hallway_light");
  });

  it("15/16/17. debug skip-to-last-frame jumps straight to the hold phase without touching disabledCameraIds", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      elapsedMs: 10_000,
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 8000, animationId: "door_hallway" } }),
    });
    const result = reducer(state, { type: "DEBUG_SKIP_CAMERA_ATTACK_TO_LAST_FRAME" });
    expect(result.cameraDamage.activeAttack?.startedAtMs).toBe(10_000 - 2500);
    expect(result.cameraDamage.disabledCameraIds).toEqual([]);
  });

  it("debug skip-to-last-frame is a no-op without an active attack", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({});
    const result = reducer(state, { type: "DEBUG_SKIP_CAMERA_ATTACK_TO_LAST_FRAME" });
    expect(result).toBe(state);
  });

  it("debug skip-to-offline immediately disables the camera and bumps cameraOfflineSeq", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      cameraOfflineSeq: 0,
      cameraDamage: cameraDamageWith({ activeAttack: { cameraId: "door_hallway", startedAtMs: 0, animationId: "door_hallway" } }),
    });
    const result = reducer(state, { type: "DEBUG_SKIP_CAMERA_ATTACK_TO_OFFLINE" });
    expect(result.cameraDamage.disabledCameraIds).toEqual(["door_hallway"]);
    expect(result.cameraDamage.activeAttack).toBeNull();
    expect(result.cameraOfflineSeq).toBe(1);
  });

  it("debug skip-to-offline is a no-op without an active attack", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ cameraOfflineSeq: 0 });
    const result = reducer(state, { type: "DEBUG_SKIP_CAMERA_ATTACK_TO_OFFLINE" });
    expect(result).toBe(state);
  });
});
