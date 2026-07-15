import { describe, expect, it } from "vitest";
import { resolveGhoulCameraAttackFrameState } from "./cameraAttackAnimation";

describe("resolveGhoulCameraAttackFrameState", () => {
  it("1. shows the first frame immediately (elapsed 0)", () => {
    expect(resolveGhoulCameraAttackFrameState(25, 2500, 0)).toEqual({ frameIndex: 0, isHoldingLastFrame: false });
  });

  it("10. frameDurationMs is derived from frame count (2500 / 25 = 100ms per frame)", () => {
    // At 250ms (2.5 frames in), we should be on frame index 2.
    expect(resolveGhoulCameraAttackFrameState(25, 2500, 250).frameIndex).toBe(2);
  });

  it("works for a different frame count too — length doesn't change the total duration", () => {
    // 10 frames over 2500ms = 250ms/frame; at 500ms we're on frame index 2.
    expect(resolveGhoulCameraAttackFrameState(10, 2500, 500).frameIndex).toBe(2);
  });

  it("2. each frame shows exactly once — index increases monotonically with elapsed time", () => {
    const frameCount = 25;
    const framesDurationMs = 2500;
    let lastIndex = -1;
    for (let elapsed = 0; elapsed < framesDurationMs; elapsed += 50) {
      const { frameIndex } = resolveGhoulCameraAttackFrameState(frameCount, framesDurationMs, elapsed);
      expect(frameIndex).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = frameIndex;
    }
  });

  it("3. the last frame is never skipped — reaching the final frame index right before the sequence completes", () => {
    const frameCount = 25;
    const framesDurationMs = 2500;
    const frameDurationMs = framesDurationMs / frameCount;
    const { frameIndex } = resolveGhoulCameraAttackFrameState(frameCount, framesDurationMs, framesDurationMs - frameDurationMs / 2);
    expect(frameIndex).toBe(frameCount - 1);
  });

  it("11. holds the last frame once framesDurationMs elapses (does not go out of bounds)", () => {
    const result = resolveGhoulCameraAttackFrameState(25, 2500, 2500);
    expect(result).toEqual({ frameIndex: 24, isHoldingLastFrame: true });
  });

  it("12. does not loop — well past framesDurationMs still holds the last frame", () => {
    const result = resolveGhoulCameraAttackFrameState(25, 2500, 999_999);
    expect(result).toEqual({ frameIndex: 24, isHoldingLastFrame: true });
  });

  it("19. safe fallback (frame 0, holding) for an empty/missing sequence", () => {
    expect(resolveGhoulCameraAttackFrameState(0, 2500, 1000)).toEqual({ frameIndex: 0, isHoldingLastFrame: true });
  });
});
