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
  getOfficeMarkerLabel,
  hasFinalHitDelayElapsed,
  hasLineOfSight,
  isEnemyHit,
  isMonsterHitFinal,
  isMonsterOfficeThreatArmed,
  isOfficeDoorLocked,
  isPointInCone,
  isTargetInCone,
  lineIntersectsRect,
  moveWithWallSliding,
  MINIGAME_HEARTBEAT_VOLUME_BASE,
  MINIGAME_HEARTBEAT_VOLUME_CHASING,
  MINIGAME_HEARTBEAT_VOLUME_RAGE,
  MINIGAME_HEARTBEAT_VOLUME_VISIBLE,
  msSinceOfficeDoorOpened,
  msUntilOfficeDoorOpens,
  qualifiesAsNewMonsterHit,
  resolveEquipmentFromInput,
  resolveMiniGameHeartbeatVolume,
  shouldHighlightOfficeMarker,
  shouldShowOfficeBoundCrisisMarker,
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
      enraged: false,
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

  it("wounded: recovering from stun sets enraged to true", () => {
    const enemy = baseEnemy({ mode: "wounded", stunRemainingMs: 100, enraged: false });
    const result = updateEnemyAi({ enemy, player: { x: 700, y: 400 }, walls: [], deltaMs: 200, config, rng: () => 0.5 });
    expect(result.enraged).toBe(true);
  });

  it("investigating: a non-enraged enemy moves at searchSpeed, not chaseSpeed", () => {
    const enemy = baseEnemy({ x: 400, y: 400, investigationTarget: { x: 400, y: 200 }, enraged: false });
    const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 16, config });
    const distanceMoved = 400 - result.y;
    expect(distanceMoved).toBeCloseTo(config.searchSpeed, 5);
  });

  it("investigating: an enraged enemy (recovered from a shot) moves at chaseSpeed instead of searchSpeed", () => {
    const enemy = baseEnemy({ x: 400, y: 400, investigationTarget: { x: 400, y: 200 }, enraged: true });
    const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 16, config });
    const distanceMoved = 400 - result.y;
    expect(distanceMoved).toBeCloseTo(config.chaseSpeed, 5);
  });

  it("enraged stays true across further investigating/waiting transitions (never resets on its own)", () => {
    const enemy = baseEnemy({ mode: "waiting", waitRemainingMs: 0, enraged: true });
    const result = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 16, config, rng: () => 0.5 });
    expect(result.mode).toBe("investigating");
    expect(result.enraged).toBe(true);
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

  // Commitnutý office_bound cíl (viz zadání "monstrum musí fyzicky doběhnout
  // ke kanceláři, ne teleportovat") — Enemy.officeTarget přebíjí vidění/
  // honičku hráče úplně, hýbe se stejným stepTowards/moveWithWallSliding
  // mechanismem jako investigating/chasing výše.
  describe("office_bound (Enemy.officeTarget)", () => {
    it("moves toward officeTarget at chaseSpeed, ignoring a player directly in cone/range", () => {
      const enemy = baseEnemy({ x: 400, y: 400, visionAngle: 0, officeTarget: { x: 400, y: 200 } });
      // Player would normally trigger "chasing" (in cone, in range, unobstructed).
      const result = updateEnemyAi({ enemy, player: { x: 450, y: 400 }, walls: [], deltaMs: 16, config });
      expect(result.mode).toBe("office_bound");
      // Moved toward officeTarget (straight up), not toward the player (to the right).
      expect(result.x).toBeCloseTo(400, 5);
      expect(result.y).toBeLessThan(400);
      const distanceMoved = 400 - result.y;
      expect(distanceMoved).toBeCloseTo(config.chaseSpeed, 5);
    });

    it("stays office_bound even when the player is far away/not visible at all", () => {
      const enemy = baseEnemy({ x: 400, y: 400, officeTarget: { x: 100, y: 100 } });
      const result = updateEnemyAi({ enemy, player: { x: 10000, y: 10000 }, walls: [], deltaMs: 16, config });
      expect(result.mode).toBe("office_bound");
    });

    it("a shot (wounded) still interrupts office_bound — stunRemainingMs freezes movement", () => {
      const enemy = baseEnemy({ x: 400, y: 400, mode: "wounded", stunRemainingMs: 5000, officeTarget: { x: 400, y: 200 } });
      const result = updateEnemyAi({ enemy, player: { x: 450, y: 400 }, walls: [], deltaMs: 500, config });
      expect(result.mode).toBe("wounded");
      expect(result.x).toBe(400);
      expect(result.y).toBe(400);
    });

    it("after the stun from a shot wears off, resumes office_bound directly — NOT the normal enraged/investigating recovery", () => {
      const enemy = baseEnemy({ mode: "wounded", stunRemainingMs: 100, officeTarget: { x: 400, y: 200 }, enraged: false });
      const result = updateEnemyAi({ enemy, player: { x: 700, y: 400 }, walls: [], deltaMs: 200, config, rng: () => 0.5 });
      expect(result.mode).toBe("office_bound");
      expect(result.stunRemainingMs).toBe(0);
      // Did not pick a new investigationTarget near the player (that's the non-officeTarget recovery path).
      expect(result.investigationTarget).toEqual(enemy.investigationTarget);
    });

    it("without a shot in between, office_bound keeps moving toward the same officeTarget every tick", () => {
      let enemy = baseEnemy({ x: 400, y: 400, officeTarget: { x: 400, y: 100 } });
      enemy = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 16, config });
      const afterOneTick = enemy.y;
      enemy = updateEnemyAi({ enemy, player: { x: 10, y: 10 }, walls: [], deltaMs: 16, config });
      expect(enemy.mode).toBe("office_bound");
      expect(enemy.y).toBeLessThan(afterOneTick); // kept advancing toward the target
    });
  });

  // Krizový "radar ping" marker (viz zadání "monstrum musí být lépe
  // viditelné i ve tmě") — draw() v EmergencyMiniGame.tsx tohle volá
  // NEZÁVISLE na fog/LOS (enemyVisibleToPlayer), takže testováno tady jako
  // čistá funkce, ne přes canvas.
  describe("shouldShowOfficeBoundCrisisMarker", () => {
    it("true for a live enemy in office_bound mode, threat not yet triggered", () => {
      expect(shouldShowOfficeBoundCrisisMarker(baseEnemy({ mode: "office_bound" }), false)).toBe(true);
    });

    it("false once officeThreatTriggered (monster already arrived and vanished)", () => {
      expect(shouldShowOfficeBoundCrisisMarker(baseEnemy({ mode: "office_bound" }), true)).toBe(false);
    });

    it("false for a dead enemy, even in office_bound mode", () => {
      expect(shouldShowOfficeBoundCrisisMarker(baseEnemy({ mode: "office_bound", alive: false }), false)).toBe(false);
    });

    // Běžné patrolující monstrum mimo LOS/fog se NESMÍ odhalit tímhle
    // markerem — ověřeno pro všechny ostatní mody, ne jen jeden příklad.
    it.each(["investigating", "waiting", "chasing", "wounded"] as const)(
      "false for a regular patrolling enemy in mode '%s' (no office_bound commitment)",
      (mode) => {
        expect(shouldShowOfficeBoundCrisisMarker(baseEnemy({ mode }), false)).toBe(false);
      },
    );
  });

  // Hlasitost ambientního tepu podle situace (viz zadání "1) vidím monstrum
  // 2) ono vidí mě a jde po mě 3) rage mode namax").
  describe("resolveMiniGameHeartbeatVolume", () => {
    const AGGRO_RANGE = 150;

    it("base level when the enemy is dead/vanished, regardless of mode/visibility", () => {
      expect(
        resolveMiniGameHeartbeatVolume({
          enemyAlive: false,
          enemyVisible: true,
          enemyMode: "chasing",
          distanceToPlayer: 10,
          aggroRange: AGGRO_RANGE,
        }),
      ).toBe(MINIGAME_HEARTBEAT_VOLUME_BASE);
    });

    it("base level when not visible and not chasing", () => {
      expect(
        resolveMiniGameHeartbeatVolume({
          enemyAlive: true,
          enemyVisible: false,
          enemyMode: "investigating",
          distanceToPlayer: 1000,
          aggroRange: AGGRO_RANGE,
        }),
      ).toBe(MINIGAME_HEARTBEAT_VOLUME_BASE);
    });

    it("visible level: player sees the enemy, but it is not chasing", () => {
      expect(
        resolveMiniGameHeartbeatVolume({
          enemyAlive: true,
          enemyVisible: true,
          enemyMode: "waiting",
          distanceToPlayer: 300,
          aggroRange: AGGRO_RANGE,
        }),
      ).toBe(MINIGAME_HEARTBEAT_VOLUME_VISIBLE);
    });

    it("chasing level: enemy is chasing but still outside aggroRange", () => {
      expect(
        resolveMiniGameHeartbeatVolume({
          enemyAlive: true,
          enemyVisible: true,
          enemyMode: "chasing",
          distanceToPlayer: AGGRO_RANGE + 1,
          aggroRange: AGGRO_RANGE,
        }),
      ).toBe(MINIGAME_HEARTBEAT_VOLUME_CHASING);
    });

    it("rage level: enemy is chasing AND within aggroRange (max volume)", () => {
      expect(
        resolveMiniGameHeartbeatVolume({
          enemyAlive: true,
          enemyVisible: true,
          enemyMode: "chasing",
          distanceToPlayer: AGGRO_RANGE,
          aggroRange: AGGRO_RANGE,
        }),
      ).toBe(MINIGAME_HEARTBEAT_VOLUME_RAGE);
      expect(
        resolveMiniGameHeartbeatVolume({
          enemyAlive: true,
          enemyVisible: true,
          enemyMode: "chasing",
          distanceToPlayer: 10,
          aggroRange: AGGRO_RANGE,
        }),
      ).toBe(MINIGAME_HEARTBEAT_VOLUME_RAGE);
    });

    it("volume levels strictly escalate: base < visible < chasing < rage", () => {
      expect(MINIGAME_HEARTBEAT_VOLUME_BASE).toBeLessThan(MINIGAME_HEARTBEAT_VOLUME_VISIBLE);
      expect(MINIGAME_HEARTBEAT_VOLUME_VISIBLE).toBeLessThan(MINIGAME_HEARTBEAT_VOLUME_CHASING);
      expect(MINIGAME_HEARTBEAT_VOLUME_CHASING).toBeLessThan(MINIGAME_HEARTBEAT_VOLUME_RAGE);
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
    expect(createReturnedResult(5000, 1)).toEqual({ outcome: "returned", elapsedMs: 5000, shotsUsed: 1, monsterHits: 0 });
  });

  it("createReturnedResult with a completedObjective (collect_item) also derives worldEffects", () => {
    expect(createReturnedResult(5000, 1, { type: "collected_item", itemId: "fuse" })).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      monsterHits: 0,
      completedObjective: { type: "collected_item", itemId: "fuse" },
      collectedItems: ["fuse"],
      worldEffects: [{ type: "generator_repaired" }],
    });
  });

  it("createReturnedResult with a completedObjective that has no world effect (key) omits worldEffects", () => {
    expect(createReturnedResult(5000, 1, { type: "collected_item", itemId: "key" })).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      monsterHits: 0,
      completedObjective: { type: "collected_item", itemId: "key" },
      collectedItems: ["key"],
    });
  });

  it("createReturnedResult for battery includes completedObjective and worldEffects (energy_recharged, amount 35)", () => {
    expect(createReturnedResult(42150, 1, { type: "collected_item", itemId: "battery" })).toEqual({
      outcome: "returned",
      elapsedMs: 42150,
      shotsUsed: 1,
      monsterHits: 0,
      completedObjective: { type: "collected_item", itemId: "battery" },
      collectedItems: ["battery"],
      worldEffects: [{ type: "energy_recharged", amount: 35 }],
    });
  });

  it("createReturnedResult includes both worldEffects (battery) and an active officeThreatOnReturn together", () => {
    const threat = { active: true as const, reason: "monster_chasing" as const, intensity: "high" as const };
    expect(createReturnedResult(42150, 1, { type: "collected_item", itemId: "battery" }, threat)).toEqual({
      outcome: "returned",
      elapsedMs: 42150,
      shotsUsed: 1,
      monsterHits: 0,
      completedObjective: { type: "collected_item", itemId: "battery" },
      collectedItems: ["battery"],
      worldEffects: [{ type: "energy_recharged", amount: 35 }],
      officeThreatOnReturn: threat,
    });
  });

  it("createReturnedResult omits officeThreatOnReturn entirely when it is inactive", () => {
    const inactiveThreat = { active: false as const, reason: "monster_chasing" as const, intensity: "low" as const };
    expect(createReturnedResult(5000, 1, undefined, inactiveThreat)).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      monsterHits: 0,
    });
  });

  it("createReturnedResult has monsterHits: 0 and omits monsterHit when not passed (miss/no shot fired)", () => {
    expect(createReturnedResult(5000, 1)).toEqual({ outcome: "returned", elapsedMs: 5000, shotsUsed: 1, monsterHits: 0 });
  });

  it("createReturnedResult has monsterHits: 0 and omits monsterHit when explicitly 0", () => {
    expect(createReturnedResult(5000, 1, undefined, undefined, 0)).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      monsterHits: 0,
    });
  });

  it("createReturnedResult includes monsterHits: 1 and monsterHit: true for a single confirmed hit (regular shotgun)", () => {
    expect(createReturnedResult(5000, 1, undefined, undefined, 1)).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      monsterHits: 1,
      monsterHit: true,
    });
  });

  it("createReturnedResult includes monsterHits: 2 and monsterHit: true for two confirmed hits (double-barrel shotgun)", () => {
    expect(createReturnedResult(5000, 2, undefined, undefined, 2)).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 2,
      monsterHits: 2,
      monsterHit: true,
    });
  });

  it("createReturnedResult combines monsterHits with a completedObjective/worldEffects independently", () => {
    expect(createReturnedResult(5000, 1, { type: "collected_item", itemId: "battery" }, undefined, 1)).toEqual({
      outcome: "returned",
      elapsedMs: 5000,
      shotsUsed: 1,
      monsterHits: 1,
      monsterHit: true,
      completedObjective: { type: "collected_item", itemId: "battery" },
      collectedItems: ["battery"],
      worldEffects: [{ type: "energy_recharged", amount: 35 }],
    });
  });

  // Sandbox výprava (viz zadání) — extraCollectedItemIds (6. parametr) se
  // sčítá s completedObjective do jednoho collectedItems pole, worldEffects
  // se odvodí ze VŠECH sebraných položek najednou.
  describe("createReturnedResult with extraCollectedItemIds (multi-loot)", () => {
    it("returns collectedItems + worldEffects for extra loot even without a completedObjective (5s timeout return)", () => {
      expect(createReturnedResult(5000, 0, undefined, undefined, undefined, ["battery", "bulb"])).toEqual({
        outcome: "returned",
        elapsedMs: 5000,
        shotsUsed: 0,
        monsterHits: 0,
        collectedItems: ["battery", "bulb"],
        worldEffects: [
          { type: "energy_recharged", amount: 35 },
          { type: "bulbs_serviced" },
        ],
      });
    });

    it("combines the primary completedObjective with extra loot into one collectedItems/worldEffects set", () => {
      expect(
        createReturnedResult(5000, 1, { type: "collected_item", itemId: "shotgun" }, undefined, undefined, ["battery"]),
      ).toEqual({
        outcome: "returned",
        elapsedMs: 5000,
        shotsUsed: 1,
        monsterHits: 0,
        completedObjective: { type: "collected_item", itemId: "shotgun" },
        collectedItems: ["shotgun", "battery"],
        worldEffects: [{ type: "shotgun_acquired" }, { type: "energy_recharged", amount: 35 }],
      });
    });

    it("monsterHits + extra loot together: both monsterHits/monsterHit and worldEffects for the loot are present", () => {
      expect(createReturnedResult(5000, 1, undefined, undefined, 1, ["bulb"])).toEqual({
        outcome: "returned",
        elapsedMs: 5000,
        shotsUsed: 1,
        monsterHits: 1,
        monsterHit: true,
        collectedItems: ["bulb"],
        worldEffects: [{ type: "bulbs_serviced" }],
      });
    });

    it("monsterHits without any loot: monsterHits/monsterHit are present, collectedItems/worldEffects are omitted", () => {
      expect(createReturnedResult(5000, 1, undefined, undefined, 1, [])).toEqual({
        outcome: "returned",
        elapsedMs: 5000,
        shotsUsed: 1,
        monsterHits: 1,
        monsterHit: true,
      });
    });

    it("empty extraCollectedItemIds and no completedObjective omits collectedItems/worldEffects entirely", () => {
      expect(createReturnedResult(5000, 0, undefined, undefined, undefined, [])).toEqual({
        outcome: "returned",
        elapsedMs: 5000,
        shotsUsed: 0,
        monsterHits: 0,
      });
    });
  });

  // Zamčené dveře kanceláře (viz zadání) — monstrum zamířilo na kancelář/
  // generátor (7. parametr) přidá "monster_reached_office" do worldEffects,
  // nezávisle na (a navíc k) collectedItems/worldEffectsForItem.
  describe("createReturnedResult with officeThreatTriggered (monster reached the office)", () => {
    it("adds monster_reached_office to worldEffects even without any loot", () => {
      expect(createReturnedResult(25000, 0, undefined, undefined, undefined, undefined, true)).toEqual({
        outcome: "returned",
        elapsedMs: 25000,
        shotsUsed: 0,
        monsterHits: 0,
        worldEffects: [{ type: "monster_reached_office" }],
      });
    });

    it("combines monster_reached_office with loot worldEffects (order: loot first, then the threat effect)", () => {
      expect(createReturnedResult(25000, 0, undefined, undefined, undefined, ["battery"], true)).toEqual({
        outcome: "returned",
        elapsedMs: 25000,
        shotsUsed: 0,
        monsterHits: 0,
        collectedItems: ["battery"],
        worldEffects: [{ type: "energy_recharged", amount: 35 }, { type: "monster_reached_office" }],
      });
    });

    it("omits monster_reached_office when explicitly false or not passed", () => {
      expect(createReturnedResult(5000, 0, undefined, undefined, undefined, undefined, false)).toEqual({
        outcome: "returned",
        elapsedMs: 5000,
        shotsUsed: 0,
        monsterHits: 0,
      });
      expect(createReturnedResult(5000, 0)).toEqual({ outcome: "returned", elapsedMs: 5000, shotsUsed: 0, monsterHits: 0 });
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

  // Zamčené dveře kanceláře (viz zadání "diegetická herní mechanika",
  // EMERGENCY_OFFICE_DOOR_LOCK_MS) — `officeDoorUnlocked` je teď HARD gate
  // pro VŠECHNY objectives, mission.phase už canReturnToOffice vůbec nebere
  // jako parametr (nahrazeno níže).
  it("canReturnToOffice: return_to_office requires hasLeftStartZone AND officeDoorUnlocked", () => {
    expect(canReturnToOffice("return_to_office", false, false)).toBe(false);
    expect(canReturnToOffice("return_to_office", true, false)).toBe(false);
    expect(canReturnToOffice("return_to_office", false, true)).toBe(false);
    expect(canReturnToOffice("return_to_office", true, true)).toBe(true);
  });

  it("canReturnToOffice: collect_item is blocked until officeDoorUnlocked, regardless of the objective", () => {
    expect(canReturnToOffice("collect_item", true, false)).toBe(false);
    expect(canReturnToOffice("collect_item", true, true)).toBe(true);
  });

  it("canReturnToOffice: collect_item still requires hasLeftStartZone even once the door is unlocked", () => {
    expect(canReturnToOffice("collect_item", false, true)).toBe(false);
  });

  it("canReturnToOffice: survive never completes via the exit zone in the MVP, even with the door unlocked", () => {
    expect(canReturnToOffice("survive", true, false)).toBe(false);
    expect(canReturnToOffice("survive", true, true)).toBe(false);
  });
});

// ── Zamčené dveře kanceláře (viz zadání, config.ts
// EMERGENCY_OFFICE_DOOR_LOCK_MS/EMERGENCY_MONSTER_OFFICE_TARGET_DELAY_MS) —
// čisté funkce jen z elapsedMs, žádný vlastní stav.
describe("office door lock — isOfficeDoorLocked / msUntilOfficeDoorOpens / msSinceOfficeDoorOpened / isMonsterOfficeThreatArmed", () => {
  const DOOR_LOCK_MS = 20_000;
  const THREAT_DELAY_MS = 5_000;

  it("isOfficeDoorLocked: true before the lock duration, false at/after it", () => {
    expect(isOfficeDoorLocked(0, DOOR_LOCK_MS)).toBe(true);
    expect(isOfficeDoorLocked(19_999, DOOR_LOCK_MS)).toBe(true);
    expect(isOfficeDoorLocked(20_000, DOOR_LOCK_MS)).toBe(false);
    expect(isOfficeDoorLocked(30_000, DOOR_LOCK_MS)).toBe(false);
  });

  it("msUntilOfficeDoorOpens: counts down to 0, never negative", () => {
    expect(msUntilOfficeDoorOpens(0, DOOR_LOCK_MS)).toBe(20_000);
    expect(msUntilOfficeDoorOpens(12_000, DOOR_LOCK_MS)).toBe(8_000);
    expect(msUntilOfficeDoorOpens(20_000, DOOR_LOCK_MS)).toBe(0);
    expect(msUntilOfficeDoorOpens(45_000, DOOR_LOCK_MS)).toBe(0);
  });

  it("msSinceOfficeDoorOpened: 0 while still locked, counts up after unlocking", () => {
    expect(msSinceOfficeDoorOpened(0, DOOR_LOCK_MS)).toBe(0);
    expect(msSinceOfficeDoorOpened(19_999, DOOR_LOCK_MS)).toBe(0);
    expect(msSinceOfficeDoorOpened(20_000, DOOR_LOCK_MS)).toBe(0);
    expect(msSinceOfficeDoorOpened(25_000, DOOR_LOCK_MS)).toBe(5_000);
  });

  it("isMonsterOfficeThreatArmed: false while locked, false right after unlocking, true once the target delay elapses (enemy alive)", () => {
    expect(isMonsterOfficeThreatArmed(10_000, DOOR_LOCK_MS, THREAT_DELAY_MS, true)).toBe(false);
    expect(isMonsterOfficeThreatArmed(20_000, DOOR_LOCK_MS, THREAT_DELAY_MS, true)).toBe(false);
    expect(isMonsterOfficeThreatArmed(24_999, DOOR_LOCK_MS, THREAT_DELAY_MS, true)).toBe(false);
    expect(isMonsterOfficeThreatArmed(25_000, DOOR_LOCK_MS, THREAT_DELAY_MS, true)).toBe(true);
    expect(isMonsterOfficeThreatArmed(60_000, DOOR_LOCK_MS, THREAT_DELAY_MS, true)).toBe(true);
  });

  // Nahlášený bug (viz zadání): hráč zabil monstrum, vrátil se do minihry
  // znovu a po uplynutí stejného časového okna se přesto zobrazila hláška
  // "Siréna přilákala monstrum ke kanceláři" — isMonsterOfficeThreatArmed
  // byla čistě časová a enemy.alive vůbec nezohledňovala.
  it("isMonsterOfficeThreatArmed: always false when the enemy is not alive (already defeated tonight), regardless of elapsed time", () => {
    expect(isMonsterOfficeThreatArmed(10_000, DOOR_LOCK_MS, THREAT_DELAY_MS, false)).toBe(false);
    expect(isMonsterOfficeThreatArmed(25_000, DOOR_LOCK_MS, THREAT_DELAY_MS, false)).toBe(false);
    expect(isMonsterOfficeThreatArmed(60_000, DOOR_LOCK_MS, THREAT_DELAY_MS, false)).toBe(false);
  });
});

// ── Kancelářský marker (viz EmergencyMiniGame.tsx#draw) — čistě orientační/
// vizuální, nesmí ovlivnit canReturnToOffice/mission loop pravidla.
describe("office marker — getOfficeMarkerLabel / shouldHighlightOfficeMarker", () => {
  it("outbound phase (collect_item): plain 'KANCELÁŘ' label, not highlighted, even with the door unlocked", () => {
    const mission = createInitialMissionState();
    expect(shouldHighlightOfficeMarker(mission, "collect_item", true)).toBe(false);
    expect(getOfficeMarkerLabel(mission, "collect_item", false, true, true)).toBe("KANCELÁŘ");
  });

  it("returning phase (collect_item) with the door LOCKED: never highlighted/promises 'E pro návrat', door lock wins", () => {
    const returning = completeObjective(createInitialMissionState(), { type: "collected_item", itemId: "fuse" });
    expect(shouldHighlightOfficeMarker(returning, "collect_item", false)).toBe(false);
    expect(getOfficeMarkerLabel(returning, "collect_item", false, true, false)).toBe("KANCELÁŘ");
    expect(getOfficeMarkerLabel(returning, "collect_item", true, true, false)).toBe("KANCELÁŘ");
  });

  it("returning phase (collect_item) with the door UNLOCKED: highlighted 'KANCELÁŘ — E pro návrat', regardless of player position", () => {
    const returning = completeObjective(createInitialMissionState(), { type: "collected_item", itemId: "fuse" });
    expect(shouldHighlightOfficeMarker(returning, "collect_item", true)).toBe(true);
    expect(getOfficeMarkerLabel(returning, "collect_item", false, true, true)).toBe("KANCELÁŘ — E pro návrat");
    expect(getOfficeMarkerLabel(returning, "collect_item", true, true, true)).toBe("KANCELÁŘ — E pro návrat");
  });

  it("collect_item with the door unlocked and standing in the exit zone: highlighted label even without a completed objective", () => {
    const outbound = createInitialMissionState();
    expect(getOfficeMarkerLabel(outbound, "collect_item", true, true, true)).toBe("KANCELÁŘ — E pro návrat");
  });

  it("collect_item with the door unlocked but NOT standing in the exit zone: still plain label", () => {
    const outbound = createInitialMissionState();
    expect(getOfficeMarkerLabel(outbound, "collect_item", false, true, true)).toBe("KANCELÁŘ");
  });

  it("return_to_office: plain label before leaving the start zone, even with the door unlocked", () => {
    const mission = createInitialMissionState();
    expect(getOfficeMarkerLabel(mission, "return_to_office", false, false, true)).toBe("KANCELÁŘ");
  });

  it("return_to_office: plain label after leaving start but before actually standing in the exit zone", () => {
    const mission = createInitialMissionState();
    expect(getOfficeMarkerLabel(mission, "return_to_office", false, true, true)).toBe("KANCELÁŘ");
  });

  it("return_to_office: highlighted label once the player has left start AND is standing in the exit zone AND the door is unlocked", () => {
    const mission = createInitialMissionState();
    expect(getOfficeMarkerLabel(mission, "return_to_office", true, true, true)).toBe("KANCELÁŘ — E pro návrat");
  });

  it("return_to_office with the door still LOCKED: plain label even standing in the exit zone (door lock wins over position)", () => {
    const mission = createInitialMissionState();
    expect(getOfficeMarkerLabel(mission, "return_to_office", true, true, false)).toBe("KANCELÁŘ");
  });

  it("return_to_office never sets shouldHighlightOfficeMarker (handled separately via hasLeftStartZone/inExitZone)", () => {
    expect(shouldHighlightOfficeMarker(createInitialMissionState(), "return_to_office", true)).toBe(false);
  });

  it("survive: always the plain label, never highlighted, even with the door unlocked", () => {
    const mission = createInitialMissionState();
    expect(shouldHighlightOfficeMarker(mission, "survive", true)).toBe(false);
    expect(getOfficeMarkerLabel(mission, "survive", true, true, true)).toBe("KANCELÁŘ");
  });

  it("does not change canReturnToOffice's decision either way", () => {
    // collect_item still can't complete before the door is unlocked, no
    // matter what the marker helpers say about label/highlight.
    expect(canReturnToOffice("collect_item", true, false)).toBe(false);
    // return_to_office still requires the door to be unlocked too.
    expect(canReturnToOffice("return_to_office", true, false)).toBe(false);
    expect(canReturnToOffice("return_to_office", true, true)).toBe(true);
  });
});

describe("qualifiesAsNewMonsterHit", () => {
  it("false when the shot missed, regardless of the wounded/recover window", () => {
    expect(qualifiesAsNewMonsterHit(false, null, 0)).toBe(false);
    expect(qualifiesAsNewMonsterHit(false, 5000, 6000)).toBe(false);
  });

  it("true on the first hit of the run (monsterWoundedUntilMs still null)", () => {
    expect(qualifiesAsNewMonsterHit(true, null, 1234)).toBe(true);
  });

  it("false for a second hit landing while still inside the wounded/recover window", () => {
    // First hit at elapsedMs=1000 sets monsterWoundedUntilMs=1000+1100=2100.
    expect(qualifiesAsNewMonsterHit(true, 2100, 1050)).toBe(false);
    expect(qualifiesAsNewMonsterHit(true, 2100, 2099)).toBe(false);
  });

  it("true again once the wounded/recover window has elapsed", () => {
    expect(qualifiesAsNewMonsterHit(true, 2100, 2100)).toBe(true);
    expect(qualifiesAsNewMonsterHit(true, 2100, 3000)).toBe(true);
  });
});

describe("isMonsterHitFinal", () => {
  it("false when requiredHits is not provided", () => {
    expect(isMonsterHitFinal(9, 1, undefined)).toBe(false);
    expect(isMonsterHitFinal(999, 999, undefined)).toBe(false);
  });

  it("false when monsterHitsToday=8 plus a single hit this run (total 9, below 10)", () => {
    expect(isMonsterHitFinal(8, 1, 10)).toBe(false);
  });

  it("true when monsterHitsToday=8 plus two hits this run (total 10, double-barrel)", () => {
    expect(isMonsterHitFinal(8, 2, 10)).toBe(true);
  });

  it("true when monsterHitsToday=9 plus a single hit this run (total 10)", () => {
    expect(isMonsterHitFinal(9, 1, 10)).toBe(true);
  });

  it("stays true past the threshold too (defensive, shouldn't normally happen)", () => {
    expect(isMonsterHitFinal(10, 1, 10)).toBe(true);
  });

  it("respects an admin-shortened threshold", () => {
    expect(isMonsterHitFinal(0, 1, 2)).toBe(false);
    expect(isMonsterHitFinal(1, 1, 2)).toBe(true);
    expect(isMonsterHitFinal(0, 2, 2)).toBe(true);
  });
});

describe("hasFinalHitDelayElapsed", () => {
  it("false while finalHitAtMs is null (final hit never happened)", () => {
    expect(hasFinalHitDelayElapsed(null, 999_999, 5000)).toBe(false);
  });

  it("false before the delay has elapsed", () => {
    expect(hasFinalHitDelayElapsed(1000, 4999, 5000)).toBe(false);
  });

  it("true exactly at the delay boundary", () => {
    expect(hasFinalHitDelayElapsed(1000, 6000, 5000)).toBe(true);
  });

  it("true well past the delay", () => {
    expect(hasFinalHitDelayElapsed(0, 20_000, 5000)).toBe(true);
  });
});
