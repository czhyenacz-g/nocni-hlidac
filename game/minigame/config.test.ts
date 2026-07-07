import { describe, expect, it } from "vitest";
import { circleIntersectsAnyWall } from "./logic";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CONE_RANGE,
  ENEMY_RADIUS,
  ENEMY_VISION_RANGE,
  EXIT_ZONE,
  ITEM_RADIUS,
  ITEM_SPAWN_POSITION,
  MINIGAME_WORLD_SCALE,
  PLAYER_RADIUS,
  WALLS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createInitialEnemy,
  createInitialPlayer,
} from "./config";

// Měřítko světa / záběr mapy (viz components/minigame/EmergencyMiniGame.tsx#draw)
// — canvas panel na stránce zůstává CANVAS_WIDTH×CANVAS_HEIGHT, ale herní svět
// je větší (WORLD_WIDTH/HEIGHT) a vykresluje se zmenšený o MINIGAME_WORLD_SCALE.
// Testy tady ověřují jen "věci pořád dávají smysl", ne vizuální výstup (ten se
// netestuje přes prohlížeč, viz zadání).

describe("MINIGAME_WORLD_SCALE / WORLD_WIDTH / WORLD_HEIGHT", () => {
  it("MINIGAME_WORLD_SCALE is 0.8", () => {
    expect(MINIGAME_WORLD_SCALE).toBe(0.8);
  });

  it("the canvas panel size (CANVAS_WIDTH/HEIGHT) is unchanged", () => {
    expect(CANVAS_WIDTH).toBe(800);
    expect(CANVAS_HEIGHT).toBe(520);
  });

  it("the world is bigger than the canvas — more map fits in the same panel", () => {
    expect(WORLD_WIDTH).toBeGreaterThan(CANVAS_WIDTH);
    expect(WORLD_HEIGHT).toBeGreaterThan(CANVAS_HEIGHT);
  });

  it("the world, scaled down by MINIGAME_WORLD_SCALE, exactly fills the canvas (no gap/overflow)", () => {
    expect(WORLD_WIDTH * MINIGAME_WORLD_SCALE).toBeCloseTo(CANVAS_WIDTH, 0);
    expect(WORLD_HEIGHT * MINIGAME_WORLD_SCALE).toBeCloseTo(CANVAS_HEIGHT, 0);
  });
});

describe("createInitialPlayer / createInitialEnemy — valid positions in the new world", () => {
  it("the player does not start inside a wall", () => {
    const player = createInitialPlayer(1);
    expect(circleIntersectsAnyWall(player.x, player.y, player.radius, WALLS)).toBe(false);
  });

  it("the player starts within world bounds", () => {
    const player = createInitialPlayer(1);
    expect(player.x).toBeGreaterThanOrEqual(0);
    expect(player.x).toBeLessThanOrEqual(WORLD_WIDTH);
    expect(player.y).toBeGreaterThanOrEqual(0);
    expect(player.y).toBeLessThanOrEqual(WORLD_HEIGHT);
  });

  it("the enemy does not start inside a wall", () => {
    const player = createInitialPlayer(1);
    const enemy = createInitialEnemy(player);
    expect(circleIntersectsAnyWall(enemy.x, enemy.y, enemy.radius, WALLS)).toBe(false);
  });

  it("the enemy starts within world bounds", () => {
    const player = createInitialPlayer(1);
    const enemy = createInitialEnemy(player);
    expect(enemy.x).toBeGreaterThanOrEqual(0);
    expect(enemy.x).toBeLessThanOrEqual(WORLD_WIDTH);
    expect(enemy.y).toBeGreaterThanOrEqual(0);
    expect(enemy.y).toBeLessThanOrEqual(WORLD_HEIGHT);
  });
});

describe("objective zones — still reachable/valid after the rescale", () => {
  it("EXIT_ZONE is not fully overlapped by any wall (still reachable)", () => {
    const centerX = EXIT_ZONE.x + EXIT_ZONE.width / 2;
    const centerY = EXIT_ZONE.y + EXIT_ZONE.height / 2;
    expect(circleIntersectsAnyWall(centerX, centerY, 1, WALLS)).toBe(false);
  });

  it("EXIT_ZONE lies within world bounds", () => {
    expect(EXIT_ZONE.x).toBeGreaterThanOrEqual(0);
    expect(EXIT_ZONE.y).toBeGreaterThanOrEqual(0);
    expect(EXIT_ZONE.x + EXIT_ZONE.width).toBeLessThanOrEqual(WORLD_WIDTH);
    expect(EXIT_ZONE.y + EXIT_ZONE.height).toBeLessThanOrEqual(WORLD_HEIGHT);
  });

  it("ITEM_SPAWN_POSITION is not inside a wall", () => {
    expect(circleIntersectsAnyWall(ITEM_SPAWN_POSITION.x, ITEM_SPAWN_POSITION.y, ITEM_RADIUS, WALLS)).toBe(false);
  });

  it("ITEM_SPAWN_POSITION lies within world bounds", () => {
    expect(ITEM_SPAWN_POSITION.x).toBeGreaterThanOrEqual(0);
    expect(ITEM_SPAWN_POSITION.x).toBeLessThanOrEqual(WORLD_WIDTH);
    expect(ITEM_SPAWN_POSITION.y).toBeGreaterThanOrEqual(0);
    expect(ITEM_SPAWN_POSITION.y).toBeLessThanOrEqual(WORLD_HEIGHT);
  });
});

describe("ranges stay valid positive numbers after the rescale", () => {
  it("CONE_RANGE (shotgun/player vision) is a positive number", () => {
    expect(CONE_RANGE).toBeGreaterThan(0);
  });

  it("ENEMY_VISION_RANGE is a positive number", () => {
    expect(ENEMY_VISION_RANGE).toBeGreaterThan(0);
  });

  it("PLAYER_RADIUS / ENEMY_RADIUS are positive numbers", () => {
    expect(PLAYER_RADIUS).toBeGreaterThan(0);
    expect(ENEMY_RADIUS).toBeGreaterThan(0);
  });
});

describe("restart still produces a valid, non-colliding initial state", () => {
  it("repeated createInitialPlayer/createInitialEnemy calls (simulating R restart) never start inside a wall", () => {
    for (let i = 0; i < 5; i++) {
      const player = createInitialPlayer(1);
      const enemy = createInitialEnemy(player);
      expect(circleIntersectsAnyWall(player.x, player.y, player.radius, WALLS)).toBe(false);
      expect(circleIntersectsAnyWall(enemy.x, enemy.y, enemy.radius, WALLS)).toBe(false);
    }
  });
});
