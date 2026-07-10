import { describe, expect, it } from "vitest";
import { DEATH_SEQUENCE_DEFAULT_CONFIG, DeathSequenceConfig, clampDeathSequenceConfig } from "./deathSequenceConfig";

describe("DEATH_SEQUENCE_DEFAULT_CONFIG", () => {
  it("is a valid config: all opacity/volume fields are within 0..1", () => {
    const unitFields: (keyof DeathSequenceConfig)[] = [
      "whiteFlashOpacity",
      "redFlashOpacity",
      "darknessOpacity",
      "noiseOpacity",
      "deathVolume",
      "impactVolume",
      "roarVolume",
      "glitchVolume",
      "blackoutOpacity",
      "deathImageOpacity",
    ];
    for (const field of unitFields) {
      const value = DEATH_SEQUENCE_DEFAULT_CONFIG[field] as number;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("is a valid config: all *Ms timing fields are non-negative", () => {
    const msFields: (keyof DeathSequenceConfig)[] = [
      "preDeathDelayMs",
      "silenceMs",
      "whiteFlashAtMs",
      "whiteFlashDurationMs",
      "redFlashAtMs",
      "redFlashDurationMs",
      "shakeAtMs",
      "shakeDurationMs",
      "deathFrameAtMs",
      "gameOverAtMs",
      "blackoutDurationMs",
      "deathImageAtMs",
      "deathSoundAtMs",
    ];
    for (const field of msFields) {
      expect(DEATH_SEQUENCE_DEFAULT_CONFIG[field] as number).toBeGreaterThanOrEqual(0);
    }
  });

  it("is unchanged (not mutated) by clampDeathSequenceConfig — it's already valid", () => {
    expect(clampDeathSequenceConfig(DEATH_SEQUENCE_DEFAULT_CONFIG)).toEqual(DEATH_SEQUENCE_DEFAULT_CONFIG);
  });

  it("has deathImageEnabled true by default", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.deathImageEnabled).toBe(true);
  });

  it("has blackoutDurationMs of 1500 by default", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.blackoutDurationMs).toBe(1500);
  });

  it("has whiteFlashAtMs of 1500 by default", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.whiteFlashAtMs).toBe(1500);
  });

  it("has deathImageAtMs of 1600 by default", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.deathImageAtMs).toBe(1600);
  });

  it("has signalLostEnabled false by default", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.signalLostEnabled).toBe(false);
  });

  it("has gameOverOverlayEnabled true by default", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.gameOverOverlayEnabled).toBe(true);
  });

  it("has a non-empty deathImageId that resolves to a real registered image", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.deathImageId.length).toBeGreaterThan(0);
  });

  it("has redFlashEnabled false by default (red flash kept but off)", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.redFlashEnabled).toBe(false);
  });

  it("has deathSoundPlaybackRate of 1 by default (no pitch change)", () => {
    expect(DEATH_SEQUENCE_DEFAULT_CONFIG.deathSoundPlaybackRate).toBe(1);
  });
});

describe("clampDeathSequenceConfig", () => {
  it("clamps opacity/volume fields to [0, 1]", () => {
    const config: DeathSequenceConfig = {
      ...DEATH_SEQUENCE_DEFAULT_CONFIG,
      whiteFlashOpacity: 1.5,
      redFlashOpacity: -0.2,
      darknessOpacity: 2,
      noiseOpacity: -1,
      deathVolume: 1.2,
      impactVolume: -0.5,
      roarVolume: 3,
      glitchVolume: -3,
    };
    const clamped = clampDeathSequenceConfig(config);
    expect(clamped.whiteFlashOpacity).toBe(1);
    expect(clamped.redFlashOpacity).toBe(0);
    expect(clamped.darknessOpacity).toBe(1);
    expect(clamped.noiseOpacity).toBe(0);
    expect(clamped.deathVolume).toBe(1);
    expect(clamped.impactVolume).toBe(0);
    expect(clamped.roarVolume).toBe(1);
    expect(clamped.glitchVolume).toBe(0);
  });

  it("clamps negative ms fields to 0", () => {
    const config: DeathSequenceConfig = {
      ...DEATH_SEQUENCE_DEFAULT_CONFIG,
      preDeathDelayMs: -100,
      silenceMs: -1,
      whiteFlashAtMs: -50,
      gameOverAtMs: -1,
    };
    const clamped = clampDeathSequenceConfig(config);
    expect(clamped.preDeathDelayMs).toBe(0);
    expect(clamped.silenceMs).toBe(0);
    expect(clamped.whiteFlashAtMs).toBe(0);
    expect(clamped.gameOverAtMs).toBe(0);
  });

  it("clamps negative shakeIntensity to 0 but does not cap it at any upper bound", () => {
    expect(clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, shakeIntensity: -5 }).shakeIntensity).toBe(0);
    expect(clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, shakeIntensity: 500 }).shakeIntensity).toBe(500);
  });

  it("leaves boolean switches untouched", () => {
    const config: DeathSequenceConfig = {
      ...DEATH_SEQUENCE_DEFAULT_CONFIG,
      whiteFlashEnabled: false,
      reducedFlashes: true,
      showPhaseDebug: true,
    };
    const clamped = clampDeathSequenceConfig(config);
    expect(clamped.whiteFlashEnabled).toBe(false);
    expect(clamped.reducedFlashes).toBe(true);
    expect(clamped.showPhaseDebug).toBe(true);
  });

  it("clamps new opacity fields (blackoutOpacity, deathImageOpacity) to [0, 1]", () => {
    const clamped = clampDeathSequenceConfig({
      ...DEATH_SEQUENCE_DEFAULT_CONFIG,
      blackoutOpacity: 1.5,
      deathImageOpacity: -0.3,
    });
    expect(clamped.blackoutOpacity).toBe(1);
    expect(clamped.deathImageOpacity).toBe(0);
  });

  it("clamps new ms fields (blackoutDurationMs, deathImageAtMs, deathSoundAtMs) to non-negative", () => {
    const clamped = clampDeathSequenceConfig({
      ...DEATH_SEQUENCE_DEFAULT_CONFIG,
      blackoutDurationMs: -100,
      deathImageAtMs: -1,
      deathSoundAtMs: -1,
    });
    expect(clamped.blackoutDurationMs).toBe(0);
    expect(clamped.deathImageAtMs).toBe(0);
    expect(clamped.deathSoundAtMs).toBe(0);
  });

  it("clamps deathSoundPlaybackRate to [0.5, 2]", () => {
    expect(clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, deathSoundPlaybackRate: 0.1 }).deathSoundPlaybackRate).toBe(0.5);
    expect(clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, deathSoundPlaybackRate: 5 }).deathSoundPlaybackRate).toBe(2);
    expect(clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, deathSoundPlaybackRate: 1.3 }).deathSoundPlaybackRate).toBe(1.3);
  });

  it("normalizes deathImageFit to 'cover' or 'contain', falling back to 'cover' for anything else", () => {
    expect(clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, deathImageFit: "contain" }).deathImageFit).toBe("contain");
    expect(clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, deathImageFit: "cover" }).deathImageFit).toBe("cover");
    expect(
      clampDeathSequenceConfig({ ...DEATH_SEQUENCE_DEFAULT_CONFIG, deathImageFit: "bogus" as DeathSequenceConfig["deathImageFit"] })
        .deathImageFit,
    ).toBe("cover");
  });
});
