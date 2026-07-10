import { describe, expect, it } from "vitest";
import { getLiveDeathSequenceConfig, isDoorAttackDeath } from "./liveDeathSequenceConfig";
import { DEATH_SEQUENCE_DEFAULT_CONFIG } from "./deathSequenceConfig";

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
  it("selects the door_open_death image for door-attack death reasons", () => {
    expect(getLiveDeathSequenceConfig("door_open_at_attack").deathImageId).toBe("door_open_death");
    expect(getLiveDeathSequenceConfig("bulb_replacement_attack").deathImageId).toBe("door_open_death");
  });

  it("selects the death_bg image for other death reasons", () => {
    expect(getLiveDeathSequenceConfig("blackout_timeout").deathImageId).toBe("death_bg");
    expect(getLiveDeathSequenceConfig("emergency_run").deathImageId).toBe("death_bg");
    expect(getLiveDeathSequenceConfig(null).deathImageId).toBe("death_bg");
  });

  it("tunes deathSoundPlaybackRate to 2.2 and mutes roar/impact/glitch", () => {
    const config = getLiveDeathSequenceConfig(null);
    expect(config.deathSoundPlaybackRate).toBe(2.2);
    expect(config.roarVolume).toBe(0);
    expect(config.impactVolume).toBe(0);
    expect(config.glitchVolume).toBe(0);
  });

  it("leaves every other field at the /death-test default", () => {
    const config = getLiveDeathSequenceConfig(null);
    const { deathImageId, deathSoundPlaybackRate, roarVolume, impactVolume, glitchVolume, ...rest } = config;
    const { deathImageId: _di, deathSoundPlaybackRate: _dr, roarVolume: _rv, impactVolume: _iv, glitchVolume: _gv, ...restDefault } =
      DEATH_SEQUENCE_DEFAULT_CONFIG;
    expect(rest).toEqual(restDefault);
  });
});
