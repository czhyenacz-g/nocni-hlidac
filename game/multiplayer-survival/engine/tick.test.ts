import { describe, expect, it } from "vitest";
import { createInitialMultiplayerSurvivalState, tickMultiplayerSurvival } from "./tick";
import { MultiplayerSurvivalInputs, MultiplayerSurvivalState } from "../state/types";

function noInputFor(playerIds: string[]): MultiplayerSurvivalInputs {
  return playerIds.map((playerId) => ({ playerId, moveX: 0, moveY: 0, firing: false }));
}

describe("createInitialMultiplayerSurvivalState", () => {
  it("creates one player and one monster by default", () => {
    const state = createInitialMultiplayerSurvivalState();
    expect(state.players).toHaveLength(1);
    expect(state.monsters).toHaveLength(1);
    expect(state.status).toBe("playing");
    expect(state.elapsedMs).toBe(0);
  });

  it("supports arrays of multiple players and monsters", () => {
    const state = createInitialMultiplayerSurvivalState(["p1", "p2", "p3"], ["m1", "m2"]);
    expect(state.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(state.monsters.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("starts every player and monster alive", () => {
    const state = createInitialMultiplayerSurvivalState(["p1", "p2"], ["m1"]);
    expect(state.players.every((p) => p.alive)).toBe(true);
    expect(state.monsters.every((m) => m.alive)).toBe(true);
  });
});

describe("tickMultiplayerSurvival — no input", () => {
  it("advances elapsedMs and keeps player position unchanged", () => {
    const state = createInitialMultiplayerSurvivalState();
    const [player] = state.players;
    const next = tickMultiplayerSurvival(state, noInputFor(["player-1"]), 100);

    expect(next.elapsedMs).toBe(100);
    expect(next.players[0].x).toBe(player.x);
    expect(next.players[0].y).toBe(player.y);
  });

  it("is a pure function — does not mutate the input state", () => {
    const state = createInitialMultiplayerSurvivalState();
    const snapshotX = state.players[0].x;
    tickMultiplayerSurvival(state, noInputFor(["player-1"]), 500);
    expect(state.players[0].x).toBe(snapshotX);
  });
});

describe("tickMultiplayerSurvival — player movement", () => {
  it("moves a player toward the input direction", () => {
    const state = createInitialMultiplayerSurvivalState();
    const [player] = state.players;
    const next = tickMultiplayerSurvival(state, [{ playerId: player.id, moveX: 1, moveY: 0, firing: false }], 100);

    expect(next.players[0].x).toBeGreaterThan(player.x);
    expect(next.players[0].y).toBe(player.y);
    expect(next.players[0].direction).toBe("right");
  });

  it("does not move a dead player", () => {
    const state = createInitialMultiplayerSurvivalState();
    const dead = { ...state, players: [{ ...state.players[0], alive: false }] };
    const next = tickMultiplayerSurvival(dead, [{ playerId: dead.players[0].id, moveX: 1, moveY: 0, firing: false }], 100);
    expect(next.players[0].x).toBe(dead.players[0].x);
  });
});

describe("tickMultiplayerSurvival — collision", () => {
  it("stops a player at a wall instead of passing through it", () => {
    const state = createInitialMultiplayerSurvivalState();
    const wall = state.map.walls[0];
    const playerAtWall = {
      ...state,
      players: [{ ...state.players[0], x: wall.x - state.players[0].radius - 1, y: wall.y + wall.height / 2 }],
    };
    const next = tickMultiplayerSurvival(playerAtWall, [{ playerId: playerAtWall.players[0].id, moveX: 1, moveY: 0, firing: false }], 200);

    // Wall-slide: X pohyb do zdi se zamítne, hráč zůstane na místě na téhle ose.
    expect(next.players[0].x).toBe(playerAtWall.players[0].x);
  });
});

describe("tickMultiplayerSurvival — shooting the monster", () => {
  function stateWithPlayerFacingMonster(): MultiplayerSurvivalState {
    const state = createInitialMultiplayerSurvivalState();
    const monster = state.monsters[0];
    // Postav hráče těsně vedle monstra, otočeného směrem k němu, ať výseč/LOS projde bez závislosti na náhodné AI pozici.
    const players = [{ ...state.players[0], x: monster.x - 50, y: monster.y, direction: "right" as const }];
    return { ...state, players };
  }

  it("stuns the monster on a hit that lands in the shotgun cone", () => {
    const state = stateWithPlayerFacingMonster();
    const next = tickMultiplayerSurvival(state, [{ playerId: state.players[0].id, moveX: 0, moveY: 0, firing: true }], 16);

    expect(next.monsters[0].stunRemainingMs).toBeGreaterThan(0);
  });

  it("does not hit the monster when the player is not firing", () => {
    const state = stateWithPlayerFacingMonster();
    const next = tickMultiplayerSurvival(state, [{ playerId: state.players[0].id, moveX: 0, moveY: 0, firing: false }], 16);

    expect(next.monsters[0].stunRemainingMs).toBe(0);
  });

  it("transitions the monster to enraged exactly once, when stun wears off after the first hit", () => {
    let state = stateWithPlayerFacingMonster();
    state = tickMultiplayerSurvival(state, [{ playerId: state.players[0].id, moveX: 0, moveY: 0, firing: true }], 16);
    expect(state.monsters[0].enraged).toBe(false);

    // Odsimuluj celou dobu omráčení — updateEnemyAi nastaví enraged=true přesně v tiku, kdy stun doběhne na 0.
    const stunMs = state.monsters[0].stunRemainingMs;
    state = tickMultiplayerSurvival(state, [{ playerId: state.players[0].id, moveX: 0, moveY: 0, firing: false }], stunMs);

    expect(state.monsters[0].enraged).toBe(true);
  });

  it("stays enraged after a second hit — it never re-triggers the first transition", () => {
    let state = stateWithPlayerFacingMonster();
    state = tickMultiplayerSurvival(state, [{ playerId: state.players[0].id, moveX: 0, moveY: 0, firing: true }], 16);
    const stunMs = state.monsters[0].stunRemainingMs;
    state = tickMultiplayerSurvival(state, [{ playerId: state.players[0].id, moveX: 0, moveY: 0, firing: false }], stunMs);
    expect(state.monsters[0].enraged).toBe(true);

    // Druhý zásah — enraged zůstává true (idempotentní), žádný nový "první" přechod.
    state = tickMultiplayerSurvival(state, [{ playerId: state.players[0].id, moveX: 0, moveY: 0, firing: true }], 16);
    expect(state.monsters[0].enraged).toBe(true);
    expect(state.monsters[0].stunRemainingMs).toBeGreaterThan(0);
  });
});

describe("tickMultiplayerSurvival — monster touching a player", () => {
  it("knocks the player down when a living, non-stunned monster touches them", () => {
    const state = createInitialMultiplayerSurvivalState();
    const monster = state.monsters[0];
    const touching = {
      ...state,
      players: [{ ...state.players[0], x: monster.x, y: monster.y }],
    };
    const next = tickMultiplayerSurvival(touching, noInputFor([touching.players[0].id]), 16);

    expect(next.players[0].alive).toBe(false);
    expect(next.status).toBe("all_players_down");
  });

  it("does not knock the player down when the touching monster is stunned", () => {
    const state = createInitialMultiplayerSurvivalState();
    const monster = { ...state.monsters[0], stunRemainingMs: 5000 };
    const touching = {
      ...state,
      players: [{ ...state.players[0], x: monster.x, y: monster.y }],
      monsters: [monster],
    };
    const next = tickMultiplayerSurvival(touching, noInputFor([touching.players[0].id]), 16);

    expect(next.players[0].alive).toBe(true);
    expect(next.status).toBe("playing");
  });
});

describe("tickMultiplayerSurvival — pickups", () => {
  function stateWithPlayerOnPickup(): MultiplayerSurvivalState {
    const state = createInitialMultiplayerSurvivalState();
    const pickup = state.pickups[0];
    const players = [{ ...state.players[0], x: pickup.x, y: pickup.y }];
    return { ...state, players };
  }

  it("accumulates looting progress only while the player stays still in range", () => {
    const state = stateWithPlayerOnPickup();
    const next = tickMultiplayerSurvival(state, noInputFor([state.players[0].id]), 500);
    expect(next.players[0].lootingProgressMs).toBeGreaterThan(0);
    expect(next.pickups[0].collected).toBe(false);
  });

  it("resets looting progress when the player moves away", () => {
    const state = stateWithPlayerOnPickup();
    const midway = tickMultiplayerSurvival(state, noInputFor([state.players[0].id]), 500);
    expect(midway.players[0].lootingProgressMs).toBeGreaterThan(0);

    const movedAway = { ...midway, players: [{ ...midway.players[0], x: midway.players[0].x + 500, y: midway.players[0].y + 500 }] };
    const next = tickMultiplayerSurvival(movedAway, noInputFor([movedAway.players[0].id]), 16);
    expect(next.players[0].lootingProgressMs).toBe(0);
  });

  it("collects the pickup after standing still long enough, adding it to collectedItemIds", () => {
    const state = stateWithPlayerOnPickup();
    const pickupId = state.pickups[0].id;
    const itemId = state.pickups[0].itemId;

    const next = tickMultiplayerSurvival(state, noInputFor([state.players[0].id]), 2100);

    expect(next.pickups.find((p) => p.id === pickupId)?.collected).toBe(true);
    expect(next.players[0].collectedItemIds).toContain(itemId);
  });

  it("does not collect a pickup the player is not standing near", () => {
    const state = createInitialMultiplayerSurvivalState();
    const next = tickMultiplayerSurvival(state, noInputFor([state.players[0].id]), 5000);
    expect(next.pickups.every((p) => !p.collected)).toBe(true);
  });
});
