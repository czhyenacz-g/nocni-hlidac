import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// "graveyard" — definitivní vyřazení monstra do konce AKTUÁLNÍ noci (viz
// TODO.md/analýza monster lifecycle). Testy tady pokrývají jen OBECNÉ
// chování stage samotné (guard v ENEMY_ADVANCE, reset příští noc) — kdo do
// graveyardu monstrum skutečně přesune (dnes: Titan u dveří po dokončeném
// přetížení generátoru), pokrývá game/core/generatorOverload.test.ts.

function stateInGraveyard(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    enemyStage: "graveyard",
    ...overrides,
  };
}

describe("EnemyStage accepts 'graveyard'", () => {
  it("a GameState can be constructed with enemyStage: 'graveyard' (type-level + runtime sanity)", () => {
    const state = stateInGraveyard();
    expect(state.enemyStage).toBe("graveyard");
  });
});

describe("ENEMY_ADVANCE — graveyard blocks all further movement", () => {
  it("returns state unchanged when enemyStage is 'graveyard'", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInGraveyard();
    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result).toBe(state);
    expect(result.enemyStage).toBe("graveyard");
  });

  it("repeated ENEMY_ADVANCE dispatches never move the monster out of graveyard", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = stateInGraveyard();
    for (let i = 0; i < 10; i++) {
      state = reducer(state, { type: "ENEMY_ADVANCE" });
    }
    expect(state.enemyStage).toBe("graveyard");
  });

  it("TICK does not move a graveyarded monster either (no ENEMY_ADVANCE dispatch needed to stay put)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInGraveyard();
    const result = reducer(state, { type: "TICK", deltaMs: 5000 });
    expect(result.enemyStage).toBe("graveyard");
  });
});

describe("Office-threat mechanics cannot resurrect a graveyarded monster", () => {
  it("APPLY_OFFICE_THREAT_ON_RETURN is a no-op while enemyStage is 'graveyard'", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInGraveyard();
    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(result).toBe(state);
    expect(result.enemyStage).toBe("graveyard");
  });

  it("APPLY_MONSTER_REACHED_OFFICE_AFTERMATH is a no-op while enemyStage is 'graveyard'", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInGraveyard();
    const result = reducer(state, { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
    expect(result).toBe(state);
    expect(result.enemyStage).toBe("graveyard");
  });
});

describe("A new night resets graveyard back to the normal starting stage", () => {
  it("RESTART_SHIFT resets enemyStage to 'outside', same as any other stage", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInGraveyard();
    const result = reducer(state, { type: "RESTART_SHIFT" });
    expect(result.enemyStage).toBe("outside");
  });

  it("createInitialGameState always starts fresh at 'outside', regardless of any prior graveyard state", () => {
    const fresh = createInitialGameState(NIGHT_01);
    expect(fresh.enemyStage).toBe("outside");
  });
});
