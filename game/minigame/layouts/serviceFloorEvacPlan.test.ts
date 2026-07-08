import { describe, expect, it } from "vitest";
import { validateMiniGameLayout } from "../layoutValidation";
import { resolveMiniGamePlacement } from "../layoutPlacement";
import { SERVICE_FLOOR_EVAC_PLAN } from "./serviceFloorEvacPlan";
import { MiniGameItemId } from "../types";

describe("service_floor_evac_plan — validity", () => {
  it("passes validateMiniGameLayout", () => {
    expect(validateMiniGameLayout(SERVICE_FLOOR_EVAC_PLAN)).toEqual({ ok: true, errors: [] });
  });

  it("has at least one player_start slot", () => {
    expect(SERVICE_FLOOR_EVAC_PLAN.slots.some((slot) => slot.tags.includes("player_start"))).toBe(true);
  });

  it("has at least one player_exit slot", () => {
    expect(SERVICE_FLOOR_EVAC_PLAN.slots.some((slot) => slot.tags.includes("player_exit"))).toBe(true);
  });

  it("has at least 3 monster_spawn slots", () => {
    const spawnSlots = SERVICE_FLOOR_EVAC_PLAN.slots.filter((slot) => slot.tags.includes("monster_spawn"));
    expect(spawnSlots.length).toBeGreaterThanOrEqual(3);
  });

  it("has battery/bulb/fuse/shotgun/ammo/toolbox slots", () => {
    const requiredTags: MiniGameItemId[] = ["battery", "bulb", "fuse", "shotgun", "ammo", "toolbox"];
    for (const tag of requiredTags) {
      expect(SERVICE_FLOOR_EVAC_PLAN.slots.some((slot) => slot.tags.includes(tag)), `missing a slot tagged "${tag}"`).toBe(true);
    }
  });

  it("every slot has a valid roomId", () => {
    const roomIds = new Set(SERVICE_FLOOR_EVAC_PLAN.rooms.map((room) => room.id));
    for (const slot of SERVICE_FLOOR_EVAC_PLAN.slots) {
      expect(roomIds.has(slot.roomId), `slot "${slot.id}" references unknown roomId "${slot.roomId}"`).toBe(true);
    }
  });

  it("no slot lies outside world bounds", () => {
    const { width, height } = SERVICE_FLOOR_EVAC_PLAN.world;
    for (const slot of SERVICE_FLOOR_EVAC_PLAN.slots) {
      expect(slot.x, `slot "${slot.id}" x out of bounds`).toBeGreaterThanOrEqual(0);
      expect(slot.x, `slot "${slot.id}" x out of bounds`).toBeLessThanOrEqual(width);
      expect(slot.y, `slot "${slot.id}" y out of bounds`).toBeGreaterThanOrEqual(0);
      expect(slot.y, `slot "${slot.id}" y out of bounds`).toBeLessThanOrEqual(height);
    }
  });

  it("no slot lies inside a wall/obstacle", () => {
    function pointInWall(px: number, py: number, wall: (typeof SERVICE_FLOOR_EVAC_PLAN.walls)[number]): boolean {
      return px >= wall.x && px <= wall.x + wall.width && py >= wall.y && py <= wall.y + wall.height;
    }
    for (const slot of SERVICE_FLOOR_EVAC_PLAN.slots) {
      const collidingWall = SERVICE_FLOOR_EVAC_PLAN.walls.find((wall) => pointInWall(slot.x, slot.y, wall));
      expect(collidingWall, `slot "${slot.id}" lies inside wall "${collidingWall?.id}"`).toBeUndefined();
    }
  });

  it("is noticeably bigger/more complex than service_floor_storage (more rooms, bigger world)", () => {
    expect(SERVICE_FLOOR_EVAC_PLAN.rooms.length).toBeGreaterThanOrEqual(10);
    expect(SERVICE_FLOOR_EVAC_PLAN.world.width * SERVICE_FLOOR_EVAC_PLAN.world.height).toBeGreaterThan(1400 * 900);
  });

  it("has at least 3 chokepoint doorways (paired wall segments narrower than the room border)", () => {
    // Rough proxy: count wall ids that come in "_1"/"_2" pairs (door gap segments) — walls_a/c/d/e/g/h/k/m/n/o = 10 pairs.
    const doorPairIds = SERVICE_FLOOR_EVAC_PLAN.walls.filter((wall) => /^wall_[a-z]\d$/.test(wall.id));
    expect(doorPairIds.length).toBeGreaterThanOrEqual(6); // >= 3 chokepoints, each made of 2 segments
  });
});

describe("service_floor_evac_plan — mission slot selection", () => {
  it("battery mission selects a battery slot from this layout", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_EVAC_PLAN, { objective: "collect_item", itemToCollect: "battery" }, "evac-battery-1");
    const slot = SERVICE_FLOOR_EVAC_PLAN.slots.find((s) => s.id === placement.objectiveSlotId);
    expect(slot?.tags).toContain("battery");
  });

  it("bulb mission selects a bulb slot from this layout", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_EVAC_PLAN, { objective: "collect_item", itemToCollect: "bulb" }, "evac-bulb-1");
    const slot = SERVICE_FLOOR_EVAC_PLAN.slots.find((s) => s.id === placement.objectiveSlotId);
    expect(slot?.tags).toContain("bulb");
  });

  it("fuse mission selects a fuse slot from this layout", () => {
    const placement = resolveMiniGamePlacement(SERVICE_FLOOR_EVAC_PLAN, { objective: "collect_item", itemToCollect: "fuse" }, "evac-fuse-1");
    const slot = SERVICE_FLOOR_EVAC_PLAN.slots.find((s) => s.id === placement.objectiveSlotId);
    expect(slot?.tags).toContain("fuse");
  });

  it("the same seed selects the same slots", () => {
    const first = resolveMiniGamePlacement(SERVICE_FLOOR_EVAC_PLAN, { objective: "collect_item", itemToCollect: "battery" }, "evac-repeat");
    const second = resolveMiniGamePlacement(SERVICE_FLOOR_EVAC_PLAN, { objective: "collect_item", itemToCollect: "battery" }, "evac-repeat");
    expect(second.playerStartSlotId).toBe(first.playerStartSlotId);
    expect(second.playerExitSlotId).toBe(first.playerExitSlotId);
    expect(second.monsterSpawnSlotId).toBe(first.monsterSpawnSlotId);
    expect(second.objectiveSlotId).toBe(first.objectiveSlotId);
  });
});
