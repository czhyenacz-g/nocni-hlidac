import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { EnemyStage } from "./types";

// Normal/Hardcore životy a death flow (viz game/core/gameMode.ts,
// app/play/page.tsx) — reducer sám neví nic o "restartuj stejnou noc" vs.
// "run skončil", jen správně sníží/zachová livesRemaining; kterou night
// hodnotu poslat do dalšího START_SHIFT/RESTART_SHIFT rozhoduje
// app/play/page.tsx podle výsledného `livesRemaining`.

describe("START_SHIFT / RESTART_SHIFT gameMode + livesRemaining", () => {
  it("START_SHIFT defaults to normal with 3 lives when nothing is passed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "START_SHIFT" });

    expect(result.gameMode).toBe("normal");
    expect(result.livesRemaining).toBe(3);
  });

  it("START_SHIFT with gameMode hardcore starts with 1 life", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "START_SHIFT", gameMode: "hardcore" });

    expect(result.gameMode).toBe("hardcore");
    expect(result.livesRemaining).toBe(1);
  });

  it("RESTART_SHIFT carries forward an explicitly passed gameMode/livesRemaining (continuing a Normal run)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "RESTART_SHIFT", gameMode: "normal", livesRemaining: 2 });

    expect(result.gameMode).toBe("normal");
    expect(result.livesRemaining).toBe(2);
  });
});

describe("Normal death with lives remaining", () => {
  it("decrements livesRemaining from 3 to 2 and does not end the run", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 3),
      isRunning: true,
      screen: "playing" as const,
    };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.screen).toBe("death");
    expect(result.gameMode).toBe("normal");
    expect(result.livesRemaining).toBe(2);
  });

  it("a door-attack death (not looking at the door) also decrements lives the same way", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 3),
      isRunning: true,
      screen: "playing" as const,
      enemyRoute: ["at_door", "attack"] as EnemyStage[],
      enemyStage: "at_door" as const,
      playerView: "desk" as const,
      doorClosed: false,
    };

    const result = reducer(state, { type: "ENEMY_ADVANCE" });

    expect(result.screen).toBe("death");
    expect(result.livesRemaining).toBe(2);
  });
});

describe("Normal death with the last life", () => {
  it("drops livesRemaining to 0, ending the run", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 1),
      isRunning: true,
      screen: "playing" as const,
    };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.screen).toBe("death");
    expect(result.livesRemaining).toBe(0);
  });
});

describe("Hardcore death", () => {
  it("always drops livesRemaining to 0 (no continuing) regardless of starting lives", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "hardcore", 1),
      isRunning: true,
      screen: "playing" as const,
    };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.screen).toBe("death");
    expect(result.gameMode).toBe("hardcore");
    expect(result.livesRemaining).toBe(0);
  });
});
