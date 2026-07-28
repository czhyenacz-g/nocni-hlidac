import { describe, expect, it } from "vitest";
import { MAX_PLAYERS } from "../engine/config";
import { createDevRoom, joinRoom, markSlotConnection, nextSnapshotSeq, restartRound, setPlayerInput, tickRoom } from "./room";

describe("joinRoom", () => {
  it("assigns the first free slot (player-1) to the first joiner without a token", () => {
    const room = createDevRoom();
    const result = joinRoom(room, null);
    expect(result).toMatchObject({ ok: true, slot: "player-1", playerId: "player-1" });
    expect(room.state.players.map((p) => p.id)).toContain("player-1");
  });

  it("assigns the second free slot (player-2) to a second joiner", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    const second = joinRoom(room, null);
    expect(second).toMatchObject({ ok: true, slot: "player-2", playerId: "player-2" });
  });

  it("rejects a joiner once MAX_PLAYERS slots are all taken", () => {
    const room = createDevRoom();
    for (let i = 0; i < MAX_PLAYERS; i++) joinRoom(room, null);
    const oneMore = joinRoom(room, null);
    expect(oneMore).toEqual({ ok: false, reason: "full" });
  });

  it("lets a known token rejoin its original slot even when the room is otherwise full", () => {
    const room = createDevRoom();
    const first = joinRoom(room, null);
    for (let i = 1; i < MAX_PLAYERS; i++) joinRoom(room, null);
    if (!first.ok) throw new Error("expected first join to succeed");

    const rejoin = joinRoom(room, first.token);
    expect(rejoin).toMatchObject({ ok: true, slot: "player-1", playerId: "player-1", token: first.token });
  });

  it("does not duplicate the player in engine state on rejoin", () => {
    const room = createDevRoom();
    const first = joinRoom(room, null);
    if (!first.ok) throw new Error("expected first join to succeed");
    joinRoom(room, first.token);

    expect(room.state.players.filter((p) => p.id === "player-1")).toHaveLength(1);
  });

  it("an unknown token on a full room is rejected, not silently reassigned", () => {
    const room = createDevRoom();
    for (let i = 0; i < MAX_PLAYERS; i++) joinRoom(room, null);
    const result = joinRoom(room, "not-a-real-token");
    expect(result).toEqual({ ok: false, reason: "full" });
  });

  it("starts the round the moment the first player joins a waiting room", () => {
    const room = createDevRoom();
    expect(room.state.roundStatus).toBe("waiting");
    joinRoom(room, null);
    expect(room.state.roundStatus).toBe("playing");
    expect(room.state.remainingMs).toBe(room.roundDurationMs);
  });

  it("does not reset the timer when a second player joins an already-playing round", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    tickRoom(room, 10_000);
    const remainingBeforeSecondJoin = room.state.remainingMs;

    joinRoom(room, null);

    expect(room.state.remainingMs).toBe(remainingBeforeSecondJoin);
    expect(room.state.roundStatus).toBe("playing");
  });
});

describe("markSlotConnection", () => {
  it("removes a disconnected player from engine state entirely", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    joinRoom(room, null); // second player stays connected so the room isn't wiped back to "waiting"
    markSlotConnection(room, "player-1", false);

    expect(room.slots.find((s) => s?.playerId === "player-1")?.connected).toBe(false);
    expect(room.state.players.some((p) => p.id === "player-1")).toBe(false);
  });

  it("stops the monster from targeting a disconnected player", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    joinRoom(room, null);
    markSlotConnection(room, "player-1", false);
    tickRoom(room, 16);

    expect(room.state.monsters[0].targetPlayerId).not.toBe("player-1");
  });

  it("resets the room to waiting once every player has disconnected", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    joinRoom(room, null);
    markSlotConnection(room, "player-1", false);
    markSlotConnection(room, "player-2", false);

    expect(room.state.roundStatus).toBe("waiting");
    expect(room.state.players).toHaveLength(0);
    expect(room.slots.every((s) => s === null)).toBe(true);
  });

  it("does not reset the room while at least one player is still connected", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    joinRoom(room, null);
    markSlotConnection(room, "player-1", false);

    expect(room.state.roundStatus).toBe("playing");
    expect(room.state.players.map((p) => p.id)).toEqual(["player-2"]);
  });

  it("marks a player as reconnected without touching engine state directly (rejoin adds them back)", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    joinRoom(room, null); // second player stays connected so the room isn't wiped back to "waiting"
    markSlotConnection(room, "player-1", false);
    markSlotConnection(room, "player-1", true);

    expect(room.slots.find((s) => s?.playerId === "player-1")?.connected).toBe(true);
  });
});

describe("tickRoom", () => {
  it("advances elapsedMs using the last known input per player", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    setPlayerInput(room, "player-1", { moveX: 1, moveY: 0, firing: false });

    const before = room.state.players[0].x;
    tickRoom(room, 100);

    expect(room.state.elapsedMs).toBe(100);
    expect(room.state.players[0].x).toBeGreaterThan(before);
  });

  it("defaults to no movement/firing for a player with no input recorded yet", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    const before = room.state.players[0].x;

    tickRoom(room, 100);

    expect(room.state.players[0].x).toBe(before);
  });

  it("does not tick a waiting room (no players yet)", () => {
    const room = createDevRoom();
    tickRoom(room, 1000);
    expect(room.state.elapsedMs).toBe(0);
  });
});

describe("restartRound", () => {
  function forceRoundEnd(room: ReturnType<typeof createDevRoom>, reason: "won" | "lost" = "lost") {
    room.state = { ...room.state, roundStatus: reason, roundEndReason: reason === "lost" ? "caught" : "timeout" };
  }

  it("is a no-op while the round is still playing", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    const before = room.state;
    restartRound(room);
    expect(room.state).toBe(before);
  });

  it("starts a fresh playing round with a full timer once the previous one ended", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    tickRoom(room, 60_000);
    forceRoundEnd(room, "lost");

    restartRound(room);

    expect(room.state.roundStatus).toBe("playing");
    expect(room.state.remainingMs).toBe(room.roundDurationMs);
    expect(room.state.elapsedMs).toBe(0);
    expect(room.state.players.every((p) => p.alive)).toBe(true);
  });

  it("only respawns currently-connected players, not disconnected-but-reserved slots", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    joinRoom(room, null);
    markSlotConnection(room, "player-2", false);
    forceRoundEnd(room, "won");

    restartRound(room);

    expect(room.state.players.map((p) => p.id)).toEqual(["player-1"]);
  });

  it("resets the round to waiting if nobody is connected anymore", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    markSlotConnection(room, "player-1", false);
    // markSlotConnection already resets to "waiting" once empty, so force
    // roundStatus back to "lost" to exercise restartRound's own empty-room branch directly.
    forceRoundEnd(room, "lost");

    restartRound(room);

    expect(room.state.roundStatus).toBe("waiting");
    expect(room.state.players).toHaveLength(0);
  });
});

describe("nextSnapshotSeq", () => {
  it("starts at 1 and increments monotonically", () => {
    const room = createDevRoom();
    expect(nextSnapshotSeq(room)).toBe(1);
    expect(nextSnapshotSeq(room)).toBe(2);
    expect(nextSnapshotSeq(room)).toBe(3);
  });

  it("never resets across a rejoin", () => {
    const room = createDevRoom();
    nextSnapshotSeq(room);
    nextSnapshotSeq(room);
    const first = joinRoom(room, null);
    if (!first.ok) throw new Error("expected join to succeed");
    joinRoom(room, first.token);

    expect(nextSnapshotSeq(room)).toBe(3);
  });

  it("never resets when the room falls back to waiting after everyone disconnects", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    nextSnapshotSeq(room);
    nextSnapshotSeq(room);
    markSlotConnection(room, "player-1", false);

    expect(nextSnapshotSeq(room)).toBe(3);
  });
});
