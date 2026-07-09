import { describe, expect, it } from "vitest";
import { DEATH_SEQUENCE_DEFAULT_CONFIG, DeathSequenceConfig } from "./deathSequenceConfig";
import {
  DEATH_SEQUENCE_COMPLETE_AFTER_MS,
  isRedFlashActive,
  isShakeActive,
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

  it("returns 'red_flash' within the expected window", () => {
    const t = CONFIG.redFlashAtMs + 10;
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + t, CONFIG)).toBe("red_flash");
  });

  it("returns 'death_frame' from deathFrameAtMs, before gameOverAtMs", () => {
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.deathFrameAtMs, CONFIG)).toBe("death_frame");
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.gameOverAtMs - 1, CONFIG)).toBe("death_frame");
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
    // shakeAtMs=260, redFlashAtMs=300 with the default config — a moment in
    // between (before red_flash starts) should read as "impact".
    const config: DeathSequenceConfig = { ...CONFIG, redFlashEnabled: false, whiteFlashEnabled: false };
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + config.shakeAtMs + 5, config)).toBe("impact");
  });

  it("a later phase always wins over an overlapping earlier effect window", () => {
    // At deathFrameAtMs (650), the default redFlash window ([300,720)) and
    // shake window ([260,910)) are still technically active — death_frame
    // must win regardless.
    expect(resolveDeathSequencePhase(CONFIG.preDeathDelayMs + CONFIG.deathFrameAtMs, CONFIG)).toBe("death_frame");
  });

  it("skips a disabled effect's phase entirely", () => {
    const config: DeathSequenceConfig = { ...CONFIG, whiteFlashEnabled: false };
    const t = CONFIG.whiteFlashAtMs + 10;
    expect(resolveDeathSequencePhase(config.preDeathDelayMs + t, config)).not.toBe("white_flash");
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
    const config: DeathSequenceConfig = { ...CONFIG, reducedFlashes: true, redFlashOpacity: 0.75 };
    expect(resolveRedFlashOpacity(config)).toBe(0.35);
  });

  it("leaves red flash opacity unchanged when it's already below the reduced cap", () => {
    const config: DeathSequenceConfig = { ...CONFIG, reducedFlashes: true, redFlashOpacity: 0.2 };
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
