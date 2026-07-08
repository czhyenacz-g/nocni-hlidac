import { describe, expect, it } from "vitest";
import {
  angleBetween,
  applyShot,
  canEnemySeePlayer,
  canFireWeapon,
  castVisionCone,
  circleIntersectsAnyWall,
  circleIntersectsWall,
  circlesTouch,
  canReturnToOffice,
  completeObjective,
  createDeadResult,
  createFailedResult,
  createInitialMissionState,
  createInvestigationTarget,
  createReturnedResult,
  createWeaponHudLabel,
  createWorldEffectsForCompletedObjective,
  directionFromVector,
  distance,
  hasLineOfSight,
  isEnemyHit,
  isPointInCone,
  isTargetInCone,
  lineIntersectsRect,
  moveWithWallSliding,
  resolveEquipmentFromInput,
  tickEnemyStun,
  updateEnemyAi,
  updateMissionPhase,
  EnemyAiConfig,
} from "./logic";
import { createInitialPlayer } from "./config";
import { Enemy, Wall } from "./types";

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
    expect(isEnemyHit({ player, enemy, coneAngleRad, range, walls: [] })).toBe(true);
  });

  it("misses an enemy outside the cone", () => {
    const enemy = { x: 120, y: -20, radius: 14, alive: true };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range, walls: [] })).toBe(false);
  });

  it("misses an enemy outside range even if directly ahead", () => {
    const enemy = { x: 0, y: -300, radius: 14, alive: true };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range, walls: [] })).toBe(false);
  });

  it("never hits an already-dead enemy, even if geometrically in the cone", () => {
    const enemy = { x: 0, y: -100, radius: 14, alive: false };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range, walls: [] })).toBe(false);
  });

  // Zdi musí blokovat hráčovu brokovnici stejně jako blokují nepřítelovo
  // vidění (canEnemySeePlayer) — sdílený hasLineOfSight helper, viz logic.ts.
  it("hits an enemy in cone and range with a clear line of sight", () => {
    const enemy = { x: 0, y: -100, radius: 14, alive: true };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range, walls: [] })).toBe(true);
  });

  it("does NOT hit an enemy in cone and range but hidden behind a wall", () => {
    const enemy = { x: 0, y: -100, radius: 14, alive: true };
    const wall: Wall = { x: -20, y: -60, width: 40, height: 10 };
    expect(isEnemyHit({ player, enemy, coneAngleRad, range, walls: [wall] })).toBe(false);
  });

  it("uses hasLineOfSight for the wall check (consistent with canEnemySeePlayer)", () => {
    const enemy = { x: 0, y: -100, radius: 14, alive: true };
    const wall: Wall = { x: -20, y: -60, width: 40, height: 10 };
    expect(hasLineOfSight(player.x, player.y, enemy.x, enemy.y, [wall])).toBe(false);
    expect(isEnemyHit({ player, enemy, coneAngleRad, range, walls: [wall] })).toBe(false);
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

describe("tickEnemyStun", () => {
  it("counts down by deltaMs", () => {
    expect(tickEnemyStun(10_000, 1000)).toBe(9000);
  });

  it("never goes below 0", () => {
    expect(tickEnemyStun(500, 1000)).toBe(0);
  });

  it("after enough ticks (10s total), the stun reaches exactly 0", () => {
    let remaining = 10_000;
    for (let i = 0; i < 100; i++) {
      remaining = tickEnemyStun(remaining, 100);
    }
    expect(remaining).toBe(0);
  });
});

describe("angleBetween", () => {
  it("points right for a point directly to the right", () => {
    expect(angleBetween(0, 0, 10, 0)).toBeCloseTo(0, 5);
  });

  it("points down (+PI/2) for a point directly below (canvas Y grows down)", () => {
    expect(angleBetween(0, 0, 0, 10)).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe("isPointInCone", () => {
  const coneAngleRad = (60 * Math.PI) / 180;
  const range = 220;

  it("is true for a point directly ahead, in range", () => {
    expect(isPointInCone(0, -100, 0, 0, -Math.PI / 2, coneAngleRad, range)).toBe(true);
  });

  it("is false beyond range", () => {
    expect(isPointInCone(0, -300, 0, 0, -Math.PI / 2, coneAngleRad, range)).toBe(false);
  });

  it("is false outside the cone angle", () => {
    expect(isPointInCone(0, 100, 0, 0, -Math.PI / 2, coneAngleRad, range)).toBe(false);
  });
});

describe("lineIntersectsRect / hasLineOfSight", () => {
  const wall: Wall = { x: 90, y: -10, width: 20, height: 220 };

  it("lineIntersectsRect is true when the segment passes through the rect", () => {
    expect(lineIntersectsRect(0, 0, 200, 0, wall)).toBe(true);
  });

  it("lineIntersectsRect is false when the segment does not reach the rect", () => {
    expect(lineIntersectsRect(0, 0, 50, 0, wall)).toBe(false);
  });

  it("hasLineOfSight is false when a wall is between the two points", () => {
    expect(hasLineOfSight(0, 0, 200, 0, [wall])).toBe(false);
  });

  it("hasLineOfSight is true with no obstructing wall", () => {
    expect(hasLineOfSight(0, 0, 50, 0, [wall])).toBe(true);
    expect(hasLineOfSight(0, 0, 200, 0, [])).toBe(true);
  });
});

describe("canEnemySeePlayer", () => {
  const base = { enemyX: 0, enemyY: 0, visionAngle: 0, visionAngleRad: (60 * Math.PI) / 180, visionRange: 220 };

  it("sees the player when in cone, in range, and unobstructed", () => {
    expect(canEnemySeePlayer({ ...base, playerX: 100, playerY: 0, walls: [] })).toBe(true);
  });

  it("does not see the player behind a wall, even though geometrically in the cone", () => {
    const wall: Wall = { x: 40, y: -50, width: 20, height: 100 };
    expect(canEnemySeePlayer({ ...base, playerX: 100, playerY: 0, walls: [wall] })).toBe(false);
  });

  it("does not see the player outside the cone angle", () => {
    expect(canEnemySeePlayer({ ...base, playerX: 0, playerY: 100, walls: [] })).toBe(false);
  });
});

describe("createInvestigationTarget", () => {
  const baseOptions = {
    playerX: 400,
    playerY: 300,
    distanceToPlayer: 100,
    noiseCloseRangePx: 60,
    noiseFarPx: 140,
    closeDistanceThresholdPx: 200,
    enemyRadius: 14,
    walls: [] as Wall[],
    mapWidth: 800,
    mapHeight: 520,
    maxAttempts: 8,
  };

  it("creates a point near the player, not exactly on the player", () => {
    const rng = () => 0.75; // deterministic: always the same offset
    const target = createInvestigationTarget({ ...baseOptions, rng });
    expect(target.x === baseOptions.playerX && target.y === baseOptions.playerY).toBe(false);
    expect(distance(target.x, target.y, baseOptions.playerX, baseOptions.playerY)).toBeLessThanOrEqual(60 * Math.SQRT2);
  });

  it("uses a smaller noise radius when close, larger when far", () => {
    const rng = () => 1; // maximum offset in both axes
    const closeTarget = createInvestigationTarget({ ...baseOptions, distanceToPlayer: 50, rng });
    const farTarget = createInvestigationTarget({ ...baseOptions, distanceToPlayer: 500, rng });
    const closeDist = distance(closeTarget.x, closeTarget.y, baseOptions.playerX, baseOptions.playerY);
    const farDist = distance(farTarget.x, farTarget.y, baseOptions.playerX, baseOptions.playerY);
    expect(farDist).toBeGreaterThan(closeDist);
  });

  it("avoids landing inside a wall, retrying until a free spot is found", () => {
    // A wall covering the entire noise radius around the player except far to the right.
    const wall: Wall = { x: 0, y: 0, width: 800, height: 520 };
    // rng sequence: first attempts land in the wall-covered map, but since the
    // whole map is a wall here, it must fall back to the clamped player position
    // rather than loop forever or return undefined.
    const target = createInvestigationTarget({ ...baseOptions, walls: [wall], maxAttempts: 3, rng: () => 0.5 });
    expect(target).toBeDefined();
  });
});

describe("castVisionCone", () => {
  it("returns rayCount points, at max range when unobstructed", () => {
    const points = castVisionCone({
      originX: 0,
      originY: 0,
      facingAngle: 0,
      coneAngleRad: Math.PI / 2,
      range: 100,
      walls: [],
      rayCount: 5,
      stepPx: 10,
    });
    expect(points).toHaveLength(5);
    for (const point of points) {
      expect(distance(0, 0, point.x, point.y)).toBeCloseTo(100, 0);
    }
  });

  it("stops rays early when a wall blocks them", () => {
    const wall: Wall = { x: 40, y: -50, width: 10, height: 100 };
    const points = castVisionCone({
      originX: 0,
      originY: 0,
      facingAngle: 0,
      coneAngleRad: 0.1,
      range: 100,
      walls: [wall],
      rayCount: 1,
      stepPx: 2,
    });
    expect(points).toHaveLength(1);
    expect(distance(0, 0, points[0].x, points[0].y)).toBeLessThan(100);
  });
});

describe("updateEnemyAi", () => {
  const config: EnemyAiConfig = {
    searchSpeed: 1.4,
    chaseSpeed: 1.6,
    aggroSpeedMultiplier: 1.5,
    aggroRange: 150,
    visionRange: 220,
    visionAngleRad: (60 * Math.PI) / 180,
    waitMinMs: 2000,
    waitMaxMs: 3000,
    investigationArrivalRadius: 12,
    investigationNoiseCloseRangePx: 60,
    investigationNoiseFarPx: 140,
    investigationCloseDistanceThresholdPx: 200,
    investigationMaxAttempts: 8,
    mapWidth: 800,
    mapHeight: 520,
    stuckCheckIntervalMs: 500,
    stuckMoveThresholdPx: 4,
    stuckTimeoutMs: 5000,
  };

  function baseEnemy(overrides: Partial<Enemy> = {}): Enemy {
    return {
      x: 400,
      y: 400,
      radius: 14,
      alive: true,
      mode: "investigating",
      investigationTarget: { x: 400, y: 200 },
      waitRemainingMs: 0,
      stunRemainingMs: 0,
      visionAngle: -Math.PI / 2,
      stuckCheckPosition: { x: 400, y: 400 },
      stuckCheckElapsedMs: 0,
      stuckTotalMs: 0,
      ...overrides,
    };
  }

  it("wounded: does not move and ignores vision while stunRemainingMs > 0", () => {
    const enemy = baseEnemy({ mode: "wounded", stunRemainingMs: 5000, x: 100, y: 100 });
    // Player directly in front and close enough to normally trigger chasing.
    const result = updateEnemyAi({ enemy, player: { x: 100, y: 50 }, walls: [], deltaMs: 500, config });
    expect(result.mode).toBe("wounded");
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.stunRemainingMs).toBe(4500);
  });

  it("wounded: once the stun ends, picks a new investigation target and resumes", () => {
    const enemy = baseEnemy({ mode: "wounded", stunRemainingMs: 100 });
    const result = updateEnemyAi({ enemy, player: { x: 700, y: 400 }, walls: [], deltaMs: 200, config, rng: () => 0.5 });
    expect(result.mode).toBe("investigating");
    expect(result.stunRemainingMs).toBe(0);
    expect(result.investigationTarget).not.toEqual(enemy.investigationTarget);
  });

  it("investigating: moves toward the investigationTarget, not straight at the player", () => {
    const enemy = baseEnemy({ x: 400, y: 400, investigationTarget: { x: 400, y: 200 } });
    // Player far off to the side — if the enemy moved straight at the player, x would change a lot.
    const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 16, config });
    expect(result.mode).toBe("investigating");
    expect(result.x).toBeCloseTo(400, 5); // no horizontal drift toward the target which is straight above
    expect(result.y).toBeLessThan(400); // moved up toward investigationTarget
  });

  it("investigating: transitions to waiting once the investigationTarget is reached", () => {
    const enemy = baseEnemy({ x: 400, y: 201, investigationTarget: { x: 400, y: 200 } });
    const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 16, config, rng: () => 0.5 });
    expect(result.mode).toBe("waiting");
    expect(result.waitRemainingMs).toBeGreaterThanOrEqual(config.waitMinMs);
    expect(result.waitRemainingMs).toBeLessThanOrEqual(config.waitMaxMs);
  });

  it("waiting: picks a new investigationTarget once the wait is over", () => {
    const enemy = baseEnemy({ mode: "waiting", waitRemainingMs: 100 });
    const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 200, config, rng: () => 0.5 });
    expect(result.mode).toBe("investigating");
    expect(result.waitRemainingMs).toBe(0);
  });

  it("chases when the player is visible (in cone, in range, unobstructed)", () => {
    const enemy = baseEnemy({ x: 400, y: 400, visionAngle: 0 });
    const result = updateEnemyAi({ enemy, player: { x: 450, y: 400 }, walls: [], deltaMs: 16, config });
    expect(result.mode).toBe("chasing");
    expect(result.x).toBeGreaterThan(400); // moved toward the player
  });

  it("does not chase when the player is visible-by-angle but hidden behind a wall", () => {
    const enemy = baseEnemy({ x: 400, y: 400, visionAngle: 0 });
    const wall: Wall = { x: 420, y: 380, width: 10, height: 40 };
    const result = updateEnemyAi({ enemy, player: { x: 450, y: 400 }, walls: [wall], deltaMs: 16, config });
    expect(result.mode).not.toBe("chasing");
  });

  it("when losing sight of the player while chasing, switches to investigating near the player", () => {
    const enemy = baseEnemy({ mode: "chasing", x: 400, y: 400, visionAngle: 0 });
    // Player now far outside vision range/angle.
    const result = updateEnemyAi({ enemy, player: { x: 400, y: 0 }, walls: [], deltaMs: 16, config, rng: () => 0.5 });
    expect(result.mode).toBe("investigating");
  });

  describe("anti-stuck fallback", () => {
    it("investigating: recovers with a new investigationTarget once stuck ~5s against a wall", () => {
      // Wall directly north of the enemy blocks the straight-up step toward the
      // target, so moveWithWallSliding leaves x/y unchanged tick after tick.
      const wall: Wall = { x: 380, y: 350, width: 40, height: 20 };
      const enemy = baseEnemy({
        x: 400,
        y: 400,
        investigationTarget: { x: 400, y: 100 },
        stuckCheckPosition: { x: 400, y: 400 },
        stuckCheckElapsedMs: 490,
        stuckTotalMs: 4900,
      });
      const result = updateEnemyAi({
        enemy,
        player: { x: 10, y: 10 },
        walls: [wall],
        deltaMs: 20,
        config,
        rng: () => 0.5,
      });
      expect(result.mode).toBe("investigating");
      expect(result.investigationTarget).not.toEqual(enemy.investigationTarget);
      expect(result.stuckTotalMs).toBe(0);
      expect(result.stuckCheckElapsedMs).toBe(0);
    });

    it("investigating: does not falsely trigger recovery before the 5s timeout", () => {
      const wall: Wall = { x: 380, y: 350, width: 40, height: 20 };
      const enemy = baseEnemy({
        x: 400,
        y: 400,
        investigationTarget: { x: 400, y: 100 },
        stuckCheckPosition: { x: 400, y: 400 },
        stuckCheckElapsedMs: 490,
        stuckTotalMs: 1000,
      });
      const result = updateEnemyAi({
        enemy,
        player: { x: 10, y: 10 },
        walls: [wall],
        deltaMs: 20,
        config,
        rng: () => 0.5,
      });
      expect(result.mode).toBe("investigating");
      expect(result.investigationTarget).toEqual(enemy.investigationTarget);
      expect(result.stuckTotalMs).toBe(1510);
    });

    it("investigating: real movement resets the accumulated stuck time", () => {
      const enemy = baseEnemy({
        x: 400,
        y: 400,
        investigationTarget: { x: 400, y: 100 },
        stuckCheckPosition: { x: 400, y: 450 }, // 50px away from current position — well above the 4px threshold
        stuckCheckElapsedMs: 490,
        stuckTotalMs: 4900,
      });
      const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 20, config, rng: () => 0.5 });
      expect(result.mode).toBe("investigating");
      expect(result.stuckTotalMs).toBe(0);
    });

    it("chasing: recovers into investigating (never chasing) once stuck, even though the player is still visible", () => {
      // Player directly east and unobstructed (canSee stays true), but a wall
      // hugging the enemy on the east side blocks the actual step so it never moves.
      const wall: Wall = { x: 413, y: 385, width: 10, height: 30 };
      const enemy = baseEnemy({
        mode: "chasing",
        x: 400,
        y: 400,
        visionAngle: 0,
        stuckCheckPosition: { x: 400, y: 400 },
        stuckCheckElapsedMs: 490,
        stuckTotalMs: 4900,
      });
      const result = updateEnemyAi({
        enemy,
        player: { x: 450, y: 400 },
        walls: [wall],
        deltaMs: 20,
        config,
        rng: () => 0.5,
      });
      expect(result.mode).toBe("investigating");
      expect(result.stuckTotalMs).toBe(0);
    });

    it("chasing freshly entered from another mode does not inherit a stale stuck counter", () => {
      const enemy = baseEnemy({
        mode: "investigating",
        x: 400,
        y: 400,
        visionAngle: 0,
        stuckCheckPosition: { x: 400, y: 400 },
        stuckCheckElapsedMs: 490,
        stuckTotalMs: 4900, // stale — belongs to the previous (investigating) mode
      });
      const result = updateEnemyAi({ enemy, player: { x: 450, y: 400 }, walls: [], deltaMs: 20, config });
      expect(result.mode).toBe("chasing");
      // Freshly entered chasing — the stale accumulated time must not have carried over.
      expect(result.stuckTotalMs).toBeLessThan(4900);
    });

    it("waiting: stuck detection does not run — a stale stuckTotalMs above the timeout has no effect", () => {
      const enemy = baseEnemy({ mode: "waiting", waitRemainingMs: 5000, stuckTotalMs: 9999 });
      const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 200, config });
      expect(result.mode).toBe("waiting");
      expect(result.stuckTotalMs).toBe(9999); // untouched, not evaluated
    });

    it("wounded: stuck detection does not run while stunned", () => {
      const enemy = baseEnemy({ mode: "wounded", stunRemainingMs: 5000, stuckTotalMs: 9999 });
      const result = updateEnemyAi({ enemy, player: { x: 100, y: 50 }, walls: [], deltaMs: 500, config });
      expect(result.mode).toBe("wounded");
      expect(result.stuckTotalMs).toBe(9999); // untouched, not evaluated
    });
  });
});

// ── Kontrakt pro budoucí spuštění z hlavní hry ─────────────────────────────

// ── Výbava hráče (equipment) — nahrazuje dřívější "shots?: number", viz
// EmergencyMiniGameEquipment v types.ts. `shots` zůstává v types.ts jen jako
// @deprecated zpětně-kompatibilní fallback pro resolveEquipmentFromInput.
describe("resolveEquipmentFromInput", () => {
  it("defaults to a shotgun with 1 ammo when neither equipment nor shots is provided", () => {
    expect(resolveEquipmentFromInput({})).toEqual({ hasShotgun: true, ammo: 1 });
  });

  it("uses input.equipment when provided", () => {
    expect(resolveEquipmentFromInput({ equipment: { hasShotgun: false, ammo: 0 } })).toEqual({ hasShotgun: false, ammo: 0 });
    expect(resolveEquipmentFromInput({ equipment: { hasShotgun: true, ammo: 0 } })).toEqual({ hasShotgun: true, ammo: 0 });
  });

  it("equipment takes priority over the deprecated shots field when both are present", () => {
    expect(resolveEquipmentFromInput({ equipment: { hasShotgun: true, ammo: 2 }, shots: 0 })).toEqual({ hasShotgun: true, ammo: 2 });
  });

  it("falls back to the deprecated shots field when equipment is missing", () => {
    expect(resolveEquipmentFromInput({ shots: 3 })).toEqual({ hasShotgun: true, ammo: 3 });
    expect(resolveEquipmentFromInput({ shots: 0 })).toEqual({ hasShotgun: false, ammo: 0 });
  });

  it("normalizes negative ammo to 0", () => {
    expect(resolveEquipmentFromInput({ equipment: { hasShotgun: true, ammo: -5 } })).toEqual({ hasShotgun: true, ammo: 0 });
  });

  it("normalizes hasShotgun: false with ammo > 0 so the weapon can't be fired (ammo forced to 0)", () => {
    expect(resolveEquipmentFromInput({ equipment: { hasShotgun: false, ammo: 3 } })).toEqual({ hasShotgun: false, ammo: 0 });
  });

  it("floors fractional ammo", () => {
    expect(resolveEquipmentFromInput({ equipment: { hasShotgun: true, ammo: 2.9 } })).toEqual({ hasShotgun: true, ammo: 2 });
  });
});

describe("createInitialPlayer(equipment)", () => {
  it("sets hasShotgun/ammo from the given equipment", () => {
    expect(createInitialPlayer({ hasShotgun: true, ammo: 1 })).toMatchObject({ hasShotgun: true, ammo: 1 });
    expect(createInitialPlayer({ hasShotgun: true, ammo: 3 })).toMatchObject({ hasShotgun: true, ammo: 3 });
    expect(createInitialPlayer({ hasShotgun: false, ammo: 0 })).toMatchObject({ hasShotgun: false, ammo: 0 });
  });

  it("defaults to a shotgun with 1 ammo when called without an argument", () => {
    expect(createInitialPlayer()).toMatchObject({ hasShotgun: true, ammo: 1 });
  });
});

describe("canFireWeapon", () => {
  it("false without a shotgun, even with ammo", () => {
    expect(canFireWeapon({ status: "playing", hasShotgun: false, ammo: 5 })).toBe(false);
  });

  it("false with a shotgun but 0 ammo", () => {
    expect(canFireWeapon({ status: "playing", hasShotgun: true, ammo: 0 })).toBe(false);
  });

  it("true with a shotgun and ammo while playing", () => {
    expect(canFireWeapon({ status: "playing", hasShotgun: true, ammo: 1 })).toBe(true);
  });

  it("false once the game is no longer playing, even with a loaded shotgun", () => {
    expect(canFireWeapon({ status: "won", hasShotgun: true, ammo: 1 })).toBe(false);
    expect(canFireWeapon({ status: "gameOver", hasShotgun: true, ammo: 1 })).toBe(false);
  });
});

describe("createWeaponHudLabel", () => {
  it('"Zbraň: žádná" without a shotgun', () => {
    expect(createWeaponHudLabel(false, 0)).toBe("Zbraň: žádná");
  });

  it("shows ammo count with a shotgun, including 0", () => {
    expect(createWeaponHudLabel(true, 0)).toBe("Zbraň: brokovnice · Náboje: 0");
    expect(createWeaponHudLabel(true, 1)).toBe("Zbraň: brokovnice · Náboje: 1");
  });
});

describe("applyShot", () => {
  const coneAngleRad = (70 * Math.PI) / 180;
  const range = 150;
  const playerPosition = { x: 0, y: 0, direction: "up" as const };
  const visibleEnemy = { x: 0, y: -100, radius: 14, alive: true };
  const baseInput = {
    playerPosition,
    enemy: visibleEnemy,
    coneAngleRad,
    range,
    walls: [] as Wall[],
    status: "playing" as const,
    shotFlashDurationMs: 150,
  };

  it("without a shotgun: not fired, ammo/shotsUsed/shotFlash untouched, no hit", () => {
    const result = applyShot({ ...baseInput, player: { hasShotgun: false, ammo: 5 } });
    expect(result).toEqual({ fired: false, ammo: 5, shotsUsedDelta: 0, shotFlashRemainingMs: 0, hit: false });
  });

  it("with a shotgun but 0 ammo: not fired, nothing consumed, no hit", () => {
    const result = applyShot({ ...baseInput, player: { hasShotgun: true, ammo: 0 } });
    expect(result).toEqual({ fired: false, ammo: 0, shotsUsedDelta: 0, shotFlashRemainingMs: 0, hit: false });
  });

  it("with a shotgun and 1 ammo, enemy in cone/range/LOS: fires, ammo drops to 0, shotsUsedDelta 1, flash set, hit true", () => {
    const result = applyShot({ ...baseInput, player: { hasShotgun: true, ammo: 1 } });
    expect(result).toEqual({ fired: true, ammo: 0, shotsUsedDelta: 1, shotFlashRemainingMs: 150, hit: true });
  });

  it("through a wall: still fires (ammo/shotsUsed consumed, flash set) but does not hit", () => {
    const wall: Wall = { x: -20, y: -60, width: 40, height: 10 };
    const result = applyShot({ ...baseInput, player: { hasShotgun: true, ammo: 1 }, walls: [wall] });
    expect(result).toEqual({ fired: true, ammo: 0, shotsUsedDelta: 1, shotFlashRemainingMs: 150, hit: false });
  });

  it("not playing: not fired even with a loaded shotgun", () => {
    const result = applyShot({ ...baseInput, status: "won", player: { hasShotgun: true, ammo: 1 } });
    expect(result.fired).toBe(false);
  });
});

describe("result builders", () => {
  it("createDeadResult", () => {
    expect(createDeadResult(1234, 2)).toEqual({ outcome: "dead", reason: "monster", elapsedMs: 1234, shotsUsed: 2 });
  });

  it("createReturnedResult without a completedObjective (return_to_office)", () => {
    expect(createReturnedResult(5000, 1)).toEqual({ outcome: "returned", elapsedMs: 5000, shotsUsed: 1 });
  });

  it("createReturnedResult with a completedObjective (collect_item) also derives worldEffects", () => {
    expect(createReturnedResult(5000, 1, { type: "collected_item", itemId: "fuse" })).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      completedObjective: { type: "collected_item", itemId: "fuse" },
      worldEffects: [{ type: "generator_repaired" }],
    });
  });

  it("createReturnedResult with a completedObjective that has no world effect (key) omits worldEffects", () => {
    expect(createReturnedResult(5000, 1, { type: "collected_item", itemId: "key" })).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      completedObjective: { type: "collected_item", itemId: "key" },
    });
  });

  it("createReturnedResult for battery includes completedObjective and worldEffects (energy_recharged, amount 35)", () => {
    expect(createReturnedResult(42150, 1, { type: "collected_item", itemId: "battery" })).toEqual({
      outcome: "returned",
      elapsedMs: 42150,
      shotsUsed: 1,
      completedObjective: { type: "collected_item", itemId: "battery" },
      worldEffects: [{ type: "energy_recharged", amount: 35 }],
    });
  });

  it("createFailedResult", () => {
    expect(createFailedResult(9999, 1)).toEqual({
      outcome: "failed",
      reason: "objective_failed",
      elapsedMs: 9999,
      shotsUsed: 1,
    });
  });
});

// ── Efekty pro hlavní hru (viz EmergencyWorldEffect v types.ts) — minihra je
// jen připravuje v resultu, žádné napojení na game/core zatím neexistuje.
describe("createWorldEffectsForCompletedObjective", () => {
  it("battery → energy_recharged with amount 35", () => {
    expect(createWorldEffectsForCompletedObjective({ type: "collected_item", itemId: "battery" })).toEqual([
      { type: "energy_recharged", amount: 35 },
    ]);
  });

  it("fuse → generator_repaired", () => {
    expect(createWorldEffectsForCompletedObjective({ type: "collected_item", itemId: "fuse" })).toEqual([
      { type: "generator_repaired" },
    ]);
  });

  it("bulb → bulbs_serviced", () => {
    expect(createWorldEffectsForCompletedObjective({ type: "collected_item", itemId: "bulb" })).toEqual([
      { type: "bulbs_serviced" },
    ]);
  });

  it("shotgun → shotgun_acquired", () => {
    expect(createWorldEffectsForCompletedObjective({ type: "collected_item", itemId: "shotgun" })).toEqual([
      { type: "shotgun_acquired" },
    ]);
  });

  it("ammo → ammo_acquired with amount 1", () => {
    expect(createWorldEffectsForCompletedObjective({ type: "collected_item", itemId: "ammo" })).toEqual([
      { type: "ammo_acquired", amount: 1 },
    ]);
  });

  it("key/toolbox → no effect yet ([])", () => {
    expect(createWorldEffectsForCompletedObjective({ type: "collected_item", itemId: "key" })).toEqual([]);
    expect(createWorldEffectsForCompletedObjective({ type: "collected_item", itemId: "toolbox" })).toEqual([]);
  });

  it("reached_location → no effect yet ([])", () => {
    expect(createWorldEffectsForCompletedObjective({ type: "reached_location", locationId: "office" })).toEqual([]);
  });
});

// ── Mise: "kancelář → jdu ven → splním úkol → vracím se do kanceláře" —
// sebrání věci je jen mezistav ("returning"), ne finální výsledek (viz
// EmergencyMiniGame.tsx#handleObjectiveKey).
describe("mission — completeObjective / canReturnToOffice / updateMissionPhase", () => {
  it("createInitialMissionState starts as outbound with no completedObjective", () => {
    expect(createInitialMissionState()).toEqual({ phase: "outbound" });
  });

  it("completeObjective moves an outbound mission to returning and records the objective", () => {
    const mission = completeObjective(createInitialMissionState(), { type: "collected_item", itemId: "fuse" });
    expect(mission.phase).toBe("returning");
    expect(mission.completedObjective).toEqual({ type: "collected_item", itemId: "fuse" });
  });

  it("completeObjective does not call the final result — it's a pure state transition, not onComplete", () => {
    // (No onComplete/EmergencyMiniGameResult involved here at all — the mission
    // stays in-progress. This is really just documenting the contract: see
    // EmergencyMiniGame.tsx#handleObjectiveKey, which never calls completeGame
    // from the item-pickup branch.)
    const mission = completeObjective(createInitialMissionState(), { type: "collected_item", itemId: "bulb" });
    expect(mission.phase).not.toBe("completed");
  });

  it("completeObjective is idempotent — collecting again (already returning) does not change the mission", () => {
    const returning = completeObjective(createInitialMissionState(), { type: "collected_item", itemId: "fuse" });
    const again = completeObjective(returning, { type: "collected_item", itemId: "bulb" });
    expect(again).toEqual(returning); // second "collection" attempt has no effect (item can't be picked up twice)
  });

  it("completeObjective on an already-completed mission is a no-op", () => {
    const completed = updateMissionPhase(createInitialMissionState(), "completed");
    const attempted = completeObjective(completed, { type: "collected_item", itemId: "fuse" });
    expect(attempted).toEqual(completed);
  });

  it("updateMissionPhase sets the phase and preserves completedObjective", () => {
    const mission = completeObjective(createInitialMissionState(), { type: "collected_item", itemId: "key" });
    const completed = updateMissionPhase(mission, "completed");
    expect(completed).toEqual({ phase: "completed", completedObjective: { type: "collected_item", itemId: "key" } });
  });

  it("canReturnToOffice: return_to_office requires only hasLeftStartZone", () => {
    const mission = createInitialMissionState();
    expect(canReturnToOffice("return_to_office", mission, false)).toBe(false);
    expect(canReturnToOffice("return_to_office", mission, true)).toBe(true);
  });

  it("canReturnToOffice: collect_item is blocked until the objective is completed", () => {
    const outbound = createInitialMissionState();
    expect(canReturnToOffice("collect_item", outbound, true)).toBe(false);

    const returning = completeObjective(outbound, { type: "collected_item", itemId: "toolbox" });
    expect(canReturnToOffice("collect_item", returning, true)).toBe(true);
  });

  it("canReturnToOffice: collect_item still requires hasLeftStartZone even once the objective is done", () => {
    const returning = completeObjective(createInitialMissionState(), { type: "collected_item", itemId: "toolbox" });
    expect(canReturnToOffice("collect_item", returning, false)).toBe(false);
  });

  it("canReturnToOffice: survive never completes via the exit zone in the MVP", () => {
    expect(canReturnToOffice("survive", createInitialMissionState(), true)).toBe(false);
  });
});
