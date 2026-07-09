import { describe, expect, it } from "vitest";
import { canReplaceBulb, createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { resolveOfficeBreachPhase } from "./officeBreachAftermath";

// APPLY_MONSTER_REACHED_OFFICE_AFTERMATH (viz zadání, navazuje na commit
// 93d492c "monster physically runs to the office") — monstrum FYZICKY
// doběhlo do kanceláře v EmergencyMiniGame, hráč se pak bezpečně vrátil.
// Musí spustit reálnou krizi (rozbitá žárovka, porouchaný generátor,
// monstrum u dveří s delší reakční dobou), NIKDY nezpůsobit instant kill.

const FULL_ROUTE = ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"] as const;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    enemyRoute: [...FULL_ROUTE],
    enemyStage: "outside",
    ...overrides,
  };
}

describe("APPLY_MONSTER_REACHED_OFFICE_AFTERMATH — does not instant-kill the player", () => {
  it("moves the monster to at_door but leaves the shift running, no death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState();

    const result = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(result.enemyStage).toBe("at_door");
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
    expect(result.deathReason).toBeNull();
    expect(result.lastEnemyDecision).toBe("monster_reached_office_aftermath");
  });

  it("a same-tick ENEMY_ADVANCE with an open door does not kill the player either (grace active)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: false, playerView: "door" }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });

    const result = reducer(afterAftermath, { type: "ENEMY_ADVANCE" });
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
    expect(result.deathReason).toBeNull();
    expect(result.lastEnemyDecision).toBe("office_threat_grace");
  });
});

describe("APPLY_MONSTER_REACHED_OFFICE_AFTERMATH — starts the crisis state", () => {
  it("sets officeBreachAftermathActive, which resolveOfficeBreachPhase reports as 'close_door' (open door)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ doorClosed: false });

    const result = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(result.officeBreachAftermathActive).toBe(true);
    expect(resolveOfficeBreachPhase(result)).toBe("close_door");
  });

  it("breaks the door/near-room bulb through the existing roomBulbs system (broken flag + bulbBreakSeq)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState();
    expect(state.roomBulbs.nearRoom.broken).toBe(false);

    const result = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(result.roomBulbs.nearRoom.broken).toBe(true);
    expect(result.roomBulbs.nearRoom.remainingMs).toBe(0);
    expect(result.bulbBreakSeq).toBe(state.bulbBreakSeq + 1);
  });

  it("does not double-fire bulbBreakSeq if the bulb was already broken beforehand", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 10_000, broken: true } } });

    const result = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(result.bulbBreakSeq).toBe(state.bulbBreakSeq);
  });

  it("triggers a real generator failure through the existing generatorState system (criticalBeeping)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState();
    expect(state.generatorState).toBe("normal");

    const result = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(result.generatorState).toBe("criticalBeeping");
    expect(resolveOfficeBreachPhase({ ...result, doorClosed: true })).toBe("restart_generator");
  });

  it("sets a reaction window longer than the regular officeThreatOnReturn grace (OFFICE_BREACH_REACTION_WINDOW_MS)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ elapsedMs: 10_000 });

    const viaAftermath = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    const viaThreatOnReturn = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(viaAftermath.enemyDoorAttackGraceUntilMs!).toBeGreaterThan(viaThreatOnReturn.enemyDoorAttackGraceUntilMs!);
  });

  it("places the monster at_door/breach/door_hallway — the same 'before the office' stage vocabulary as officeThreatOnReturn", () => {
    const reducer = createGameReducer(NIGHT_01);
    const result = reducer(baseState({ enemyRoute: ["outside", "outer_yard", "door_hallway", "attack"] }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });
    expect(["at_door", "breach", "door_hallway"]).toContain(result.enemyStage);
  });
});

describe("APPLY_MONSTER_REACHED_OFFICE_AFTERMATH — safety guards", () => {
  it("is a no-op if the game is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ isRunning: false });
    expect(reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" })).toBe(state);
  });

  it("is a no-op during blackout", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ gameStatus: "blackout" });
    expect(reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" })).toBe(state);
  });

  it("is a no-op during a pending door-death reveal", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ doorDeathRevealUntilMs: 9999 });
    expect(reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" })).toBe(state);
  });

  it("is a safe no-op if the route has no at_door/breach/door_hallway candidate", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ enemyRoute: ["outside", "outer_yard", "right_hallway"] });
    const result = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(result).toBe(state);
  });
});

describe("Reaction window: closing the door in time prevents the attack", () => {
  it("open door + at_door + grace active: ENEMY_ADVANCE does not kill", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: false }), { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });

    const result = reducer(afterAftermath, { type: "ENEMY_ADVANCE" });
    expect(result.deathReason).toBeNull();
    expect(result.lastEnemyDecision).toBe("office_threat_grace");
  });

  it("closing the door during the window blocks the attack (door bang), no death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: false }), { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    const doorClosedDuringWindow = { ...afterAftermath, doorClosed: true };

    const result = reducer(doorClosedDuringWindow, { type: "ENEMY_ADVANCE" });
    expect(result.deathReason).toBeNull();
    expect(result.screen).toBe("playing");
    expect(result.doorBangSeq).toBe(doorClosedDuringWindow.doorBangSeq + 1);
  });

  it("after the reaction window elapses, an open door + at_door ENEMY_ADVANCE causes normal death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: false, elapsedMs: 0, playerView: "door" }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });
    const afterWindowElapsed = { ...afterAftermath, elapsedMs: afterAftermath.enemyDoorAttackGraceUntilMs! + 1 };

    const result = reducer(afterWindowElapsed, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("attack");
    expect(result.deathReason).toBe("door_open_at_attack");
  });
});

describe("Crisis persists through door-closing, clears only once fully resolved (TICK)", () => {
  it("closing the door alone keeps officeBreachAftermathActive true — generator/bulb still broken", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: true }), { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(afterAftermath.officeBreachAftermathActive).toBe(true);

    const afterTick = reducer(afterAftermath, { type: "TICK", deltaMs: 16 });
    expect(afterTick.officeBreachAftermathActive).toBe(true);
    expect(afterTick.generatorState).not.toBe("normal");
    expect(afterTick.roomBulbs.nearRoom.broken).toBe(true);
    expect(resolveOfficeBreachPhase(afterTick)).toBe("restart_generator");
  });

  it("restarting the generator (door already closed) still keeps the crisis active — bulb still broken", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: true }), { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    const afterRestart = reducer(afterAftermath, { type: "RESTART_GENERATOR" });
    expect(afterRestart.generatorState).toBe("normal");

    const afterTick = reducer(afterRestart, { type: "TICK", deltaMs: 16 });
    expect(afterTick.officeBreachAftermathActive).toBe(true);
    expect(afterTick.roomBulbs.nearRoom.broken).toBe(true);
    expect(resolveOfficeBreachPhase(afterTick)).toBe("replace_bulb");
  });

  it("once door closed + generator normal + bulb replaced, TICK clears officeBreachAftermathActive", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: true }), { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    const afterRestart = reducer(afterAftermath, { type: "RESTART_GENERATOR" });
    const bulbFixed: GameState = {
      ...afterRestart,
      roomBulbs: { nearRoom: { ...afterRestart.roomBulbs.nearRoom, broken: false, remainingMs: afterRestart.roomBulbs.nearRoom.maxMs } },
    };

    const afterTick = reducer(bulbFixed, { type: "TICK", deltaMs: 16 });
    expect(afterTick.officeBreachAftermathActive).toBe(false);
    expect(resolveOfficeBreachPhase(afterTick)).toBeNull();
  });

  it("a LATER, unrelated ordinary bulb break does not resurrect the crisis banner once resolved", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: true }), { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    const afterRestart = reducer(afterAftermath, { type: "RESTART_GENERATOR" });
    const bulbFixed: GameState = {
      ...afterRestart,
      roomBulbs: { nearRoom: { ...afterRestart.roomBulbs.nearRoom, broken: false, remainingMs: afterRestart.roomBulbs.nearRoom.maxMs } },
    };
    const resolved = reducer(bulbFixed, { type: "TICK", deltaMs: 16 });
    expect(resolved.officeBreachAftermathActive).toBe(false);

    // Ordinary, unrelated bulb break later in the shift (natural wear-out).
    const laterOrdinaryBreak: GameState = { ...resolved, roomBulbs: { nearRoom: { ...resolved.roomBulbs.nearRoom, broken: true } } };
    expect(resolveOfficeBreachPhase(laterOrdinaryBreak)).toBeNull();
  });
});

describe("Bulb replacement stays gated by the existing canReplaceBulb rules during the crisis", () => {
  it("cannot replace the bulb while the door is still closed (must reopen it first, existing rule)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: true, playerView: "door" }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });
    expect(canReplaceBulb(afterAftermath)).toBe(false);
  });

  it("cannot replace the bulb without any bulbsRemaining in stock, even mid-crisis", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: false, playerView: "door", bulbsRemaining: 0 }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });
    expect(canReplaceBulb(afterAftermath)).toBe(false);
  });

  it("can replace the bulb once the door is safely reopened and stock is available", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ doorClosed: false, playerView: "door", bulbsRemaining: 1 }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });
    expect(canReplaceBulb(afterAftermath)).toBe(true);
  });
});

describe("officeBreachAftermathActive defaults to false for a fresh/restarted shift", () => {
  it("createInitialGameState starts with officeBreachAftermathActive false", () => {
    expect(createInitialGameState(NIGHT_01).officeBreachAftermathActive).toBe(false);
  });

  it("START_SHIFT resets a stale officeBreachAftermathActive back to false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ officeBreachAftermathActive: true });

    const result = reducer(state, {
      type: "START_SHIFT",
      roomBulbs: state.roomBulbs,
      bulbsRemaining: state.bulbsRemaining,
      nightFeatures: state.nightFeatures,
    });
    expect(result.officeBreachAftermathActive).toBe(false);
  });
});

// Krizový návrat musí posadit hráče rovnou před dveře (viz zadání, novější
// úprava po ručním testování) — app/play/page.tsx#handleEmergencyMiniGameComplete
// dispatchne LOOK_AT_DOOR hned po APPLY_MONSTER_REACHED_OFFICE_AFTERMATH.
// Tenhle blok testuje tu samou sekvenci na úrovni reduceru — LOOK_AT_DOOR
// musí po aftermath akci projít (žádný guard ho neblokuje) a TOGGLE_DOOR
// musí na door view fungovat okamžitě, i uprostřed krize.
describe("Crisis return lands the player at the door (LOOK_AT_DOOR after the aftermath action)", () => {
  it("LOOK_AT_DOOR right after APPLY_MONSTER_REACHED_OFFICE_AFTERMATH sets playerView to 'door'", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ playerView: "left_wall", doorClosed: false }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });
    const afterLookAtDoor = reducer(afterAftermath, { type: "LOOK_AT_DOOR" });
    expect(afterLookAtDoor.playerView).toBe("door");
  });

  it("closing the door (TOGGLE_DOOR) works immediately once on the door view during the crisis", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterAftermath = reducer(baseState({ playerView: "left_wall", doorClosed: false }), {
      type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH",
    });
    const afterLookAtDoor = reducer(afterAftermath, { type: "LOOK_AT_DOOR" });
    expect(afterLookAtDoor.doorClosed).toBe(false);

    const afterToggle = reducer(afterLookAtDoor, { type: "TOGGLE_DOOR" });
    expect(afterToggle.doorClosed).toBe(true);
    expect(resolveOfficeBreachPhase(afterToggle)).toBe("restart_generator");
  });

  it("a regular return (no monster_reached_office) does not force playerView — LOOK_AT_DOOR is simply not dispatched", () => {
    // This is the guard app/play/page.tsx already relies on
    // (resolveOfficeThreatTriggeredFromWorldEffects false -> no dispatch at
    // all) — documented here as the reducer-level building block: without a
    // LOOK_AT_DOOR dispatch, playerView is untouched by APPLY_SHOTGUN_EFFECTS/
    // RECHARGE_POWER/ADD_BULBS_REMAINING (the other "returned" outcome
    // dispatches), so a normal return never redirects the view.
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ playerView: "left_wall" });
    const result = reducer(state, { type: "RECHARGE_POWER", amount: 10 });
    expect(result.playerView).toBe("left_wall");
  });
});
