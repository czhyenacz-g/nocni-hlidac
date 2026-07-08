import { describe, expect, it } from "vitest";
import {
  getPlayerVisibilityAtPoint,
  isPointInPlayerDirectionalVision,
  isPointInPlayerPeripheralVision,
} from "./playerVision";
import { Wall } from "./types";

// Zásahová vzdálenost pro test config — odpovídá CONE_RANGE (150) v config.ts,
// jen se stejnou hodnotou napsanou přímo tady, ať test nezávisí na config.ts.
const HIT_RANGE = 150;
const CONFIG = {
  peripheralRangePx: HIT_RANGE * 1,
  directionalRangePx: HIT_RANGE * 3,
  directionalAngleRad: (170 * Math.PI) / 180,
};

// Hráč stojí na (500, 500) a dívá se nahoru (facingAngle -PI/2, stejná
// konvence jako DIRECTION_ANGLES.up v logic.ts).
const FACING_UP = -Math.PI / 2;

function point(x: number, y: number, facingAngle = FACING_UP) {
  return { playerX: 500, playerY: 500, facingAngle, pointX: x, pointY: y };
}

describe("isPointInPlayerPeripheralVision", () => {
  it("a point well within the peripheral radius (any direction) is visible", () => {
    // 50px below the player (behind them, since they face up) — still within peripheral radius 150.
    expect(isPointInPlayerPeripheralVision(point(500, 550), CONFIG)).toBe(true);
  });

  it("a point just outside the peripheral radius, behind the player and outside the directional cone, is not visible", () => {
    expect(isPointInPlayerPeripheralVision(point(500, 500 + HIT_RANGE + 50), CONFIG)).toBe(false);
  });
});

describe("isPointInPlayerDirectionalVision", () => {
  it("a point straight ahead within directional range is visible", () => {
    expect(isPointInPlayerDirectionalVision(point(500, 500 - HIT_RANGE * 2), CONFIG)).toBe(true);
  });

  it("a point straight ahead but beyond directional range is not visible", () => {
    expect(isPointInPlayerDirectionalVision(point(500, 500 - HIT_RANGE * 3 - 50), CONFIG)).toBe(false);
  });

  it("a point directly behind the player, outside the 170 degree cone, is not in directional vision", () => {
    // 5 degrees is well outside the cone's rear blind spot (360 - 170 = 190/2 = 95 degrees blind spot each side of directly-behind)
    expect(isPointInPlayerDirectionalVision(point(500, 500 + 50), CONFIG)).toBe(false);
  });
});

describe("getPlayerVisibilityAtPoint — combines peripheral OR directional, AND line of sight", () => {
  it("visible via peripheral when close to the player, even behind them", () => {
    const result = getPlayerVisibilityAtPoint(point(500, 550), [], CONFIG);
    expect(result).toEqual({ visible: true, reason: "peripheral" });
  });

  it("visible via directional when far ahead, within the cone and range", () => {
    const result = getPlayerVisibilityAtPoint(point(500, 500 - HIT_RANGE * 2), [], CONFIG);
    expect(result).toEqual({ visible: true, reason: "directional" });
  });

  it("out_of_range when far behind the player, outside both peripheral radius and the cone", () => {
    const result = getPlayerVisibilityAtPoint(point(500, 500 + HIT_RANGE + 100), [], CONFIG);
    expect(result).toEqual({ visible: false, reason: "out_of_range" });
  });

  it("blocked when within the peripheral radius but a wall stands between player and point", () => {
    const wall: Wall = { x: 490, y: 520, width: 20, height: 10 };
    const result = getPlayerVisibilityAtPoint(point(500, 550), [wall], CONFIG);
    expect(result).toEqual({ visible: false, reason: "blocked" });
  });

  it("blocked when within the directional cone but a wall stands between player and point", () => {
    const wall: Wall = { x: 480, y: 400, width: 40, height: 10 };
    const result = getPlayerVisibilityAtPoint(point(500, 500 - HIT_RANGE * 2), [wall], CONFIG);
    expect(result).toEqual({ visible: false, reason: "blocked" });
  });

  it("angle is exactly 170 degrees wide (a point just inside the half-angle boundary is visible, just outside is not)", () => {
    const halfAngleRad = CONFIG.directionalAngleRad / 2; // 85 degrees
    const range = CONFIG.directionalRangePx * 0.5;
    const justInside = FACING_UP + halfAngleRad * 0.99;
    const justOutside = FACING_UP + halfAngleRad * 1.01;
    const insidePoint = { playerX: 500, playerY: 500, facingAngle: FACING_UP, pointX: 500 + Math.cos(justInside) * range, pointY: 500 + Math.sin(justInside) * range };
    const outsidePoint = { playerX: 500, playerY: 500, facingAngle: FACING_UP, pointX: 500 + Math.cos(justOutside) * range, pointY: 500 + Math.sin(justOutside) * range };
    expect(isPointInPlayerDirectionalVision(insidePoint, CONFIG)).toBe(true);
    expect(isPointInPlayerDirectionalVision(outsidePoint, CONFIG)).toBe(false);
  });

  it("directional range is exactly 3x the peripheral (hit) range", () => {
    expect(CONFIG.directionalRangePx).toBe(CONFIG.peripheralRangePx * 3);
  });

  it("peripheral range is exactly 1x the hit range", () => {
    expect(CONFIG.peripheralRangePx).toBe(HIT_RANGE);
  });
});
