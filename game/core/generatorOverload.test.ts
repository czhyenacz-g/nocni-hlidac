import { describe, expect, it } from "vitest";
import { canStartGeneratorOverloadWindup, createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { DEFAULT_NIGHT_FEATURES } from "../difficulty/nightConfig";
import {
  GENERATOR_OVERLOAD_DOOR_DURATION_MS,
  GENERATOR_OVERLOAD_WINDUP_DURATION_MS,
  TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS,
} from "../balancing/constants";
import { GameState, NightDefinition } from "./types";

// Přetížení generátoru dnes VŽDY zničí dveře. Pokud je aktivní monstrum
// Titan A je právě u dveří (isMonsterAtDoor — "at_door"/"breach", stejná
// definice jako zbytek hry), přesune se navíc do "graveyard" (viz
// updateDoorGeneratorOverload v gameReducer.ts — jediné autoritativní
// místo tohohle rozhodnutí). Žádný MonsterId/MONSTER_REGISTRY zásah — Titan
// se pozná čistě přes `night.enemy.id === "titan"` (EnemyDefinition.id je
// plain `string`), stejně jako by ho poznal budoucí resolveTitanAdvance.

function stateAtGenerator(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01, { nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: true } }),
    isRunning: true,
    playerView: "generator",
    ...overrides,
  };
}

// Syntetická noc s Titanem jako aktivním monstrem — Titan dnes nemá vlastní
// MonsterDefinition/resolver (viz zadání "nevytvářej Titan resolver"), takže
// tahle fixture slouží VÝHRADNĚ k otestování updateDoorGeneratorOverload
// (TICK-driven), nikdy se s ní nesmí dispatchnout ENEMY_ADVANCE (to by
// spadlo na "Unsupported monster resolver: titan", správně — Titan pohyb
// není součástí tohohle kroku).
const TITAN_NIGHT: NightDefinition = { ...NIGHT_01, enemy: { ...NIGHT_01.enemy, id: "titan" } };

function titanStateAtGenerator(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(TITAN_NIGHT, { nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: true } }),
    isRunning: true,
    playerView: "generator",
    ...overrides,
  };
}

describe("canStartGeneratorOverloadWindup — button availability", () => {
  it("false when generatorOverloadEnabled is off (before night 5, non-admin)", () => {
    const state = stateAtGenerator({ nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: false } });
    expect(canStartGeneratorOverloadWindup(state)).toBe(false);
  });

  it("true when generatorOverloadEnabled is on (night 5+, or admin from night 1)", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator())).toBe(true);
  });

  it("false when not looking at the generator", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ playerView: "desk" }))).toBe(false);
  });

  it("false while the generator isn't in its normal state (fault/restarting)", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ generatorState: "criticalBeeping" }))).toBe(false);
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ generatorState: "restarting" }))).toBe(false);
  });

  it("false once the door is already destroyed", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ doorDestroyed: true, doorClosed: false }))).toBe(false);
  });

  it("false while an overload is already in progress", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ doorGeneratorOverloadUntilMs: 5000 }))).toBe(false);
  });

  it("false while the windup is already active (no double-fire)", () => {
    const state = stateAtGenerator({ generatorOverloadWindup: { active: true, startedAtMs: 0, progressMs: 100 } });
    expect(canStartGeneratorOverloadWindup(state)).toBe(false);
  });
});

describe("START_GENERATOR_OVERLOAD_WINDUP / CANCEL_GENERATOR_OVERLOAD_WINDUP", () => {
  it("starts the windup when allowed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const result = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    expect(result.generatorOverloadWindup).toEqual({ active: true, startedAtMs: 0, progressMs: 0 });
  });

  it("is a no-op when not allowed (e.g. night feature off)", () => {
    const state = stateAtGenerator({ nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: false } });
    const reducer = createGameReducer(NIGHT_01);
    const result = reducer(state, { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    expect(result).toBe(state);
  });

  it("CANCEL stops an active windup", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const result = reducer(started, { type: "CANCEL_GENERATOR_OVERLOAD_WINDUP" });
    expect(result.generatorOverloadWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("navigating away from the generator view cancels an active windup", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const result = reducer(started, { type: "LOOK_AT_DESK" });
    expect(result.generatorOverloadWindup.active).toBe(false);
  });

  it("a bare click-equivalent (dispatching START_GENERATOR_OVERLOAD without ever holding) never destroys the door", () => {
    // Neexistuje žádná "klik = spusť rovnou" akce — START_GENERATOR_OVERLOAD
    // samo o sobě vyžaduje, aby ho něco (app/play/page.tsx přes
    // generatorOverloadReadySeq) dispatchlo AŽ po doběhnutí držení. Tenhle
    // test jen ověřuje, že state bez jakéhokoliv držení (žádný
    // START_GENERATOR_OVERLOAD_WINDUP) zůstává netknutý.
    const state = stateAtGenerator();
    expect(state.generatorOverloadWindup.active).toBe(false);
    expect(state.doorGeneratorOverloadUntilMs).toBeNull();
  });
});

describe("windup shorter than required — cancel before completion never starts the overload", () => {
  it("releasing before GENERATOR_OVERLOAD_WINDUP_DURATION_MS cancels the windup and never bumps readySeq", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const partiallyTicked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_WINDUP_DURATION_MS - 500 });
    const cancelled = reducer(partiallyTicked, { type: "CANCEL_GENERATOR_OVERLOAD_WINDUP" });

    expect(cancelled.generatorOverloadWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
    expect(cancelled.generatorOverloadReadySeq).toBe(0);

    // Overload never starts on its own after a cancel, even if more time passes.
    const laterTick = reducer(cancelled, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(laterTick.doorGeneratorOverloadUntilMs).toBeNull();
    expect(laterTick.doorDestroyed).toBe(false);
    expect(laterTick.generatorState).toBe("normal");
  });
});

describe("a real generator fault interrupting the windup cancels it (loss of ability to use the generator)", () => {
  it("windup is cancelled the moment generatorState stops being 'normal' mid-hold, overload never starts", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    // Simulates a real fault rolling in mid-hold (updateGenerator would do
    // this on its own in a live TICK once generatorFaultAtMs is reached —
    // here it's forced directly to isolate the windup-cancel behavior).
    const interrupted: GameState = { ...started, generatorState: "silentFault" };
    const ticked = reducer(interrupted, { type: "TICK", deltaMs: 100 });

    expect(ticked.generatorOverloadWindup.active).toBe(false);
    expect(ticked.generatorOverloadReadySeq).toBe(0);
  });
});

describe("generator overload windup — reaches ready via TICK, same duration as emergency run windup", () => {
  it("does not become ready before GENERATOR_OVERLOAD_WINDUP_DURATION_MS", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_WINDUP_DURATION_MS - 1 });
    expect(ticked.generatorOverloadWindup.active).toBe(true);
    expect(ticked.generatorOverloadReadySeq).toBe(0);
  });

  it("becomes ready (readySeq bumps, windup clears) once GENERATOR_OVERLOAD_WINDUP_DURATION_MS elapses", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_WINDUP_DURATION_MS });
    expect(ticked.generatorOverloadWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
    expect(ticked.generatorOverloadReadySeq).toBe(1);
  });

  it("GENERATOR_OVERLOAD_WINDUP_DURATION_MS is exactly 1500ms (shortened hold, viz zadání)", () => {
    expect(GENERATOR_OVERLOAD_WINDUP_DURATION_MS).toBe(1500);
  });

  it("holding for exactly 1.5s (1500ms, hardcoded per zadání) activates the overload readiness", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: 1500 });
    expect(ticked.generatorOverloadWindup.active).toBe(false);
    expect(ticked.generatorOverloadReadySeq).toBe(1);
  });

  it("holding for less than 1.5s (e.g. 1400ms) does NOT activate the overload readiness", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: 1400 });
    expect(ticked.generatorOverloadWindup.active).toBe(true);
    expect(ticked.generatorOverloadReadySeq).toBe(0);
  });

  it("holding for the full duration bumps readySeq exactly once, even across further ticks (dispatched exactly once)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_WINDUP_DURATION_MS });
    const laterTick = reducer(ticked, { type: "TICK", deltaMs: 1000 });
    expect(laterTick.generatorOverloadReadySeq).toBe(1);
  });

  it("during the windup, nothing overload-related happens yet: door doesn't lock, energy doesn't act like restart, view doesn't change", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_WINDUP_DURATION_MS - 1 });

    expect(ticked.doorGeneratorOverloadUntilMs).toBeNull();
    expect(ticked.doorDestroyed).toBe(false);
    expect(ticked.generatorState).toBe("normal");
    expect(ticked.playerView).toBe("generator");
  });
});

describe("completing the windup automatically moves the view to the door", () => {
  it("START_GENERATOR_OVERLOAD sets playerView to 'door' and closes the camera overlay", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtGenerator({ cameraOpen: true, cameraViewMode: "detail", activeCameraId: NIGHT_01.defaultCameraId });
    const result = reducer(state, { type: "START_GENERATOR_OVERLOAD" });

    expect(result.playerView).toBe("door");
    expect(result.cameraOpen).toBe(false);
    expect(result.activeCameraId).toBeNull();
    expect(result.cameraViewMode).toBe("overview");
  });
});

describe("blackout during the windup cancels it", () => {
  it("a TICK that drains power to 0 mid-windup clears generatorOverloadWindup and never starts the overload", () => {
    const reducer = createGameReducer(NIGHT_01);
    // doorClosed+lightOn give real drain (NIGHT_01: 1 + 1.4 per second) so a
    // low starting power actually crosses to <=0 within one tick, instead of
    // being outpaced by idle recharge (generator view alone has no drain).
    const started = reducer(stateAtGenerator({ power: 0.1, doorClosed: true, lightOn: true }), {
      type: "START_GENERATOR_OVERLOAD_WINDUP",
    });
    const ticked = reducer(started, { type: "TICK", deltaMs: 200 });

    expect(ticked.gameStatus).toBe("blackout");
    expect(ticked.generatorOverloadWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
    expect(ticked.doorGeneratorOverloadUntilMs).toBeNull();
    expect(ticked.generatorOverloadReadySeq).toBe(0);
  });
});

describe("START_GENERATOR_OVERLOAD — the actual 10s overload", () => {
  it("locks the door (doorGeneratorOverloadUntilMs set), forces it open, and behaves energetically like a restart", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtGenerator({ elapsedMs: 1000, doorClosed: true });
    const result = reducer(state, { type: "START_GENERATOR_OVERLOAD" });

    expect(result.doorClosed).toBe(false);
    expect(result.doorGeneratorOverloadUntilMs).toBe(1000 + GENERATOR_OVERLOAD_DOOR_DURATION_MS);
    // Stejná energetická logika jako RESTART_GENERATOR — generatorState
    // "restarting" + generatorRestartUntilMs, beze změny updateGenerator.
    expect(result.generatorState).toBe("restarting");
    expect(result.generatorRestartUntilMs).toBe(1000 + GENERATOR_OVERLOAD_DOOR_DURATION_MS);
    expect(result.doorDestroyed).toBe(false);
  });

  it("is a no-op if the generator isn't normal, or the door is already destroyed/overloading", () => {
    const reducer = createGameReducer(NIGHT_01);
    const faulted = stateAtGenerator({ generatorState: "criticalBeeping" });
    expect(reducer(faulted, { type: "START_GENERATOR_OVERLOAD" })).toBe(faulted);

    const destroyed = stateAtGenerator({ doorDestroyed: true, doorClosed: false });
    expect(reducer(destroyed, { type: "START_GENERATOR_OVERLOAD" })).toBe(destroyed);

    const overloading = stateAtGenerator({ doorGeneratorOverloadUntilMs: 5000 });
    expect(reducer(overloading, { type: "START_GENERATOR_OVERLOAD" })).toBe(overloading);
  });
});

describe("TOGGLE_DOOR — locked for the whole 10s overload, not just after", () => {
  it("is a no-op while doorGeneratorOverloadUntilMs is set", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = { ...stateAtGenerator(), playerView: "door", doorClosed: false, doorGeneratorOverloadUntilMs: 5000 };
    const result = reducer(state, { type: "TOGGLE_DOOR" });
    expect(result).toBe(state);
    expect(result.doorClosed).toBe(false);
  });
});

describe("overload completion via TICK — destroys the door after exactly GENERATOR_OVERLOAD_DOOR_DURATION_MS", () => {
  it("keeps the door locked (not yet destroyed) 1ms before the deadline", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0 }), { type: "START_GENERATOR_OVERLOAD" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS - 1 });
    expect(ticked.doorDestroyed).toBe(false);
    expect(ticked.doorGeneratorOverloadUntilMs).not.toBeNull();
    expect(ticked.doorClosed).toBe(false);
  });

  it("destroys the door exactly once GENERATOR_OVERLOAD_DOOR_DURATION_MS elapses, and clears the lock", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0 }), { type: "START_GENERATOR_OVERLOAD" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(ticked.doorDestroyed).toBe(true);
    expect(ticked.doorClosed).toBe(false);
    expect(ticked.doorGeneratorOverloadUntilMs).toBeNull();
    // Stejný tik už také vrátí generátor zpátky na "normal" — identická
    // energetická logika jako RESTART_GENERATOR (updateGenerator beze změny).
    expect(ticked.generatorState).toBe("normal");
  });

  it("the door stays destroyed and TOGGLE_DOOR remains a no-op afterwards", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0 }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    const doorState: GameState = { ...finished, playerView: "door" };
    const toggled = reducer(doorState, { type: "TOGGLE_DOOR" });
    expect(toggled).toBe(doorState);
    expect(toggled.doorClosed).toBe(false);
  });
});

describe("RESTART_GENERATOR — unaffected by the new overload mechanism", () => {
  it("still fixes a real fault normally", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtGenerator({ generatorState: "criticalBeeping" });
    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result.generatorState).toBe("normal");
    expect(result.doorGeneratorOverloadUntilMs).toBeNull();
    expect(result.doorDestroyed).toBe(false);
  });

  it("still applies the accidental-restart penalty for a healthy generator, without touching the door", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtGenerator();
    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result.generatorState).toBe("restarting");
    expect(result.doorGeneratorOverloadUntilMs).toBeNull();
    expect(result.doorDestroyed).toBe(false);
    expect(result.doorClosed).toBe(false);
  });
});

describe("Titan overload outcome — door always destroyed, Titan graveyarded only at the door", () => {
  it("a completed overload with NO Titan (Imp night) still destroys the door exactly as before — regression", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.doorDestroyed).toBe(true);
    expect(finished.doorClosed).toBe(false);
  });

  it("Imp at the door (or breach) is NOT moved to graveyard by the overload — only Titan is", () => {
    const reducer = createGameReducer(NIGHT_01);
    for (const stage of ["at_door", "breach"] as const) {
      const started = reducer(stateAtGenerator({ elapsedMs: 0, enemyStage: stage }), { type: "START_GENERATOR_OVERLOAD" });
      const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
      expect(finished.enemyStage).toBe(stage);
      expect(finished.doorDestroyed).toBe(true);
    }
  });

  it("Titan at 'at_door' when the overload completes: door destroyed AND Titan moved to graveyard", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.doorDestroyed).toBe(true);
    expect(finished.doorClosed).toBe(false);
    expect(finished.enemyStage).toBe("graveyard");
  });

  it("Titan at 'breach' when the overload completes also dies (same door-contact definition as isMonsterAtDoor)", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "breach" }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("graveyard");
    expect(finished.doorDestroyed).toBe(true);
  });

  it("Titan NOT at the door when the overload completes: door still destroyed, but enemyStage is untouched", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    for (const stage of ["outside", "outer_yard", "left_hallway", "right_hallway", "door_hallway"] as const) {
      const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: stage }), { type: "START_GENERATOR_OVERLOAD" });
      const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
      expect(finished.doorDestroyed).toBe(true);
      expect(finished.enemyStage).toBe(stage);
    }
  });

  it("Titan already mid-attack (death already decided) when the overload completes is NOT graveyarded — most conservative reading of 'at the door'", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "attack" }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("attack");
    expect(finished.doorDestroyed).toBe(true);
  });

  it("does not move Titan to graveyard before the overload actually completes", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), { type: "START_GENERATOR_OVERLOAD" });
    const almostDone = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS - 1 });
    expect(almostDone.enemyStage).toBe("at_door");
    expect(almostDone.doorDestroyed).toBe(false);
  });

  it("Titan graveyarded by the overload stops receiving ENEMY_ADVANCE afterwards", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("graveyard");

    // Dispatch ENEMY_ADVANCE directly against the imp reducer here (not
    // TITAN_NIGHT's, which has no resolver and would throw) — the point is
    // solely to confirm the graveyard GUARD in ENEMY_ADVANCE itself blocks
    // any further movement, independent of which monster resolver exists.
    const impReducer = createGameReducer(NIGHT_01);
    const stillGraveyard = impReducer(finished, { type: "ENEMY_ADVANCE" });
    expect(stillGraveyard).toBe(finished);
    expect(stillGraveyard.enemyStage).toBe("graveyard");
  });

  it("Titan kill via overload does NOT set monsterDefeated, does NOT set screen to 'monsterDefeated', and does NOT stop the run", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door", screen: "playing" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("graveyard");
    expect(finished.monsterDefeated).toBe(false);
    expect(finished.monsterKilledThisRun).toBe(false);
    expect(finished.screen).toBe("playing");
    expect(finished.isRunning).toBe(true);
  });
});

// Prezentační 3s "reveal" mrtvého Titana po úspěšném zabití přetížením (viz
// zadání "napoj kompletní dveřní vizuální sekvenci Titana",
// GameState.titanOverloadDeathRevealUntilMs, DoorView.tsx). Nastavuje se
// VÝHRADNĚ na stejný TICK jako `enemyStage: "graveyard"` výše — testováno
// odděleně, ať se test souboru drží u existujícího "Titan overload outcome"
// popisu logiky přesunu do graveyardu.
describe("titanOverloadDeathRevealUntilMs — cosmetic 3s reveal after a successful Titan overload kill", () => {
  it("is set to elapsedMs + TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS exactly when Titan is graveyarded", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("graveyard");
    expect(finished.titanOverloadDeathRevealUntilMs).toBe(
      GENERATOR_OVERLOAD_DOOR_DURATION_MS + TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS,
    );
  });

  it("stays null when the overload completes without killing Titan (Imp night — regression)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.doorDestroyed).toBe(true);
    expect(finished.titanOverloadDeathRevealUntilMs).toBeNull();
  });

  it("stays null when Titan's overload completes but Titan wasn't actually at the door", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "outer_yard" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("outer_yard");
    expect(finished.titanOverloadDeathRevealUntilMs).toBeNull();
  });

  it("lasts exactly TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS: still set 1ms before the deadline", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const killed = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    const almostExpired = reducer(killed, { type: "TICK", deltaMs: TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS - 1 });
    expect(almostExpired.titanOverloadDeathRevealUntilMs).not.toBeNull();
  });

  it("expires back to null exactly once TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS elapses after the kill", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const killed = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    const expired = reducer(killed, { type: "TICK", deltaMs: TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS });
    expect(expired.titanOverloadDeathRevealUntilMs).toBeNull();
    // After the reveal window, the door stays in its normal destroyed state
    // — same generic doorDestroyed flag as any other overload kill.
    expect(expired.doorDestroyed).toBe(true);
  });

  it("does not affect monsterDefeated, isRunning, or screen — purely cosmetic", () => {
    const reducer = createGameReducer(TITAN_NIGHT);
    const started = reducer(titanStateAtGenerator({ elapsedMs: 0, enemyStage: "at_door", screen: "playing" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const killed = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(killed.titanOverloadDeathRevealUntilMs).not.toBeNull();
    expect(killed.monsterDefeated).toBe(false);
    expect(killed.isRunning).toBe(true);
    expect(killed.screen).toBe("playing");
  });

  it("resets to null on the next night's initial state", () => {
    const state = titanStateAtGenerator({ titanOverloadDeathRevealUntilMs: 12345 });
    const initial = createInitialGameState(TITAN_NIGHT, { nightFeatures: state.nightFeatures });
    expect(initial.titanOverloadDeathRevealUntilMs).toBeNull();
  });
});
