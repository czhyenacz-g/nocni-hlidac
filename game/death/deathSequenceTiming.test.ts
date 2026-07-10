import { describe, expect, it } from "vitest";
import { DEATH_SEQUENCE_DEFAULT_CONFIG, DeathSequenceConfig } from "./deathSequenceConfig";
import {
  DEATH_SEQUENCE_COMPLETE_AFTER_MS,
  isBlackoutActive,
  isDeathImageVisible,
  isGameOverOverlayVisible,
  isRedFlashActive,
  isShakeActive,
  isSignalLostVisible,
  isWhiteFlashActive,
  resolveDeathSequencePhase,
  resolveRedFlashOpacity,
  resolveShakeIntensity,
} from "./deathSequenceTiming";

const CONFIG = DEATH_SEQUENCE_DEFAULT_CONFIG;

describe("resolveDeathSequencePhase", () => {
  it("returns 'waiting' before preDeathDelayMs", () => {
    expect(resolveDeathSequencePhase(0, CONFIG)).toBe("waiting");
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs - 1, CONFIG)).toBe("waiting");
  });

  it("returns 'silence' during the silence window right after preDeathDelayMs", () => {
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs, CONFIG)).toBe("silence");
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.silenceMs - 1, CONFIG)).toBe("silence");
  });

  it("returns 'white_flash' within the expected window", () => {
    const t = CONFIG.whiteFlashAtMs + 10;
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + t, CONFIG)).toBe("white_flash");
  });

  it("returns 'red_flash' within the expected window (when explicitly enabled — off by default)", () => {
    // redFlashEnabled is false by default (see DEATH_SEQUENCE_DEFAULT_CONFIG) —
    // enable it explicitly with a window that doesn't collide with
    // deathFrameAtMs/gameOverAtMs to isolate the phase.
    const config: DeathSequenceConfig = {
      ...CONFIG,
      redFlashEnabled: true,
      redFlashAtMs: 300,
      redFlashDurationMs: 200,
      deathFrameAtMs: 3000,
      gameOverAtMs: 3000,
    };
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + 310, config)).toBe("red_flash");
  });

  it("returns 'death_frame' from deathFrameAtMs, before gameOverAtMs", () => {
    // With the default config, deathFrameAtMs === gameOverAtMs, so the
    // "death_frame" window is empty by default — use an explicit override
    // with distinct values to exercise the phase itself.
    const config: DeathSequenceConfig = { ...CONFIG, deathFrameAtMs: 1600, gameOverAtMs: 2200 };
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + config.deathFrameAtMs, config)).toBe("death_frame");
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + config.gameOverAtMs - 1, config)).toBe("death_frame");
  });

  it("returns 'game_over' from gameOverAtMs onward (until complete)", () => {
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.gameOverAtMs, CONFIG)).toBe("game_over");
    expect(
      resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.gameOverAtMs + DEATH_SEQUENCE_COMPLETE_AFTER_MS - 1, CONFIG),
    ).toBe("game_over");
  });

  it("returns 'complete' once DEATH_SEQUENCE_COMPLETE_AFTER_MS has elapsed past gameOverAtMs", () => {
    expect(
      resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.gameOverAtMs + DEATH_SEQUENCE_COMPLETE_AFTER_MS, CONFIG),
    ).toBe("complete");
  });

  it("returns 'impact' while shake is active and no later phase has started", () => {
    // With the default config, shakeAtMs === deathFrameAtMs === gameOverAtMs
    // (all 1600), so "impact" is unreachable by default — push
    // deathFrameAtMs/gameOverAtMs well past the shake window to isolate it.
    const config: DeathSequenceConfig = {
      ...CONFIG,
      redFlashEnabled: false,
      whiteFlashEnabled: false,
      deathFrameAtMs: 5000,
      gameOverAtMs: 5000,
    };
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + config.shakeAtMs + 5, config)).toBe("impact");
  });

  it("a later phase always wins over an overlapping earlier effect window", () => {
    // deathFrameAtMs occurs while the redFlash/shake windows are still
    // technically active — death_frame must win regardless.
    const config: DeathSequenceConfig = {
      ...CONFIG,
      redFlashEnabled: true,
      redFlashAtMs: 300,
      redFlashDurationMs: 1000,
      shakeAtMs: 260,
      shakeDurationMs: 1000,
      deathFrameAtMs: 650,
      gameOverAtMs: 2000,
    };
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + config.deathFrameAtMs, config)).toBe("death_frame");
  });

  it("skips a disabled effect's phase entirely", () => {
    const config: DeathSequenceConfig = { ...CONFIG, whiteFlashEnabled: false };
    const t = CONFIG.whiteFlashAtMs + 10;
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + t, config)).not.toBe("white_flash");
  });

  it("returns 'silence' during the default blackout window (before the white flash)", () => {
    const t = CONFIG.preDeathDelayMs + 200;
    expect(resolveDeathSequencePhase(t, CONFIG)).toBe("silence");
    expect(isBlackoutActive(t, CONFIG)).toBe(true);
  });

  it("activates 'white_flash' after the blackout window ends, at whiteFlashAtMs", () => {
    expect(isBlackoutActive(CONFIG.preDeathDelayMs + CONFIG.whiteFlashAtMs, CONFIG)).toBe(false);
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.whiteFlashAtMs + 1, CONFIG)).toBe("white_flash");
  });
});

describe("isBlackoutActive", () => {
  it("is active from the start of the sequence until blackoutDurationMs", () => {
    expect(isBlackoutActive(CONFIG.preDeathDelayMs, CONFIG)).toBe(true);
    expect(isBlackoutActive(CONFIG.preDeathDelayMs + CONFIG.blackoutDurationMs - 1, CONFIG)).toBe(true);
    expect(isBlackoutActive(CONFIG.preDeathDelayMs + CONFIG.blackoutDurationMs, CONFIG)).toBe(false);
  });

  it("is false before preDeathDelayMs (still waiting)", () => {
    expect(isBlackoutActive(0, CONFIG)).toBe(false);
  });
});

describe("isDeathImageVisible / isGameOverOverlayVisible", () => {
  it("death image becomes visible from deathImageAtMs onward", () => {
    const t = CONFIG.preDeathDelayMs + CONFIG.deathImageAtMs;
    expect(isDeathImageVisible(t - 1, CONFIG)).toBe(false);
    expect(isDeathImageVisible(t, CONFIG)).toBe(true);
  });

  it("death image never shows when deathImageEnabled is false", () => {
    const config: DeathSequenceConfig = { ...CONFIG, deathImageEnabled: false };
    expect(isDeathImageVisible(config.preDeathDelayMs + config.deathImageAtMs + 1000, config)).toBe(false);
  });

  it("GAME OVER overlay becomes visible from gameOverAtMs onward", () => {
    const t = CONFIG.preDeathDelayMs + CONFIG.gameOverAtMs;
    expect(isGameOverOverlayVisible(t - 1, CONFIG)).toBe(false);
    expect(isGameOverOverlayVisible(t, CONFIG)).toBe(true);
  });

  it("GAME OVER overlay never shows when gameOverOverlayEnabled is false", () => {
    const config: DeathSequenceConfig = { ...CONFIG, gameOverOverlayEnabled: false };
    expect(isGameOverOverlayVisible(config.preDeathDelayMs + config.gameOverAtMs + 1000, config)).toBe(false);
  });
});

describe("isSignalLostVisible", () => {
  it("is false by default (signalLostEnabled is off by default)", () => {
    expect(isSignalLostVisible(CONFIG.preDeathDelayMs + CONFIG.deathFrameAtMs + 100, CONFIG)).toBe(false);
  });

  it("becomes visible from deathFrameAtMs onward once enabled", () => {
    const config: DeathSequenceConfig = { ...CONFIG, signalLostEnabled: true };
    const t = config.preDeathDelayMs + config.deathFrameAtMs;
    expect(isSignalLostVisible(t - 1, config)).toBe(false);
    expect(isSignalLostVisible(t, config)).toBe(true);
  });
});

describe("reducedFlashes", () => {
  it("disables the white flash entirely, even when whiteFlashEnabled is true", () => {
    const config: DeathSequenceConfig = { ...CONFIG, reducedFlashes: true };
    const t = config.preDeathDelayMs + config.whiteFlashAtMs + 10;
    expect(isWhiteFlashActive(t, config)).toBe(false);
    expect(resolveDeathSequencePhase(t, config)).not.toBe("white_flash");
  });

  it("caps red flash opacity at 0.35", () => {
    // redFlashEnabled is off by default — enable it explicitly, since
    // resolveRedFlashOpacity returns 0 whenever the effect itself is disabled.
    const config: DeathSequenceConfig = { ...CONFIG, redFlashEnabled: true, reducedFlashes: true, redFlashOpacity: 0.75 };
    expect(resolveRedFlashOpacity(config)).toBe(0.35);
  });

  it("leaves red flash opacity unchanged when it's already below the reduced cap", () => {
    const config: DeathSequenceConfig = { ...CONFIG, redFlashEnabled: true, reducedFlashes: true, redFlashOpacity: 0.2 };
    expect(resolveRedFlashOpacity(config)).toBe(0.2);
  });

  it("caps shake intensity at 12", () => {
    const config: DeathSequenceConfig = { ...CONFIG, reducedFlashes: true, shakeIntensity: 34 };
    expect(resolveShakeIntensity(config)).toBe(12);
  });

  it("does not affect red flash / shake when reducedFlashes is false", () => {
    expect(resolveRedFlashOpacity(CONFIG)).toBe(CONFIG.redFlashOpacity);
    expect(resolveShakeIntensity(CONFIG)).toBe(CONFIG.shakeIntensity);
  });
});

describe("isWhiteFlashActive / isRedFlashActive / isShakeActive", () => {
  it("are all false during 'waiting' (before preDeathDelayMs)", () => {
    expect(isWhiteFlashActive(0, CONFIG)).toBe(false);
    expect(isRedFlashActive(0, CONFIG)).toBe(false);
    expect(isShakeActive(0, CONFIG)).toBe(false);
  });

  it("respect their own enabled flag", () => {
    const config: DeathSequenceConfig = { ...CONFIG, whiteFlashEnabled: false, redFlashEnabled: false, shakeEnabled: false };
    const t = config.preDeathDelayMs + 300;
    expect(isWhiteFlashActive(t, config)).toBe(false);
    expect(isRedFlashActive(t, config)).toBe(false);
    expect(isShakeActive(t, config)).toBe(false);
  });

  it("turn off again once their duration window has elapsed", () => {
    const afterWhiteFlash = CONFIG.preDeathDelayMs + CONFIG.whiteFlashAtMs + CONFIG.whiteFlashDurationMs;
    expect(isWhiteFlashActive(afterWhiteFlash, CONFIG)).toBe(false);
    const afterRedFlash = CONFIG.preDeathDelayMs + CONFIG.redFlashAtMs + CONFIG.redFlashDurationMs;
    expect(isRedFlashActive(afterRedFlash, CONFIG)).toBe(false);
    const afterShake = CONFIG.preDeathDelayMs + CONFIG.shakeAtMs + CONFIG.shakeDurationMs;
    expect(isShakeActive(afterShake, CONFIG)).toBe(false);
  });
});
