import { describe, expect, it } from "vitest";
import { MiniGamePlacementError, getRoomBoundsForSlot, resolveMiniGamePlacement } from "./layoutPlacement";
import { SERVICE_FLOOR_ALPHA } from "./layouts/serviceFloorAlpha";
import { SERVICE_FLOOR_STORAGE } from "./layouts/serviceFloorStorage";
import { EmergencyMiniGameInput } from "./types";

const RETURN_INPUT: EmergencyMiniGameInput = { objective: "return_to_office" };

function collectInput(itemToCollect: EmergencyMiniGameInput["itemToCollect"]): EmergencyMiniGameInput {
  return { objective: "collect_item", itemToCollect };
}

describe("resolveMiniGamePlacement — player start/exit/monster spawn only come from tagged slots", () => {
  it("playerStartSlotId always has the player_start tag", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, RETURN_INPUT, "seed-a");
    const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.playerStartSlotId);
    expect(slot?.tags).toContain("player_start");
  });

  it("playerExitSlotId always has the player_exit tag", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, RETURN_INPUT, "seed-a");
    const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.playerExitSlotId);
    expect(slot?.tags).toContain("player_exit");
  });

  it("monsterSpawnSlotId always has the monster_spawn tag", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, RETURN_INPUT, "seed-a");
    const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.monsterSpawnSlotId);
    expect(slot?.tags).toContain("monster_spawn");
  });
});

describe("resolveMiniGamePlacement — objective slot selection per item type", () => {
  it("battery mission only ever selects a slot tagged battery", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("battery"), seed);
      const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.objectiveSlotId);
      expect(slot?.tags).toContain("battery");
    }
  });

  it("bulb mission only ever selects a slot tagged bulb", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("bulb"), "bulb-seed");
    const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.objectiveSlotId);
    expect(slot?.tags).toContain("bulb");
  });

  it("fuse mission only ever selects a slot tagged fuse", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("fuse"), "fuse-seed");
    const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.objectiveSlotId);
    expect(slot?.tags).toContain("fuse");
  });

  it("shotgun mission only ever selects a slot tagged shotgun", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("shotgun"), "shotgun-seed");
    const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.objectiveSlotId);
    expect(slot?.tags).toContain("shotgun");
  });

  it("ammo mission only ever selects a slot tagged ammo", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("ammo"), "ammo-seed");
    const slot = SERVICE_FLOOR_STORAGE.slots.find((s) => s.id === placement.objectiveSlotId);
    expect(slot?.tags).toContain("ammo");
  });

  it("objective is undefined (no objectiveSlotId) for return_to_office", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, RETURN_INPUT, "seed-a");
    expect(placement.objectiveSlotId).toBeUndefined();
    expect(placement.objectivePosition).toBeUndefined();
  });

  it("throws a clear MiniGamePlacementError when the layout has no slot for the requested item", () => {
    // service_floor_alpha's single item slot carries every item tag, so build
    // a layout-shaped stand-in with no matching slot to exercise the error path.
    expect(() => resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("key"), "seed-a")).toThrow(MiniGamePlacementError);
  });
});

describe("resolveMiniGamePlacement — determinism", () => {
  it("the same seed always resolves to the same slots", () => {
    const first = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("battery"), "reproducible-run");
    const second = resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, collectInput("battery"), "reproducible-run");

    expect(second.playerStartSlotId).toBe(first.playerStartSlotId);
    expect(second.playerExitSlotId).toBe(first.playerExitSlotId);
    expect(second.monsterSpawnSlotId).toBe(first.monsterSpawnSlotId);
    expect(second.objectiveSlotId).toBe(first.objectiveSlotId);
  });

  it("a different seed can (not guaranteed every time, but observed here) resolve a different monster spawn slot", () => {
    const seeds = ["seed-1", "seed-2", "seed-3", "seed-4", "seed-5", "seed-6", "seed-7", "seed-8"];
    const spawnIds = new Set(seeds.map((seed) => resolveMiniGamePlacement(SERVICE_FLOOR_STORAGE, RETURN_INPUT, seed).monsterSpawnSlotId));
    expect(spawnIds.size).toBeGreaterThan(1);
  });

  it("service_floor_alpha (single slot per tag) resolves the same slot regardless of seed", () => {
    const a = resolveMiniGamePlacement(SERVICE_FLOOR_ALPHA, collectInput("battery"), "alpha-seed-1");
    const b = resolveMiniGamePlacement(SERVICE_FLOOR_ALPHA, collectInput("battery"), "alpha-seed-2");
    expect(a.playerStartSlotId).toBe(b.playerStartSlotId);
    expect(a.monsterSpawnSlotId).toBe(b.monsterSpawnSlotId);
    expect(a.objectiveSlotId).toBe(b.objectiveSlotId);
  });
});

describe("getRoomBoundsForSlot", () => {
  it("returns the bounds of the room containing the given slot", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_ALPHA, RETURN_INPUT, "seed-a");
    const bounds = getRoomBoundsForSlot(SERVICE_FLOOR_ALPHA, placement.playerExitSlotId);
    const room = SERVICE_FLOOR_ALPHA.rooms.find((r) => r.id === "office")!;
    expect(bounds).toEqual(room.bounds);
  });

  it("throws MiniGamePlacementError for an unknown slot id", () => {
    expect(() => getRoomBoundsForSlot(SERVICE_FLOOR_ALPHA, "does-not-exist")).toThrow(MiniGamePlacementError);
  });
});
