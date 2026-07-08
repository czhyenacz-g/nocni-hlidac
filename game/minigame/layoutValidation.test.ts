import { describe, expect, it } from "vitest";
import { validateMiniGameLayout } from "./layoutValidation";
import { MINIGAME_LAYOUTS } from "./layouts";
import { SERVICE_FLOOR_ALPHA } from "./layouts/serviceFloorAlpha";
import { SERVICE_FLOOR_STORAGE } from "./layouts/serviceFloorStorage";
import { MiniGameLayout } from "./layoutTypes";

function baseLayout(overrides: Partial<MiniGameLayout> = {}): MiniGameLayout {
  return {
    id: "test_layout",
    name: "Test Layout",
    world: { width: 100, height: 100 },
    rooms: [{ id: "room_a", name: "Room A", kind: "office", bounds: { x: 0, y: 0, width: 100, height: 100 } }],
    walls: [],
    slots: [
      { id: "start", roomId: "room_a", x: 10, y: 10, tags: ["player_start"] },
      { id: "exit", roomId: "room_a", x: 20, y: 20, tags: ["player_exit"] },
      { id: "spawn", roomId: "room_a", x: 30, y: 30, tags: ["monster_spawn"] },
    ],
    ...overrides,
  };
}

describe("validateMiniGameLayout — real layouts in the registry", () => {
  it("accepts service_floor_alpha", () => {
    expect(validateMiniGameLayout(SERVICE_FLOOR_ALPHA)).toEqual({ ok: true, errors: [] });
  });

  it("accepts service_floor_storage", () => {
    expect(validateMiniGameLayout(SERVICE_FLOOR_STORAGE)).toEqual({ ok: true, errors: [] });
  });

  it("every layout registered in MINIGAME_LAYOUTS passes validation", () => {
    for (const layout of MINIGAME_LAYOUTS) {
      const result = validateMiniGameLayout(layout);
      expect(result.ok, `${layout.id}: ${result.errors.join(", ")}`).toBe(true);
    }
  });
});

describe("validateMiniGameLayout — structural checks", () => {
  it("accepts a minimal valid layout", () => {
    expect(validateMiniGameLayout(baseLayout()).ok).toBe(true);
  });

  it("rejects a layout with no player_start slot", () => {
    const layout = baseLayout({ slots: baseLayout().slots.filter((slot) => !slot.tags.includes("player_start")) });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("layout has no player_start slot");
  });

  it("rejects a layout with no player_exit slot", () => {
    const layout = baseLayout({ slots: baseLayout().slots.filter((slot) => !slot.tags.includes("player_exit")) });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("layout has no player_exit slot");
  });

  it("rejects a layout with no monster_spawn slot", () => {
    const layout = baseLayout({ slots: baseLayout().slots.filter((slot) => !slot.tags.includes("monster_spawn")) });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("layout has no monster_spawn slot");
  });

  it("rejects duplicate room ids", () => {
    const layout = baseLayout({
      rooms: [
        { id: "room_a", name: "Room A", kind: "office", bounds: { x: 0, y: 0, width: 50, height: 100 } },
        { id: "room_a", name: "Room A dup", kind: "office", bounds: { x: 50, y: 0, width: 50, height: 100 } },
      ],
    });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("duplicate room id"))).toBe(true);
  });

  it("rejects duplicate wall ids", () => {
    const layout = baseLayout({
      walls: [
        { id: "wall_1", x: 0, y: 0, width: 10, height: 10 },
        { id: "wall_1", x: 20, y: 20, width: 10, height: 10 },
      ],
    });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("duplicate wall id"))).toBe(true);
  });

  it("rejects duplicate slot ids", () => {
    const layout = baseLayout({
      slots: [...baseLayout().slots, { id: "start", roomId: "room_a", x: 40, y: 40, tags: ["battery"] }],
    });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("duplicate slot id"))).toBe(true);
  });

  it("rejects a slot referencing an unknown roomId", () => {
    const layout = baseLayout({
      slots: [...baseLayout().slots, { id: "orphan", roomId: "does_not_exist", x: 5, y: 5, tags: ["battery"] }],
    });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('unknown roomId "does_not_exist"'))).toBe(true);
  });

  it("rejects a slot lying outside world bounds", () => {
    const layout = baseLayout({
      slots: [...baseLayout().slots, { id: "outside", roomId: "room_a", x: 200, y: 5, tags: ["battery"] }],
    });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('slot "outside" lies outside world bounds'))).toBe(true);
  });

  it("rejects a wall lying outside world bounds", () => {
    const layout = baseLayout({ walls: [{ id: "wall_1", x: 90, y: 0, width: 50, height: 10 }] });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('wall "wall_1" lies outside world bounds'))).toBe(true);
  });

  it("rejects a slot lying inside a wall/obstacle", () => {
    const layout = baseLayout({
      walls: [{ id: "wall_1", x: 0, y: 0, width: 15, height: 15 }],
      slots: [
        { id: "start", roomId: "room_a", x: 10, y: 10, tags: ["player_start"] },
        { id: "exit", roomId: "room_a", x: 20, y: 20, tags: ["player_exit"] },
        { id: "spawn", roomId: "room_a", x: 30, y: 30, tags: ["monster_spawn"] },
      ],
    });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('slot "start" lies inside wall/obstacle "wall_1"'))).toBe(true);
  });

  it("rejects a layout with non-positive world dimensions", () => {
    const layout = baseLayout({ world: { width: 0, height: -10 } });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("layout.world.width must be > 0");
    expect(result.errors).toContain("layout.world.height must be > 0");
  });

  it("rejects a layout missing id/name", () => {
    const layout = baseLayout({ id: "", name: "" });
    const result = validateMiniGameLayout(layout);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("layout.id is missing");
    expect(result.errors).toContain("layout.name is missing");
  });
});
