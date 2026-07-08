import { describe, expect, it } from "vitest";
import { getMiniGameSlotDebugLabel, getRoomAtPoint, getSelectedSlotIds, isMiniGameDevToggleHit } from "./devOverlay";
import { MiniGameLayout, MiniGameLayoutSlot } from "./layoutTypes";
import { ResolvedMiniGamePlacement } from "./layoutPlacement";

describe("isMiniGameDevToggleHit — hidden Shift + right-click toggle in the top-right corner", () => {
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 520;

  it("Shift + right-click inside the top-right hot zone returns true", () => {
    const hit = isMiniGameDevToggleHit({
      x: CANVAS_WIDTH - 10,
      y: 10,
      button: 2,
      shiftKey: true,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
    });
    expect(hit).toBe(true);
  });

  it("right-click without Shift returns false", () => {
    const hit = isMiniGameDevToggleHit({
      x: CANVAS_WIDTH - 10,
      y: 10,
      button: 2,
      shiftKey: false,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
    });
    expect(hit).toBe(false);
  });

  it("left-click (even with Shift, even inside the corner) returns false", () => {
    const hit = isMiniGameDevToggleHit({
      x: CANVAS_WIDTH - 10,
      y: 10,
      button: 0,
      shiftKey: true,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
    });
    expect(hit).toBe(false);
  });

  it("Shift + right-click outside the corner (e.g. center of the canvas) returns false", () => {
    const hit = isMiniGameDevToggleHit({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      button: 2,
      shiftKey: true,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
    });
    expect(hit).toBe(false);
  });

  it("Shift + right-click just outside the hot zone boundary returns false", () => {
    const hit = isMiniGameDevToggleHit(
      { x: CANVAS_WIDTH - 49, y: 10, button: 2, shiftKey: true, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT },
      { hotZoneSizePx: 48 },
    );
    expect(hit).toBe(false);
  });

  it("respects a custom hot zone size", () => {
    const hit = isMiniGameDevToggleHit(
      { x: CANVAS_WIDTH - 5, y: 5, button: 2, shiftKey: true, canvasWidth: CANVAS_WIDTH, canvasHeight: CANVAS_HEIGHT },
      { hotZoneSizePx: 10 },
    );
    expect(hit).toBe(true);
  });

  it("Shift + right-click in the bottom-right corner (not top-right) returns false", () => {
    const hit = isMiniGameDevToggleHit({
      x: CANVAS_WIDTH - 10,
      y: CANVAS_HEIGHT - 10,
      button: 2,
      shiftKey: true,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
    });
    expect(hit).toBe(false);
  });
});

describe("getMiniGameSlotDebugLabel — one letter per tag, priority order for multi-tag slots", () => {
  function slot(tags: MiniGameLayoutSlot["tags"]): Pick<MiniGameLayoutSlot, "tags"> {
    return { tags };
  }

  it("battery -> B", () => {
    expect(getMiniGameSlotDebugLabel(slot(["battery"]))).toBe("B");
  });

  it("monster_spawn -> M", () => {
    expect(getMiniGameSlotDebugLabel(slot(["monster_spawn"]))).toBe("M");
  });

  it("player_start -> S", () => {
    expect(getMiniGameSlotDebugLabel(slot(["player_start"]))).toBe("S");
  });

  it("player_exit -> E", () => {
    expect(getMiniGameSlotDebugLabel(slot(["player_exit"]))).toBe("E");
  });

  it("bulb -> L, fuse -> F, shotgun -> G, ammo -> A, key -> K, toolbox -> T, generic_loot -> ?", () => {
    expect(getMiniGameSlotDebugLabel(slot(["bulb"]))).toBe("L");
    expect(getMiniGameSlotDebugLabel(slot(["fuse"]))).toBe("F");
    expect(getMiniGameSlotDebugLabel(slot(["shotgun"]))).toBe("G");
    expect(getMiniGameSlotDebugLabel(slot(["ammo"]))).toBe("A");
    expect(getMiniGameSlotDebugLabel(slot(["key"]))).toBe("K");
    expect(getMiniGameSlotDebugLabel(slot(["toolbox"]))).toBe("T");
    expect(getMiniGameSlotDebugLabel(slot(["generic_loot"]))).toBe("?");
  });

  it("a slot with multiple tags uses the highest-priority one (player_start beats battery)", () => {
    expect(getMiniGameSlotDebugLabel(slot(["battery", "player_start"]))).toBe("S");
  });

  it("a slot with multiple item tags uses the earliest one in priority order (battery beats bulb)", () => {
    expect(getMiniGameSlotDebugLabel(slot(["bulb", "battery"]))).toBe("B");
  });

  it("monster_spawn beats any item tag", () => {
    expect(getMiniGameSlotDebugLabel(slot(["shotgun", "monster_spawn"]))).toBe("M");
  });
});

describe("getSelectedSlotIds", () => {
  function placement(overrides: Partial<ResolvedMiniGamePlacement> = {}): ResolvedMiniGamePlacement {
    return {
      layout: {} as MiniGameLayout,
      seed: "seed",
      playerStartSlotId: "start_01",
      playerExitSlotId: "exit_01",
      monsterSpawnSlotId: "spawn_01",
      playerStart: { x: 0, y: 0 },
      playerExit: { x: 0, y: 0 },
      monsterSpawn: { x: 0, y: 0 },
      ...overrides,
    };
  }

  it("includes start/exit/monster spawn slot ids", () => {
    const ids = getSelectedSlotIds(placement());
    expect(ids.has("start_01")).toBe(true);
    expect(ids.has("exit_01")).toBe(true);
    expect(ids.has("spawn_01")).toBe(true);
  });

  it("includes the objective slot id when present", () => {
    const ids = getSelectedSlotIds(placement({ objectiveSlotId: "battery_01" }));
    expect(ids.has("battery_01")).toBe(true);
    expect(ids.size).toBe(4);
  });

  it("has exactly 3 entries when there is no objective slot (e.g. return_to_office)", () => {
    const ids = getSelectedSlotIds(placement());
    expect(ids.size).toBe(3);
  });

  it("does not include an unrelated slot id", () => {
    const ids = getSelectedSlotIds(placement({ objectiveSlotId: "battery_01" }));
    expect(ids.has("some_other_slot")).toBe(false);
  });
});

describe("getRoomAtPoint", () => {
  const layout: MiniGameLayout = {
    id: "test",
    name: "Test",
    world: { width: 200, height: 100 },
    rooms: [
      { id: "office", name: "Office", kind: "office", bounds: { x: 0, y: 0, width: 100, height: 100 } },
      { id: "storage", name: "Storage", kind: "storage", bounds: { x: 100, y: 0, width: 100, height: 100 } },
    ],
    walls: [],
    slots: [],
  };

  it("finds the room whose bounds contain the point", () => {
    expect(getRoomAtPoint(layout, { x: 50, y: 50 })?.id).toBe("office");
    expect(getRoomAtPoint(layout, { x: 150, y: 50 })?.id).toBe("storage");
  });

  it("returns null for a point outside every room", () => {
    expect(getRoomAtPoint(layout, { x: 500, y: 500 })).toBeNull();
  });

  it("treats room bounds edges as inclusive", () => {
    expect(getRoomAtPoint(layout, { x: 100, y: 0 })?.id).toBe("office");
  });
});
