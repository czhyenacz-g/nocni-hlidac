import { describe, expect, it } from "vitest";
import { GHOUL_CAMERA_ATTACK_ANIMATIONS, getGhoulCameraAttackAnimation } from "./cameraAttackAnimation.object13";
import { GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS } from "../core/cameraDamageConfig";

function extractFrameNumber(src: string): number {
  const match = src.match(/(\d+)\.webp$/);
  if (!match) throw new Error(`No frame number found in ${src}`);
  return Number(match[1]);
}

describe("GHOUL_CAMERA_ATTACK_ANIMATIONS", () => {
  const ids = ["left_hallway", "right_hallway", "door_hallway", "door_hallway_light"] as const;

  it("2. every sequence uses only .webp paths — never .png", () => {
    for (const id of ids) {
      for (const src of GHOUL_CAMERA_ATTACK_ANIMATIONS[id].frames) {
        expect(src.endsWith(".webp")).toBe(true);
        expect(src.endsWith(".png")).toBe(false);
      }
    }
  });

  it("3. frames are ordered numerically (0, 1, 2, ..., 25), never lexicographically (1, 10, 11, 2)", () => {
    for (const id of ids) {
      const numbers = GHOUL_CAMERA_ATTACK_ANIMATIONS[id].frames.map(extractFrameNumber);
      const sorted = [...numbers].sort((a, b) => a - b);
      expect(numbers).toEqual(sorted);
      // Explicitly rule out the classic lexicographic-sort bug shape.
      expect(numbers[0]).toBeLessThan(numbers[1]);
    }
  });

  it("has 25 frames per sequence (exact count found in the source project)", () => {
    for (const id of ids) {
      expect(GHOUL_CAMERA_ATTACK_ANIMATIONS[id].frames).toHaveLength(25);
    }
  });

  it("9. total playback duration is GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS regardless of frame count", () => {
    for (const id of ids) {
      const animation = GHOUL_CAMERA_ATTACK_ANIMATIONS[id];
      expect(animation.frameDurationMs * animation.frames.length).toBeCloseTo(GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS, 5);
    }
  });

  it("left_hallway frames live under the left_hallway_ghoul_attack folder", () => {
    for (const src of GHOUL_CAMERA_ATTACK_ANIMATIONS.left_hallway.frames) {
      expect(src).toContain("/left_hallway/left_hallway_ghoul_attack/left_hallway_");
    }
  });

  it("right_hallway frames live under the right_hallway_ghoul_attack folder", () => {
    for (const src of GHOUL_CAMERA_ATTACK_ANIMATIONS.right_hallway.frames) {
      expect(src).toContain("/right_hallway/right_hallway_ghoul_attack/right_hallway_");
    }
  });

  it("door_hallway (no light) frames live under the door_hallway_ghoul_attack folder", () => {
    for (const src of GHOUL_CAMERA_ATTACK_ANIMATIONS.door_hallway.frames) {
      expect(src).toContain("/door_hallway/door_hallway_ghoul_attack/door_hallway_");
    }
  });

  it("door_hallway_light frames live under the door_hallway_light_ghoul_attack folder (source files use 'bright' in the name)", () => {
    for (const src of GHOUL_CAMERA_ATTACK_ANIMATIONS.door_hallway_light.frames) {
      expect(src).toContain("/door_hallway_light/door_hallway_light_ghoul_attack/door_hallway_bright_");
    }
  });
});

describe("getGhoulCameraAttackAnimation", () => {
  it("returns the matching definition for a known id", () => {
    expect(getGhoulCameraAttackAnimation("left_hallway")).toBe(GHOUL_CAMERA_ATTACK_ANIMATIONS.left_hallway);
  });

  it("19. returns null for a missing animationId (fallback territory)", () => {
    expect(getGhoulCameraAttackAnimation(null)).toBeNull();
  });
});
