import { describe, expect, it } from "vitest";
import { createDevRoom, joinRoom, markSlotConnection, nextSnapshotSeq, setPlayerInput, tickRoom } from "./room";

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

  it("rejects a third joiner once both slots are taken", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    joinRoom(room, null);
    const third = joinRoom(room, null);
    expect(third).toEqual({ ok: false, reason: "full" });
  });

  it("lets a known token rejoin its original slot even when the room is otherwise full", () => {
    const room = createDevRoom();
    const first = joinRoom(room, null);
    joinRoom(room, null);
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
    joinRoom(room, null);
    joinRoom(room, null);
    const result = joinRoom(room, "not-a-real-token");
    expect(result).toEqual({ ok: false, reason: "full" });
  });
});

describe("markSlotConnection", () => {
  it("marks a joined player as disconnected without removing them from engine state", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    markSlotConnection(room, "player-1", false);

    expect(room.slots["player-1"]?.connected).toBe(false);
    expect(room.state.players.some((p) => p.id === "player-1")).toBe(true);
  });

  it("marks a player as reconnected", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    markSlotConnection(room, "player-1", false);
    markSlotConnection(room, "player-1", true);

    expect(room.slots["player-1"]?.connected).toBe(true);
  });
});

describe("tickRoom", () => {
  it("advances elapsedMs using the last known input per player, including a disconnected one", () => {
    const room = createDevRoom();
    joinRoom(room, null);
    setPlayerInput(room, "player-1", { moveX: 1, moveY: 0, firing: false });
    markSlotConnection(room, "player-1", false); // disconnected, but last input should still apply

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
});
