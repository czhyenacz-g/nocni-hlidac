import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_15 } from "../nights/night15";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import {
  TITAN_STAGE_STAY_MS,
  TITAN_AT_DOOR_STAGE_STAY_MS,
  TITAN_DOOR_BREACH_STAGE_STAY_MS,
  GENERATOR_OVERLOAD_DOOR_DURATION_MS,
} from "../balancing/constants";
import { DEFAULT_NIGHT_FEATURES } from "../difficulty/nightConfig";

// Integrace přes skutečný reducer (ne jen izolovaný resolveTitanAdvance) —
// pokrývá ENEMY_ADVANCE dispatch, TICK-driven light/UV repel guardy, a debug
// akce, přesně tak, jak je hra doopravdy dispatchne.

function titanRunningState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_15, { nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: true } }),
    isRunning: true,
    ...overrides,
  };
}

describe("Titan night (NIGHT_15) — resolveNightDefinition wiring", () => {
  it("NIGHT_15's enemy is the registered Titan (id 'titan')", () => {
    expect(NIGHT_15.enemy.id).toBe("titan");
  });

  it("createInitialGameState(NIGHT_15) starts Titan on the first route stage with a single fixed route", () => {
    const state = createInitialGameState(NIGHT_15);
    expect(state.enemyStage).toBe("outside");
    expect(state.enemyRoute).toEqual(["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "breach", "attack"]);
  });
});

describe("ENEMY_ADVANCE dispatch for Titan — 20s-per-stage march", () => {
  it("does not move before TITAN_STAGE_STAY_MS elapses", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ elapsedMs: TITAN_STAGE_STAY_MS - 1 });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("outside");
  });

  it("advances exactly one stage once TITAN_STAGE_STAY_MS elapses", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ elapsedMs: TITAN_STAGE_STAY_MS });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("outer_yard");
  });

  it("reaching 'attack' finalizes player death (screen/isRunning/deathReason)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "breach", elapsedMs: TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: 0 });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("attack");
    expect(result.screen).toBe("death");
    expect(result.isRunning).toBe(false);
  });
});

describe("Titan ignores all defensive/retreat mechanics", () => {
  it("light repel at the door never moves Titan or resets its timer (TICK)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "at_door",
      doorClosed: true,
      lightOn: true,
      elapsedMs: 5000,
      enemyLocationEnteredAtMs: 0,
      doorLightRepelMs: 10_000, // would be far past doorLightRepelRequiredMs for Imp
    });
    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.enemyStage).toBe("at_door");
    expect(result.enemyLocationEnteredAtMs).toBe(0);
  });

  it("UV repel in the hallway never moves Titan or resets its timer (TICK)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "door_hallway",
      doorClosed: true,
      elapsedMs: 5000,
      enemyLocationEnteredAtMs: 0,
      doorHallwayUvRepelMs: 20_000,
      roomBulbs: { ...createInitialGameState(NIGHT_15).roomBulbs, nearRoom: { ...createInitialGameState(NIGHT_15).roomBulbs.nearRoom, broken: false } },
      lightOn: true,
    });
    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.enemyStage).toBe("door_hallway");
    expect(result.enemyLocationEnteredAtMs).toBe(0);
  });

  it("sonic cannon has no effect — Titan's resolver never rolls/consults it, stage only changes via the 20s timer", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "outer_yard",
      elapsedMs: 100,
      enemyLocationEnteredAtMs: 0,
      sonicCannonActive: true,
      activeCameraId: "outer_yard",
      cameraOpen: true,
    });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("outer_yard");
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq);
  });

  it("forced-retreat fields are never set for Titan — they simply stay null/default", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ elapsedMs: TITAN_STAGE_STAY_MS });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyForcedRetreatUntilMs).toBeNull();
  });

  it("door waiting/gave_up standoff never applies — Titan passes through 'at_door' on its own timer regardless of door state", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "at_door",
      doorClosed: true,
      elapsedMs: TITAN_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
    });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("breach");
    expect(result.lastEnemyDecision).not.toBe("gave_up");
  });
});

describe("Generator overload remains the sole way to kill Titan", () => {
  it("overload completing while Titan is at the door moves it to graveyard (existing behavior, unchanged)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const started = reducer(titanRunningState({ elapsedMs: 0, enemyStage: "at_door", playerView: "generator" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("graveyard");
    expect(finished.doorDestroyed).toBe(true);
  });

  it("overload completing while Titan is NOT at the door does not kill it", () => {
    const reducer = createGameReducer(NIGHT_15);
    const started = reducer(titanRunningState({ elapsedMs: 0, enemyStage: "left_hallway", playerView: "generator" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("left_hallway");
    expect(finished.doorDestroyed).toBe(true);
  });

  it("Titan in graveyard never advances again via ENEMY_ADVANCE", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "graveyard", elapsedMs: 999_999, enemyLocationEnteredAtMs: 0 });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result).toBe(state);
  });
});

// Regresní testy pro opravu race condition (viz zadání "kritický race
// condition v závěru Titan encounteru" a resolveTitanAdvance.ts guard výše)
// — dřív mohl Titanův vlastní 20s/1s postupový časovač (ENEMY_ADVANCE)
// posunout Titana do "attack"/smrti DŘÍV, než platně spuštěné desetisekundové
// přetížení (GENERATOR_OVERLOAD_DOOR_DURATION_MS) doběhlo, protože
// at_door+breach dohromady trvaly jen ~2s. Fake timers nejsou potřeba — celá
// hra je řízená čistě dispatchovanými akcemi s explicitním elapsedMs/deltaMs,
// takže "posunutí času za původní breach timeout" simulujeme přímo
// opakovaným ENEMY_ADVANCE dispatchem s elapsedMs daleko za
// TITAN_DOOR_BREACH_STAGE_STAY_MS, přesně jak by to udělal skutečný interval.
describe("Race condition fix — overload success must win over Titan's own advance timer", () => {
  it("scenario: overload started BEFORE Titan reaches the door — Titan still marches normally until at_door, then freezes and dies to the overload, never to ENEMY_ADVANCE", () => {
    const reducer = createGameReducer(NIGHT_15);
    let state = titanRunningState({ elapsedMs: 0, enemyStage: "left_hallway", enemyLocationEnteredAtMs: 0, playerView: "generator" });
    state = reducer(state, { type: "START_GENERATOR_OVERLOAD" });
    expect(state.doorGeneratorOverloadUntilMs).not.toBeNull();

    // Titan continues marching through its own stages normally while the overload counts down.
    state = { ...state, elapsedMs: TITAN_STAGE_STAY_MS };
    state = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(state.enemyStage).toBe("door_hallway");

    state = { ...state, elapsedMs: state.elapsedMs + TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: state.elapsedMs };
    state = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(state.enemyStage).toBe("at_door");

    // Now frozen at the door — even far past the door-breach stay time, repeated ENEMY_ADVANCE never reaches "attack".
    state = { ...state, elapsedMs: state.elapsedMs + TITAN_DOOR_BREACH_STAGE_STAY_MS * 10 };
    for (let i = 0; i < 5; i++) {
      state = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    }
    expect(state.enemyStage).toBe("at_door");
    expect(state.screen).not.toBe("death");

    // The overload resolves normally — Titan dies via the door, not via ENEMY_ADVANCE.
    state = reducer(state, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(state.enemyStage).toBe("graveyard");
    expect(state.doorDestroyed).toBe(true);
    expect(state.screen).not.toBe("death");
  });

  it("scenario: overload started while Titan is already at the door — freezes immediately, a stale ENEMY_ADVANCE dispatched well past the original breach timeout does nothing, then overload completion kills Titan", () => {
    const reducer = createGameReducer(NIGHT_15);
    let state = titanRunningState({ elapsedMs: 0, enemyStage: "at_door", enemyLocationEnteredAtMs: 0, playerView: "generator" });
    state = reducer(state, { type: "START_GENERATOR_OVERLOAD" });

    // Move time well past where the OLD (buggy) 1s-per-stage breach timer would have already killed the player.
    state = { ...state, elapsedMs: TITAN_DOOR_BREACH_STAGE_STAY_MS * 5 };
    state = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(state.enemyStage).toBe("at_door");
    expect(state.lastEnemyDecision).toBe("stay");
    expect(state.screen).not.toBe("death");

    state = reducer(state, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(state.enemyStage).toBe("graveyard");
    expect(state.screen).not.toBe("death");

    // A further stale ENEMY_ADVANCE after death/graveyard is a true no-op (same reference).
    const again = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(again).toBe(state);
  });

  it("scenario: overload attempted too late, after Titan's death is already confirmed — must NOT revive/save the player", () => {
    const reducer = createGameReducer(NIGHT_15);
    let state = titanRunningState({ elapsedMs: 0, enemyStage: "breach", enemyLocationEnteredAtMs: 0, playerView: "generator" });
    state = { ...state, elapsedMs: TITAN_DOOR_BREACH_STAGE_STAY_MS };
    state = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(state.enemyStage).toBe("attack");
    expect(state.screen).toBe("death");
    expect(state.isRunning).toBe(false);

    // START_GENERATOR_OVERLOAD is a no-op once the player is dead (isRunning guard) — cannot save the player retroactively.
    const afterOverloadAttempt = reducer(state, { type: "START_GENERATOR_OVERLOAD" });
    expect(afterOverloadAttempt).toBe(state);
    expect(afterOverloadAttempt.doorGeneratorOverloadUntilMs).toBeNull();
    expect(afterOverloadAttempt.enemyStage).toBe("attack");
    expect(afterOverloadAttempt.screen).toBe("death");
  });

  it("never simultaneously reports a kill-sequence outcome and a death outcome — enemyStage is exactly one of graveyard/attack, never both signaled", () => {
    const reducer = createGameReducer(NIGHT_15);
    let state = titanRunningState({ elapsedMs: 0, enemyStage: "at_door", enemyLocationEnteredAtMs: 0, playerView: "generator" });
    state = reducer(state, { type: "START_GENERATOR_OVERLOAD" });
    state = reducer(state, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(state.enemyStage).toBe("graveyard");
    expect(state.screen).not.toBe("death");
    expect(state.isRunning).toBe(true);
  });

  it("night restart leaves no pending overload/freeze carried over from a previous Titan encounter", () => {
    const reducer = createGameReducer(NIGHT_15);
    let state = titanRunningState({ elapsedMs: 0, enemyStage: "at_door", enemyLocationEnteredAtMs: 0, playerView: "generator" });
    state = reducer(state, { type: "START_GENERATOR_OVERLOAD" });
    expect(state.doorGeneratorOverloadUntilMs).not.toBeNull();

    const fresh = createInitialGameState(NIGHT_15);
    expect(fresh.doorGeneratorOverloadUntilMs).toBeNull();
    expect(fresh.enemyStage).toBe("outside");
  });
});

describe("DEBUG_START_TITAN / DEBUG_ADVANCE_TITAN_STAGE", () => {
  it("DEBUG_START_TITAN sets Titan to the first route stage with a fresh route, when the active night is Titan's", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "breach", elapsedMs: 40_000 });
    const result = reducer(state, { type: "DEBUG_START_TITAN" });
    expect(result.enemyStage).toBe("outside");
    expect(result.enemyRoute).toEqual(NIGHT_15.enemy.routeVariants[0]);
  });

  it("DEBUG_START_TITAN is a no-op when the active night is NOT Titan's", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };
    const result = reducer(state, { type: "DEBUG_START_TITAN" });
    expect(result).toBe(state);
  });

  it("DEBUG_ADVANCE_TITAN_STAGE moves Titan exactly one stage forward along the real route", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "outside" });
    const result = reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" });
    expect(result.enemyStage).toBe("outer_yard");
  });

  it("DEBUG_ADVANCE_TITAN_STAGE never skips straight to graveyard", () => {
    const reducer = createGameReducer(NIGHT_15);
    let state = titanRunningState({ enemyStage: "outside" });
    for (let i = 0; i < 10; i++) {
      state = reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" });
      expect(state.enemyStage).not.toBe("graveyard");
    }
  });

  it("DEBUG_ADVANCE_TITAN_STAGE is a no-op once Titan is in 'attack' or 'graveyard'", () => {
    const reducer = createGameReducer(NIGHT_15);
    const attackState = titanRunningState({ enemyStage: "attack" });
    expect(reducer(attackState, { type: "DEBUG_ADVANCE_TITAN_STAGE" })).toBe(attackState);
    const graveyardState = titanRunningState({ enemyStage: "graveyard" });
    expect(reducer(graveyardState, { type: "DEBUG_ADVANCE_TITAN_STAGE" })).toBe(graveyardState);
  });

  it("DEBUG_ADVANCE_TITAN_STAGE is a no-op when the active night is NOT Titan's", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };
    const result = reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" });
    expect(result).toBe(state);
  });

  it("both debug actions are no-ops when the run isn't active (isRunning false)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ isRunning: false });
    expect(reducer(state, { type: "DEBUG_START_TITAN" })).toBe(state);
    expect(reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" })).toBe(state);
  });
});

// Titan blocks the emergency-run minigame entirely (viz zadání "Pokus odejít
// do minihry během Titanova útoku").
describe("START_EMERGENCY_RUN_WINDUP — Titan active blocks the minigame and kills the player instead", () => {
  it("dispatching START_EMERGENCY_RUN_WINDUP while Titan is active ends the game immediately, without ever starting a windup", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "left_hallway",
      playerView: "left_wall",
      doorClosed: false,
      screen: "playing",
      nightFeatures: { ...DEFAULT_NIGHT_FEATURES, emergencyRunsEnabled: true, batteryRunEnabled: true },
    });
    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.isRunning).toBe(false);
    expect(result.screen).toBe("death");
    expect(result.deathReason).toBe("titan_ambush_emergency_run");
    expect(result.emergencyRunWindup.active).toBe(false);
  });

  it("fires even from a playerView/door state where the windup would normally be blocked anyway (guard runs BEFORE canStartEmergencyRunWindup)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "door_hallway",
      playerView: "desk",
      screen: "playing",
      nightFeatures: { ...DEFAULT_NIGHT_FEATURES, emergencyRunsEnabled: true, batteryRunEnabled: true },
    });
    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.screen).toBe("death");
    expect(result.deathReason).toBe("titan_ambush_emergency_run");
  });

  it("does NOT trigger once Titan is already graveyarded (encounter over)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "graveyard",
      playerView: "left_wall",
      doorClosed: false,
      screen: "playing",
      nightFeatures: { ...DEFAULT_NIGHT_FEATURES, emergencyRunsEnabled: true, batteryRunEnabled: true },
    });
    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.screen).toBe("playing");
    expect(result.deathReason).toBe(state.deathReason);
  });

  it("regression: on a normal Imp night, START_EMERGENCY_RUN_WINDUP behaves exactly as before (no Titan guard interference)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, { nightFeatures: { ...DEFAULT_NIGHT_FEATURES, emergencyRunsEnabled: true, batteryRunEnabled: true } }),
      isRunning: true,
      screen: "playing" as const,
      playerView: "left_wall" as const,
      doorClosed: false,
    };
    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup.active).toBe(true);
    expect(result.screen).toBe("playing");
  });
});

// Regrese "po Titanově Game Overu se ještě spustí obecný Ghoul Game Over"
// (viz zadání) — ověřuje, že jednou finalizovaná Titanova smrt je opravdu
// KONEČNÝ stav: žádný další ENEMY_ADVANCE/TICK ji nepřepíše, ani kdyby
// dorazil "opožděně" (starý naplánovaný tik jiného nepřítele apod.).
describe("Titan death is final — no second death/game-over event can overwrite it", () => {
  function titanDeathState(): GameState {
    const reducer = createGameReducer(NIGHT_15);
    const started = titanRunningState({ enemyStage: "breach", elapsedMs: TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: 0 });
    return reducer(started, { type: "ENEMY_ADVANCE", currentNight: 15 });
  }

  it("Titan's attack sets a Titan-specific death reason, never the shared Imp door_open_at_attack", () => {
    const dead = titanDeathState();
    expect(dead.deathReason).toBe("titan_door_breach");
    expect(dead.screen).toBe("death");
    expect(dead.isRunning).toBe(false);
  });

  it("a further ENEMY_ADVANCE dispatch after death changes nothing (no-op, same reference)", () => {
    const dead = titanDeathState();
    const reducer = createGameReducer(NIGHT_15);
    const again = reducer(dead, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(again).toBe(dead);
    expect(again.deathReason).toBe("titan_door_breach");
    expect(again.screen).toBe("death");
  });

  it("a stray/late TICK after death changes nothing relevant to the death state", () => {
    const dead = titanDeathState();
    const reducer = createGameReducer(NIGHT_15);
    const tickedLater = reducer(dead, { type: "TICK", deltaMs: 5000 });
    expect(tickedLater.deathReason).toBe("titan_door_breach");
    expect(tickedLater.screen).toBe("death");
    expect(tickedLater.enemyStage).toBe("attack");
    expect(tickedLater.isRunning).toBe(false);
  });

  it("many repeated ENEMY_ADVANCE/TICK dispatches after death never flip deathReason back to an Imp/generic reason", () => {
    let state = titanDeathState();
    const reducer = createGameReducer(NIGHT_15);
    for (let i = 0; i < 10; i++) {
      state = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
      state = reducer(state, { type: "TICK", deltaMs: 1000 });
    }
    expect(state.deathReason).toBe("titan_door_breach");
    expect(state.deathReason).not.toBe("door_open_at_attack");
    expect(state.screen).toBe("death");
  });
});

// Automatické přepnutí na dveře při finálním útoku Titana (viz zadání).
describe("Titan breach — automatic one-shot switch to DoorView, then view-lock", () => {
  it("does not switch the view at the start of the encounter", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "outside", playerView: "desk" });
    const result = reducer(state, { type: "TICK", deltaMs: 10 });
    expect(result.playerView).toBe("desk");
  });

  it("does not switch the view while Titan is still approaching (outer_yard/left_hallway/door_hallway)", () => {
    const reducer = createGameReducer(NIGHT_15);
    for (const stage of ["outer_yard", "left_hallway", "door_hallway"] as const) {
      const started = titanRunningState({ enemyStage: stage, elapsedMs: TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: 0, playerView: "generator" });
      const result = reducer(started, { type: "ENEMY_ADVANCE", currentNight: 15 });
      expect(result.playerView).toBe("generator");
    }
  });

  it("reaching 'at_door' alone does not switch the view — the player still has a real chance to react", () => {
    const reducer = createGameReducer(NIGHT_15);
    const started = titanRunningState({
      enemyStage: "door_hallway",
      elapsedMs: TITAN_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
      playerView: "generator",
    });
    const result = reducer(started, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("at_door");
    expect(result.playerView).toBe("generator");
  });

  it("transitioning INTO 'breach' switches the view to 'door' exactly once", () => {
    const reducer = createGameReducer(NIGHT_15);
    const started = titanRunningState({
      enemyStage: "at_door",
      elapsedMs: TITAN_AT_DOOR_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
      playerView: "generator",
    });
    const result = reducer(started, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("breach");
    expect(result.playerView).toBe("door");
  });

  it("if the player is already looking at the door, the value stays 'door' (no flicker — same value written)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const started = titanRunningState({
      enemyStage: "at_door",
      elapsedMs: TITAN_AT_DOOR_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
      playerView: "door",
    });
    const result = reducer(started, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.playerView).toBe("door");
  });

  it("LOOK_AT_DESK/LOOK_AT_GENERATOR/LOOK_AT_LEFT_WALL/LOOK_AT_MAP are all no-ops once Titan is in 'breach'", () => {
    const reducer = createGameReducer(NIGHT_15);
    const breachState = titanRunningState({ enemyStage: "breach", playerView: "door" });
    for (const action of ["LOOK_AT_DESK", "LOOK_AT_GENERATOR", "LOOK_AT_LEFT_WALL", "LOOK_AT_MAP"] as const) {
      const result = reducer(breachState, { type: action });
      expect(result).toBe(breachState);
      expect(result.playerView).toBe("door");
    }
  });

  it("LOOK_AT_DOOR itself is NOT locked during breach (moving TO the door is always fine)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const breachState = titanRunningState({ enemyStage: "breach", playerView: "generator" });
    const result = reducer(breachState, { type: "LOOK_AT_DOOR" });
    expect(result.playerView).toBe("door");
  });

  it("the view-lock releases once Titan leaves 'breach' (e.g. killed by overload, back in graveyard)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const graveyardState = titanRunningState({ enemyStage: "graveyard", playerView: "door" });
    const result = reducer(graveyardState, { type: "LOOK_AT_DESK" });
    expect(result.playerView).toBe("desk");
  });

  it("regression: on a normal Imp night, reaching a stage literally named 'breach' cannot happen (route never includes it), and LOOK_AT_* is unaffected", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = { ...createInitialGameState(NIGHT_01), isRunning: true, screen: "playing", playerView: "generator" };
    const result = reducer(state, { type: "LOOK_AT_DESK" });
    expect(result.playerView).toBe("desk");
  });
});
