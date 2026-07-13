import { describe, expect, it } from "vitest";
import { getLiveDeathSequenceConfig, isDoorAttackDeath } from "./liveDeathSequenceConfig";
import { DEATH_SEQUENCE_DEFAULT_CONFIG } from "./deathSequenceConfig";
import { DEATH_SEQUENCE_COMPLETE_AFTER_MS, resolveDeathSequencePhase } from "./deathSequenceTiming";

describe("isDoorAttackDeath", () => {
  it("is true for door_open_at_attack and bulb_replacement_attack", () => {
    expect(isDoorAttackDeath("door_open_at_attack")).toBe(true);
    expect(isDoorAttackDeath("bulb_replacement_attack")).toBe(true);
  });

  it("is false for other death reasons and null", () => {
    expect(isDoorAttackDeath("blackout_timeout")).toBe(false);
    expect(isDoorAttackDeath("emergency_run")).toBe(false);
    expect(isDoorAttackDeath(null)).toBe(false);
  });
});

describe("getLiveDeathSequenceConfig", () => {
  it("never enables the static death image or the GAME OVER overlay — the real reveal is the ghoul_death animation in DeathScreen.tsx", () => {
    for (const reason of ["door_open_at_attack", "bulb_replacement_attack", "blackout_timeout", "emergency_run", null] as const) {
      const config = getLiveDeathSequenceConfig(reason);
      expect(config.deathImageEnabled).toBe(false);
      expect(config.gameOverOverlayEnabled).toBe(false);
    }
  });

  it("tunes deathSoundPlaybackRate to 2.2 and mutes roar/impact/glitch", () => {
    const config = getLiveDeathSequenceConfig(null);
    expect(config.deathSoundPlaybackRate).toBe(2.2);
    expect(config.roarVolume).toBe(0);
    expect(config.impactVolume).toBe(0);
    expect(config.glitchVolume).toBe(0);
  });

  it("reaches the 'complete' phase (DeathSequenceOverlay.onComplete) shortly after the white flash ends, not ~1.2s later", () => {
    const config = getLiveDeathSequenceConfig(null);
    expect(config.gameOverAtMs).toBe(0);

    const whiteFlashEndsAtMs = config.preDeathDelayMs + config.whiteFlashAtMs + config.whiteFlashDurationMs;
    const completeAtMs = config.preDeathDelayMs + config.gameOverAtMs + DEATH_SEQUENCE_COMPLETE_AFTER_MS;
    expect(completeAtMs).toBeGreaterThan(whiteFlashEndsAtMs);
    expect(completeAtMs - whiteFlashEndsAtMs).toBeLessThan(500);
    expect(resolveDeathSequencePhase(completeAtMs, config)).toBe("complete");
  });

  it("finishes the shake before the sequence completes, instead of getting cut off mid-shake", () => {
    const config = getLiveDeathSequenceConfig(null);
    const shakeEndsAtMs = config.preDeathDelayMs + config.shakeAtMs + config.shakeDurationMs;
    const completeAtMs = config.preDeathDelayMs + config.gameOverAtMs + DEATH_SEQUENCE_COMPLETE_AFTER_MS;
    expect(shakeEndsAtMs).toBeLessThanOrEqual(completeAtMs);
  });

  it("leaves every other field at the /death-test default", () => {
    const config = getLiveDeathSequenceConfig(null);
    const {
      deathImageEnabled,
      gameOverOverlayEnabled,
      gameOverAtMs,
      shakeAtMs,
      shakeDurationMs,
      deathSoundPlaybackRate,
      roarVolume,
      impactVolume,
      glitchVolume,
      ...rest
    } = config;
    const {
      deathImageEnabled: _die,
      gameOverOverlayEnabled: _goe,
      gameOverAtMs: _goa,
      shakeAtMs: _sam,
      shakeDurationMs: _sdm,
      deathSoundPlaybackRate: _dr,
      roarVolume: _rv,
      impactVolume: _iv,
      glitchVolume: _gv,
      ...restDefault
    } = DEATH_SEQUENCE_DEFAULT_CONFIG;
    expect(rest).toEqual(restDefault);
  });
});
