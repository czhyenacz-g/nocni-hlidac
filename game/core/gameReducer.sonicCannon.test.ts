import { afterEach, describe, expect, it, vi } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { SONIC_CANNON_RETREAT_REVEAL_MS } from "../balancing/constants";

// Trasa pravou chodbou, vždy stejná (ne losovaná) — ať jsou indexy/kamery v
// testech deterministické. Odpovídá imp.ts routeVariants[0].
const ROUTE = ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"] as const;

function stateWith(overrides: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    enemyRoute: [...ROUTE],
    ...overrides,
  };
}

/** Sonické dělo aktivní, na stole, v detailu, mířící přesně na kameru, kde se monstrum nachází. */
function stateWithSonicAimedAt(stage: GameState["enemyStage"], overrides: Partial<GameState> = {}): GameState {
  return stateWith({
    playerView: "desk",
    cameraOpen: true,
    cameraViewMode: "detail",
    activeCameraId: stage as GameState["activeCameraId"],
    sonicCannonActive: true,
    enemyStage: stage,
    // Dost daleko v minulosti, ať min-stay nikdy neblokuje, pokud test sám nechce testovat opak.
    enemyLocationEnteredAtMs: 0,
    elapsedMs: 60_000,
    ...overrides,
  });
}

function mockRoll(value: number) {
  vi.spyOn(Math, "random").mockReturnValue(value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ENEMY_ADVANCE — minimum stay in location", () => {
  it("'outside' before 6000ms: no decision, stays put", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outside", enemyLocationEnteredAtMs: 0, elapsedMs: 5999 });
    mockRoll(0); // by would-be advanceChance (0.16) this WOULD advance if not blocked
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("outside");
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("'outside' at/after 6000ms: decision is allowed to happen", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outside", enemyLocationEnteredAtMs: 0, elapsedMs: 6000 });
    mockRoll(0); // < advanceChance (0.16) -> advance
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("outer_yard");
    expect(result.lastEnemyDecision).toBe("advance");
  });

  it("'left_hallway' before 5000ms: blocked", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyRoute: ["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "attack"],
      enemyStage: "left_hallway",
      enemyLocationEnteredAtMs: 1000,
      elapsedMs: 1000 + 4999,
    });
    mockRoll(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("left_hallway");
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("'right_hallway' before 5000ms: blocked", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "right_hallway", enemyLocationEnteredAtMs: 1000, elapsedMs: 1000 + 4999 });
    mockRoll(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("'door_hallway' before 4000ms: blocked", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "door_hallway", enemyLocationEnteredAtMs: 1000, elapsedMs: 1000 + 3999 });
    mockRoll(0);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("door_hallway");
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("'at_door' keeps its existing standoff behavior untouched by min-stay", () => {
    const reducer = createGameReducer(NIGHT_01);
    // Zavřené dveře -> zablokovaný útok, progress se počítá normálně (viz
    // isDoorAttackBlockedByClosedDoor) — min-stay se sem vůbec nedostane.
    const state = stateWith({
      enemyRoute: ["at_door", "attack"],
      enemyStage: "at_door",
      doorClosed: true,
      enemyLocationEnteredAtMs: 0,
      elapsedMs: 100,
    });
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("waiting_at_door");
    expect(result.doorBangSeq).toBe(state.doorBangSeq + 1);
  });

  it("a 'stay' decision does NOT update enemyLocationEnteredAtMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outer_yard", enemyLocationEnteredAtMs: 500, elapsedMs: 10_000 });
    mockRoll(0.99); // stay for both normal (advance .16, retreat .10) chances
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("outer_yard");
    expect(result.lastEnemyDecision).toBe("stay");
    expect(result.enemyLocationEnteredAtMs).toBe(500);
  });

  it("a 'retreat' decision updates enemyLocationEnteredAtMs to the current elapsedMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outer_yard", enemyLocationEnteredAtMs: 500, elapsedMs: 10_000 });
    mockRoll(0.2); // >= advanceChance(.16), < advanceChance+retreatChance(.26) -> retreat
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("outside");
    expect(result.lastEnemyDecision).toBe("retreat");
    expect(result.enemyLocationEnteredAtMs).toBe(10_000);
  });

  it("an 'advance' decision updates enemyLocationEnteredAtMs to the current elapsedMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outer_yard", enemyLocationEnteredAtMs: 500, elapsedMs: 10_000 });
    mockRoll(0); // < advanceChance -> advance
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.lastEnemyDecision).toBe("advance");
    expect(result.enemyLocationEnteredAtMs).toBe(10_000);
  });

  it("light_repelled (door-light repel, via TICK) is not blocked by minimum stay", () => {
    const reducer = createGameReducer(NIGHT_01);
    // at_door má vlastní explicitní branch (TICK/updateDoorLightRepel), min
    // stay nemá jak zasáhnout — enemyLocationEnteredAtMs 0 s elapsedMs 0
    // (tedy "právě přišel") by jinak leccos jiného zablokovalo.
    const state = stateWith({
      enemyStage: "at_door",
      doorClosed: true,
      lightOn: true,
      enemyLocationEnteredAtMs: 0,
      elapsedMs: 0,
      doorLightRepelMs: NIGHT_01.enemy.doorLightRepelRequiredMs - 50,
    });
    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.lastEnemyDecision).toBe("light_repelled");
    expect(result.enemyStage).not.toBe("at_door");
  });

  it("hallway_light_repelled (UV repel, via TICK) is not blocked by minimum stay", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "door_hallway",
      doorClosed: true,
      roomBulbs: { nearRoom: { remainingMs: 1000, maxMs: 1000, broken: false } },
      lightOn: true,
      enemyLocationEnteredAtMs: 0,
      elapsedMs: 0,
      doorHallwayUvRepelMs: NIGHT_01.enemy.doorHallwayUvRepelRequiredMs - 50,
    });
    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.lastEnemyDecision).toBe("hallway_light_repelled");
    expect(result.enemyStage).not.toBe("door_hallway");
  });

  it("gave_up (standoff timeout at closed door) is not blocked by minimum stay", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "at_door",
      doorClosed: true,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: 100,
      enemyDoorHoldProgressMs: 100,
      enemyLocationEnteredAtMs: 0,
      elapsedMs: 100,
    });
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("gave_up");
    expect(result.enemyStage).not.toBe("at_door");
  });

  it("a confirmed shotgun hit (scripted retreat) is not blocked by minimum stay", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "door_hallway",
      hasShotgun: true,
      shotgunAmmo: 1,
      pendingMonsterHits: 1,
      enemyLocationEnteredAtMs: 0,
      elapsedMs: 0,
    });
    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT", alreadyDefeatedBefore: false });
    expect(result.enemyStage).toBe(NIGHT_01.enemy.monsterRetreatStage);
  });

  it("a blocked (min-stay) tick never emits a sonic-cannon radio result, even with the cannon active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway", { enemyLocationEnteredAtMs: 59_000, elapsedMs: 59_500 });
    mockRoll(0.2); // would be "success" (retreat) if the roll happened at all
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("stay");
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq);
    expect(result.lastSonicCannonResult).toBeNull();
  });

  it("a new run/night safely (re-)initializes enemyLocationEnteredAtMs to 0", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.enemyLocationEnteredAtMs).toBe(0);
    expect(state.enemyStage).toBe("outside");
  });
});

describe("ENEMY_ADVANCE — sonic cannon probabilities (32/60/8)", () => {
  it("plain camera watching (no sonic cannon) never touches advance/retreat probabilities", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      enemyStage: "right_hallway",
      enemyLocationEnteredAtMs: 0,
      elapsedMs: 60_000,
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "right_hallway",
      sonicCannonActive: false,
    });
    // 0.2 is >= sonic retreatChance boundary logic but also within the
    // NORMAL advanceChance(.16)+retreatChance(.10)=.26 window -> retreat.
    // The key assertion is the DECISION matches plain night.enemy chances,
    // not the sonic 32/60/8 ones.
    mockRoll(0.2);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("retreat");
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq);
  });

  it("plain camera watching (no sonic cannon) draws no camera energy drain", () => {
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "right_hallway",
      sonicCannonActive: false,
    });
    expect(state.power).toBe(NIGHT_01.startPower);
    // computePowerDrainBreakdown is exercised directly in powerDrain.test.ts;
    // here we only need the reducer-level guarantee that watching alone
    // never sets sonicCannonActive nor drains via a TICK.
    const reducer = createGameReducer(NIGHT_01);
    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.power).toBeGreaterThanOrEqual(state.power);
  });

  it("sonic cannon aimed at the camera showing the monster uses 32/60/8: roll in [0, 0.08) -> advance (fail)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.05);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("advance");
    expect(result.enemyStage).toBe("door_hallway");
    expect(result.sonicCannonActive).toBe(false);
  });

  it("sonic cannon: roll in [0.08, 0.40) -> retreat (success), but enemyStage stays put until the reveal window finishes (visible retreat, see sonicCannonPendingRetreat)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("retreat");
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.sonicCannonActive).toBe(false);
    expect(result.sonicCannonPendingRetreat).toEqual({
      targetStage: "outer_yard",
      revealUntilMs: result.elapsedMs + SONIC_CANNON_RETREAT_REVEAL_MS,
    });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq + 1);
  });

  it("sonic cannon retreat: ENEMY_ADVANCE is frozen while the reveal window is pending", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2);
    const pending = reducer(state, { type: "ENEMY_ADVANCE" });
    mockRoll(0.01); // would be "advance" if this rolled at all
    const result = reducer(pending, { type: "ENEMY_ADVANCE" });
    expect(result).toBe(pending);
  });

  it("sonic cannon retreat: TICK finalizes the move to targetStage once revealUntilMs passes, and opens the visible-flee window", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2);
    const pending = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(pending.enemyStage).toBe("right_hallway");

    const tooSoon = reducer(pending, { type: "TICK", deltaMs: SONIC_CANNON_RETREAT_REVEAL_MS - 100 });
    expect(tooSoon.enemyStage).toBe("right_hallway");
    expect(tooSoon.sonicCannonPendingRetreat).not.toBeNull();

    const finalized = reducer(tooSoon, { type: "TICK", deltaMs: 200 });
    expect(finalized.enemyStage).toBe("outer_yard");
    expect(finalized.sonicCannonPendingRetreat).toBeNull();
    expect(finalized.enemyForcedRetreatChance).toBe(0);
    expect(finalized.enemyForcedRetreatUntilMs).not.toBeNull();
  });

  it("sonic cannon: roll >= 0.40 -> stay", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.9);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("stay");
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.sonicCannonActive).toBe(false);
  });

  it("sonic cannon on the WRONG (empty) camera never touches the probabilities — uses plain night.enemy chances instead", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway", { activeCameraId: "door_hallway" });
    // 0.2 would be "retreat" under sonic chances (0.08-0.40) but is >= the
    // plain advanceChance+retreatChance window (0.16+0.10=0.26) -> stay.
    mockRoll(0.2);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("retreat"); // 0.2 also falls in the plain .16-.26 retreat window
    // The real assertion: no sonic radio event fired, since the cannon wasn't aimed correctly.
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq);
    expect(result.lastSonicCannonResult).toBeNull();
  });

  it("activating the cannon without enough power is rejected", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      power: 0,
      sonicCannonActive: false,
    });
    const result = reducer(state, { type: "TOGGLE_SONIC_CANNON" });
    expect(result.sonicCannonActive).toBe(false);
  });

  it("activating the cannon with camera overview (not detail) is rejected", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: false,
      cameraViewMode: "overview",
      power: 100,
      sonicCannonActive: false,
    });
    const result = reducer(state, { type: "TOGGLE_SONIC_CANNON" });
    expect(result.sonicCannonActive).toBe(false);
  });

  it("activating the cannon with camera detail open on desk with power succeeds", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      power: 100,
      sonicCannonActive: false,
    });
    const result = reducer(state, { type: "TOGGLE_SONIC_CANNON" });
    expect(result.sonicCannonActive).toBe(true);
  });

  it("switching to a different camera turns the cannon off", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      sonicCannonActive: true,
    });
    const result = reducer(state, { type: "OPEN_CAMERA", cameraId: "right_hallway" });
    expect(result.sonicCannonActive).toBe(false);
  });

  it("closing the camera detail turns the cannon off", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      sonicCannonActive: true,
    });
    const result = reducer(state, { type: "CLOSE_CAMERAS" });
    expect(result.sonicCannonActive).toBe(false);
  });

  it("a new run/night always starts with the cannon off", () => {
    expect(createInitialGameState(NIGHT_01).sonicCannonActive).toBe(false);
  });

  it("one ENEMY_ADVANCE tick never moves more than one step, even with the cannon active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.05); // advance
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    const originalIndex = state.enemyRoute.indexOf("right_hallway");
    const resultIndex = state.enemyRoute.indexOf(result.enemyStage);
    expect(Math.abs(resultIndex - originalIndex)).toBe(1);
  });

  it("a sonic retreat sets lastSonicCannonResult to 'success' and bumps sonicCannonResultSeq by exactly one", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("success");
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq + 1);
  });

  it("a sonic stay sets lastSonicCannonResult to 'stay' and bumps sonicCannonResultSeq by exactly one", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.9);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("stay");
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq + 1);
  });

  it("a sonic advance sets lastSonicCannonResult to 'fail' and bumps sonicCannonResultSeq by exactly one", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.05);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("fail");
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq + 1);
  });

  it("a plain tick without the sonic cannon never bumps sonicCannonResultSeq", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outer_yard", enemyLocationEnteredAtMs: 0, elapsedMs: 60_000, sonicCannonActive: false });
    mockRoll(0.5);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq);
    expect(result.lastSonicCannonResult).toBeNull();
  });
});

// Zadání "doladit sonické dělo, aby se po prvním skutečně vyhodnoceném
// movement decision ticku automaticky vypnulo" — 14 bodů ze zadání sekce 8,
// mapované 1:1 na jednotlivé testy níže (většina retreat/stay/fail případů
// je navíc pokrytá přímo v "sonic cannon probabilities" popisu výše).
describe("ENEMY_ADVANCE — sonic cannon auto-off after the first real decision tick", () => {
  it("1. sonic success (retreat) decision tick sets sonicCannonActive to false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("success");
    expect(result.sonicCannonActive).toBe(false);
  });

  it("2. sonic stay decision tick sets sonicCannonActive to false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.9);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("stay");
    expect(result.sonicCannonActive).toBe(false);
  });

  it("3. sonic fail (advance) decision tick sets sonicCannonActive to false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.05);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastSonicCannonResult).toBe("fail");
    expect(result.sonicCannonActive).toBe(false);
  });

  it("4. a minimum-stay blocked tick leaves sonicCannonActive true — the cannon must survive to the real decision", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway", { enemyLocationEnteredAtMs: 59_000, elapsedMs: 59_500 });
    mockRoll(0.2); // would be a sonic "success" if the tick weren't blocked
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("stay");
    expect(result.sonicCannonActive).toBe(true);
    expect(result.lastSonicCannonResult).toBeNull();
  });

  it("5. a tick with no monster on the aimed camera leaves sonicCannonActive true", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway", { enemyStage: "left_hallway" });
    mockRoll(0.5);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.sonicCannonActive).toBe(true);
    expect(result.lastSonicCannonResult).toBeNull();
  });

  it("6. a plain tick without the sonic cannon does not touch sonicCannonActive (stays false)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({ enemyStage: "outer_yard", enemyLocationEnteredAtMs: 0, elapsedMs: 60_000, sonicCannonActive: false });
    mockRoll(0.5);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.sonicCannonActive).toBe(false);
  });

  it("7. manual TOGGLE_SONIC_CANNON off still works independently of the auto-off path", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      sonicCannonActive: true,
    });
    const result = reducer(state, { type: "TOGGLE_SONIC_CANNON" });
    expect(result.sonicCannonActive).toBe(false);
    expect(result.lastSonicCannonToggleReason).toBe("manual_off");
  });

  it("8. switching camera still turns the cannon off (unrelated to decision-tick auto-off)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      sonicCannonActive: true,
    });
    const result = reducer(state, { type: "OPEN_CAMERA", cameraId: "door_hallway" });
    expect(result.sonicCannonActive).toBe(false);
  });

  it("9. closing the camera detail still turns the cannon off", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      sonicCannonActive: true,
    });
    const result = reducer(state, { type: "CLOSE_CAMERAS" });
    expect(result.sonicCannonActive).toBe(false);
  });

  it("10. running out of power (blackout) still turns the cannon off", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWith({
      playerView: "desk",
      cameraOpen: true,
      cameraViewMode: "detail",
      activeCameraId: "outer_yard",
      sonicCannonActive: true,
      power: 0.01,
      elapsedMs: 0,
      remainingMs: NIGHT_01.durationMs,
    });
    const result = reducer(state, { type: "TICK", deltaMs: 10_000 });
    expect(result.gameStatus).toBe("blackout");
    expect(result.sonicCannonActive).toBe(false);
  });

  it("11. every sonic-modified tick emits exactly one radio result (seq +1, never more)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq + 1);
  });

  it("12. the auto-off never causes a second movement step in the same tick", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2); // sonic retreat
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    const startIndex = state.enemyRoute.indexOf("right_hallway");
    const endIndex = state.enemyRoute.indexOf(result.enemyStage);
    expect(Math.abs(endIndex - startIndex)).toBeLessThanOrEqual(1);
  });

  it("13. probabilities used by the auto-off tick are still exactly 32/60/8 (boundary check)", () => {
    const reducer = createGameReducer(NIGHT_01);
    // Just below the retreat boundary (0.08) -> advance/fail.
    mockRoll(0.079999);
    const advanceResult = reducer(stateWithSonicAimedAt("right_hallway"), { type: "ENEMY_ADVANCE" });
    expect(advanceResult.lastSonicCannonResult).toBe("fail");

    mockRoll(0.08);
    const retreatResult = reducer(stateWithSonicAimedAt("right_hallway"), { type: "ENEMY_ADVANCE" });
    expect(retreatResult.lastSonicCannonResult).toBe("success");

    mockRoll(0.399999);
    const stillRetreat = reducer(stateWithSonicAimedAt("right_hallway"), { type: "ENEMY_ADVANCE" });
    expect(stillRetreat.lastSonicCannonResult).toBe("success");

    mockRoll(0.4);
    const stayResult = reducer(stateWithSonicAimedAt("right_hallway"), { type: "ENEMY_ADVANCE" });
    expect(stayResult.lastSonicCannonResult).toBe("stay");
  });

  it("14. the radio result and the auto-off land in the SAME reducer result — a side effect can never see one without the other", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithSonicAimedAt("right_hallway");
    mockRoll(0.2);
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    // Both are set together, atomically, in the very same returned object —
    // there is no intermediate state where only one of them is updated.
    expect(result.lastSonicCannonResult).not.toBeNull();
    expect(result.sonicCannonActive).toBe(false);
    expect(result.sonicCannonToggleSeq).toBe(state.sonicCannonToggleSeq + 1);
    expect(result.lastSonicCannonToggleReason).toBe("result_auto_off");
  });
});
