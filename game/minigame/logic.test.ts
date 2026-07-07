import { describe, expect, it } from "vitest";
import {
  circleIntersectsAnyWall,
  circleIntersectsWall,
  circlesTouch,
  directionFromVector,
  distance,
  isEnemyHit,
  isTargetInCone,
  moveWithWallSliding,
} from "./logic";
import { Wall } from "./types";

describe("distance", () => {
  it("computes straight-line distance", () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });
});

describe("circleIntersectsWall / circleIntersectsAnyWall", () => {
  const wall: Wall = { x: 100, y: 100, width: 50, height: 50 };

  it("detects a circle overlapping a wall", () => {
    expect(circleIntersectsWall(90, 120, 15, wall)).toBe(true);
  });

  it("does not flag a circle far from the wall", () => {
    expect(circleIntersectsWall(0, 0, 15, wall)).toBe(false);
  });

  it("a circle just touching the wall edge is not yet an intersection (strict <)", () => {
    expect(circleIntersectsWall(85, 120, 15, wall)).toBe(false);
  });

  it("circleIntersectsAnyWall is true if any wall in the list collides", () => {
    const walls: Wall[] = [wall, { x: 400, y: 400, width: 20, height: 20 }];
    expect(circleIntersectsAnyWall(90, 120, 15, walls)).toBe(true);
    expect(circleIntersectsAnyWall(0, 0, 15, walls)).toBe(false);
  });
});

describe("directionFromVector", () => {
  it("snaps clearly-dominant-axis vectors to the nearest cardinal direction", () => {
    expect(directionFromVector(5, 1, "up")).toBe("right");
    expect(directionFromVector(-5, 1, "up")).toBe("left");
    expect(directionFromVector(1, 5, "left")).toBe("down");
    expect(directionFromVector(1, -5, "left")).toBe("up");
  });

  it("resolves equal-magnitude diagonal vectors to the 4 diagonal directions", () => {
    expect(directionFromVector(1, 1, "up")).toBe("down-right");
    expect(directionFromVector(-1, 1, "up")).toBe("down-left");
    expect(directionFromVector(1, -1, "up")).toBe("up-right");
    expect(directionFromVector(-1, -1, "up")).toBe("up-left");
  });

  it("keeps the previous direction when standing still", () => {
    expect(directionFromVector(0, 0, "left")).toBe("left");
  });
});

describe("isTargetInCone", () => {
  const base = { originX: 0, originY: 0, coneAngleRad: (70 * Math.PI) / 180, range: 150, targetRadius: 14 };

  it("is true for a target directly ahead, in range", () => {
    expect(isTargetInCone({ ...base, direction: "up", targetX: 0, targetY: -100 })).toBe(true);
  });

  it("also works facing a diagonal direction", () => {
    expect(isTargetInCone({ ...base, direction: "down-right", targetX: 70, targetY: 70 })).toBe(true);
    expect(isTargetInCone({ ...base, direction: "down-right", targetX: -70, targetY: -70 })).toBe(false);
  });

  it("is false for a target beyond range", () => {
    expect(isTargetInCone({ ...base, direction: "up", targetX: 0, targetY: -300 })).toBe(false);
  });

  it("is false for a target behind the player (outside the cone angle)", () => {
    expect(isTargetInCone({ ...base, direction: "up", targetX: 0, targetY: 100 })).toBe(false);
  });

  it("is false for a target off to the side, outside the cone angle", () => {
    expect(isTargetInCone({ ...base, direction: "up", targetX: 120, targetY: -20 })).toBe(false);
  });
});

describe("isEnemyHit", () => {
  const coneAngleRad = (70 * Math.PI) / 180;
  const range = 150;
  const player = { x: 0, y: 0, direction: "up" as const };

  it("hits an alive enemy in range and in the cone", () => {
    const enemy = { x: 0, y: -100, radius: 14, alive: true };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range })).toBe(true);
  });

  it("misses an enemy outside the cone", () => {
    const enemy = { x: 120, y: -20, radius: 14, alive: true };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range })).toBe(false);
  });

  it("misses an enemy outside range even if directly ahead", () => {
    const enemy = { x: 0, y: -300, radius: 14, alive: true };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range })).toBe(false);
  });

  it("never hits an already-dead enemy, even if geometrically in the cone", () => {
    const enemy = { x: 0, y: -100, radius: 14, alive: false };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range })).toBe(false);
  });
});

describe("moveWithWallSliding", () => {
  const walls: Wall[] = [{ x: 100, y: 0, width: 20, height: 200 }];
  const mapWidth = 800;
  const mapHeight = 520;
  const radius = 14;

  it("moves freely when there is no collision", () => {
    const result = moveWithWallSliding(50, 50, 10, 5, radius, walls, mapWidth, mapHeight);
    expect(result).toEqual({ x: 60, y: 55 });
  });

  it("blocks the X axis when it would collide with a wall, but still allows Y", () => {
    // Starting well clear of the wall, attempting to move right into it and down.
    const result = moveWithWallSliding(70, 50, 40, 5, radius, walls, mapWidth, mapHeight);
    expect(result.x).toBe(70); // blocked, stayed in place on X
    expect(result.y).toBe(55); // Y movement still applied (checked against the reverted X, which doesn't collide)
  });

  it("clamps position to stay inside the map bounds", () => {
    const result = moveWithWallSliding(5, 5, -10, -10, radius, [], mapWidth, mapHeight);
    expect(result.x).toBe(radius);
    expect(result.y).toBe(radius);
  });
});

describe("circlesTouch", () => {
  it("is true when circles overlap or touch exactly", () => {
    expect(circlesTouch(0, 0, 14, 28, 0, 14)).toBe(true);
  });

  it("is false when circles are far apart", () => {
    expect(circlesTouch(0, 0, 14, 100, 0, 14)).toBe(false);
  });
});
