import { describe, expect, it } from "vitest";
import {
  CAMERA_MANUAL_PAN_CONFIG,
  clampCameraPan,
  lerpCameraPan,
  normalizePointerPosition,
  resolveCameraPanTarget,
  shouldUseManualCameraMode,
} from "./cameraManualPan";

const RECT = { left: 0, top: 0, width: 200, height: 100 };

describe("normalizePointerPosition", () => {
  it("returns 0/0 for the exact center of the viewport", () => {
    const result = normalizePointerPosition(100, 50, RECT);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it("returns roughly -1/-1 for the top-left corner", () => {
    const result = normalizePointerPosition(RECT.left, RECT.top, RECT);
    expect(result.x).toBeCloseTo(-1);
    expect(result.y).toBeCloseTo(-1);
  });

  it("returns roughly 1/1 for the bottom-right corner", () => {
    const result = normalizePointerPosition(RECT.left + RECT.width, RECT.top + RECT.height, RECT);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(1);
  });

  it("clamps values outside the viewport instead of exceeding -1..1", () => {
    const result = normalizePointerPosition(RECT.left - 500, RECT.top - 500, RECT);
    expect(result.x).toBe(-1);
    expect(result.y).toBe(-1);

    const beyond = normalizePointerPosition(RECT.left + RECT.width + 500, RECT.top + RECT.height + 500, RECT);
    expect(beyond.x).toBe(1);
    expect(beyond.y).toBe(1);
  });

  it("returns a safe center for a zero/broken-size viewport instead of NaN/Infinity", () => {
    expect(normalizePointerPosition(50, 50, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
    expect(normalizePointerPosition(50, 50, { left: 0, top: 0, width: -10, height: 100 })).toEqual({ x: 0, y: 0 });
  });
});

describe("resolveCameraPanTarget", () => {
  it("targetX never exceeds config.maxPanX", () => {
    const target = resolveCameraPanTarget(1, 0, CAMERA_MANUAL_PAN_CONFIG);
    expect(target.x).toBe(CAMERA_MANUAL_PAN_CONFIG.maxPanX);
    expect(Math.abs(target.x)).toBeLessThanOrEqual(CAMERA_MANUAL_PAN_CONFIG.maxPanX);
  });

  it("targetY never exceeds config.maxPanY", () => {
    const target = resolveCameraPanTarget(0, 1, CAMERA_MANUAL_PAN_CONFIG);
    expect(target.y).toBe(CAMERA_MANUAL_PAN_CONFIG.maxPanY);
    expect(Math.abs(target.y)).toBeLessThanOrEqual(CAMERA_MANUAL_PAN_CONFIG.maxPanY);
  });

  it("scales linearly with mouseX/mouseY within range", () => {
    const target = resolveCameraPanTarget(0.5, -0.5, CAMERA_MANUAL_PAN_CONFIG);
    expect(target.x).toBeCloseTo(CAMERA_MANUAL_PAN_CONFIG.maxPanX * 0.5);
    expect(target.y).toBeCloseTo(-CAMERA_MANUAL_PAN_CONFIG.maxPanY * 0.5);
  });

  it("still clamps even if given out-of-range mouseX/mouseY (defensive)", () => {
    const target = resolveCameraPanTarget(5, -5, CAMERA_MANUAL_PAN_CONFIG);
    expect(target.x).toBe(CAMERA_MANUAL_PAN_CONFIG.maxPanX);
    expect(target.y).toBe(-CAMERA_MANUAL_PAN_CONFIG.maxPanY);
  });
});

describe("clampCameraPan", () => {
  it("clamps values well outside the viewport range to config max/min", () => {
    const result = clampCameraPan({ x: 9999, y: -9999 }, CAMERA_MANUAL_PAN_CONFIG);
    expect(result).toEqual({ x: CAMERA_MANUAL_PAN_CONFIG.maxPanX, y: -CAMERA_MANUAL_PAN_CONFIG.maxPanY });
  });

  it("leaves in-range values untouched", () => {
    const result = clampCameraPan({ x: 10, y: -5 }, CAMERA_MANUAL_PAN_CONFIG);
    expect(result).toEqual({ x: 10, y: -5 });
  });
});

describe("lerpCameraPan", () => {
  it("moves partway toward the target by the given factor", () => {
    const result = lerpCameraPan({ x: 0, y: 0 }, { x: 40, y: 24 }, 0.1);
    expect(result.x).toBeCloseTo(4);
    expect(result.y).toBeCloseTo(2.4);
  });

  it("never overshoots the target (factor 1 lands exactly on it)", () => {
    const result = lerpCameraPan({ x: 0, y: 0 }, { x: 40, y: 24 }, 1);
    expect(result).toEqual({ x: 40, y: 24 });
  });

  it("factor 0 leaves current unchanged", () => {
    const result = lerpCameraPan({ x: 5, y: 5 }, { x: 40, y: 24 }, 0);
    expect(result).toEqual({ x: 5, y: 5 });
  });
});

describe("shouldUseManualCameraMode", () => {
  it("is false when the experiment is disabled, regardless of recent mouse movement", () => {
    expect(
      shouldUseManualCameraMode({
        experimentEnabled: false,
        isTouchDevice: false,
        prefersReducedMotion: false,
        msSinceLastPointerMove: 0,
        autoResumeDelayMs: 1600,
      }),
    ).toBe(false);
  });

  it("is true when enabled, mouse (not touch), no reduced motion, and recent movement", () => {
    expect(
      shouldUseManualCameraMode({
        experimentEnabled: true,
        isTouchDevice: false,
        prefersReducedMotion: false,
        msSinceLastPointerMove: 200,
        autoResumeDelayMs: 1600,
      }),
    ).toBe(true);
  });

  it("returns to auto mode once msSinceLastPointerMove reaches autoResumeDelayMs", () => {
    const base = { experimentEnabled: true, isTouchDevice: false, prefersReducedMotion: false, autoResumeDelayMs: 1600 };
    expect(shouldUseManualCameraMode({ ...base, msSinceLastPointerMove: 1599 })).toBe(true);
    expect(shouldUseManualCameraMode({ ...base, msSinceLastPointerMove: 1600 })).toBe(false);
    expect(shouldUseManualCameraMode({ ...base, msSinceLastPointerMove: 5000 })).toBe(false);
  });

  it("is false with no recorded pointer movement yet (null)", () => {
    expect(
      shouldUseManualCameraMode({
        experimentEnabled: true,
        isTouchDevice: false,
        prefersReducedMotion: false,
        msSinceLastPointerMove: null,
        autoResumeDelayMs: 1600,
      }),
    ).toBe(false);
  });

  it("is false on touch devices even with the experiment enabled and recent movement", () => {
    expect(
      shouldUseManualCameraMode({
        experimentEnabled: true,
        isTouchDevice: true,
        prefersReducedMotion: false,
        msSinceLastPointerMove: 0,
        autoResumeDelayMs: 1600,
      }),
    ).toBe(false);
  });

  it("is false when prefers-reduced-motion is set, even with recent movement", () => {
    expect(
      shouldUseManualCameraMode({
        experimentEnabled: true,
        isTouchDevice: false,
        prefersReducedMotion: true,
        msSinceLastPointerMove: 0,
        autoResumeDelayMs: 1600,
      }),
    ).toBe(false);
  });
});
