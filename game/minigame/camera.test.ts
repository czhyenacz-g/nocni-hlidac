import { describe, expect, it } from "vitest";
import { resolveActiveCanvasSize, resolveActiveScale, resolveCameraOffset } from "./camera";
import { CANVAS_HEIGHT, CANVAS_WIDTH, MOBILE_CAMERA_SCALE, MOBILE_CANVAS_HEIGHT, MOBILE_CANVAS_WIDTH } from "./config";

describe("resolveActiveCanvasSize", () => {
  it("returns the desktop CANVAS_WIDTH/HEIGHT when not a touch device", () => {
    expect(resolveActiveCanvasSize(false)).toEqual({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  });

  it("returns the portrait MOBILE_CANVAS_WIDTH/HEIGHT on a touch device", () => {
    expect(resolveActiveCanvasSize(true)).toEqual({ width: MOBILE_CANVAS_WIDTH, height: MOBILE_CANVAS_HEIGHT });
  });
});

describe("resolveActiveScale", () => {
  it("returns the passed desktop scale when not a touch device", () => {
    expect(resolveActiveScale(false, 0.8)).toBe(0.8);
  });

  it("ignores the passed desktop scale and returns MOBILE_CAMERA_SCALE on a touch device", () => {
    expect(resolveActiveScale(true, 0.8)).toBe(MOBILE_CAMERA_SCALE);
  });
});

describe("resolveCameraOffset", () => {
  it("is always (0,0) when not a touch device, regardless of player position", () => {
    expect(resolveCameraOffset(false, 999, -123)).toEqual({ x: 0, y: 0 });
  });

  it("centers the camera window on the player position on a touch device", () => {
    const offset = resolveCameraOffset(true, 500, 300);
    expect(offset.x).toBe(500 - 320 / 2);
    expect(offset.y).toBe(300 - 500 / 2);
  });

  it("does not clamp near the world origin (offset can go negative)", () => {
    const offset = resolveCameraOffset(true, 10, 10);
    expect(offset.x).toBeLessThan(0);
    expect(offset.y).toBeLessThan(0);
  });
});
