import { describe, expect, it } from "vitest";
import { computeTitanAudioTrack, computeTitanFootstepVolume, computeTitanFootstepVolumeRatio, computeTitanStressFloor } from "./titanFootsteps";

describe("computeTitanFootstepVolumeRatio — 50% at start, plynule až 85% u dveří chodby", () => {
  it("starts at 50% ('outside')", () => {
    expect(computeTitanFootstepVolumeRatio("outside")).toBe(0.5);
  });

  it("increases through outer_yard/left_hallway/door_hallway", () => {
    expect(computeTitanFootstepVolumeRatio("outer_yard")).toBe(0.6);
    expect(computeTitanFootstepVolumeRatio("left_hallway")).toBe(0.7);
    expect(computeTitanFootstepVolumeRatio("door_hallway")).toBe(0.85);
  });

  it("stays at the last-reached ratio at at_door/breach (kroky tam už nehrají, viz computeTitanAudioTrack)", () => {
    expect(computeTitanFootstepVolumeRatio("at_door")).toBe(0.85);
    expect(computeTitanFootstepVolumeRatio("breach")).toBe(0.85);
  });

  it("is monotonically non-decreasing along the real Titan route", () => {
    const route = ["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "breach"] as const;
    let previous = -1;
    for (const stage of route) {
      const ratio = computeTitanFootstepVolumeRatio(stage);
      expect(ratio).toBeGreaterThanOrEqual(previous);
      previous = ratio;
    }
  });

  it("never exceeds 1 (100%) or goes below 0", () => {
    for (const stage of ["outside", "outer_yard", "left_hallway", "right_hallway", "door_hallway", "at_door", "breach", "attack", "graveyard"] as const) {
      const ratio = computeTitanFootstepVolumeRatio(stage);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThanOrEqual(1);
    }
  });
});

describe("computeTitanFootstepVolume — scales the ratio against the configured base volume", () => {
  it("matches the exact example from the spec (base 0.8 -> 50% = 0.4)", () => {
    expect(computeTitanFootstepVolume("outside", 0.8)).toBeCloseTo(0.4, 5);
  });

  it("never exceeds the configured base volume (never louder than its safe max)", () => {
    for (const stage of ["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "breach"] as const) {
      expect(computeTitanFootstepVolume(stage, 0.8)).toBeLessThanOrEqual(0.8);
    }
  });
});

describe("computeTitanAudioTrack — kroky BĚHEM přibližování, bušení NA dveřích, nikdy obě zároveň", () => {
  it("returns 'footsteps' while approaching (outside/outer_yard/left_hallway/door_hallway)", () => {
    for (const stage of ["outside", "outer_yard", "left_hallway", "door_hallway"] as const) {
      expect(computeTitanAudioTrack(stage)).toBe("footsteps");
    }
  });

  it("returns 'pounding' exactly at at_door and breach", () => {
    expect(computeTitanAudioTrack("at_door")).toBe("pounding");
    expect(computeTitanAudioTrack("breach")).toBe("pounding");
  });

  it("returns 'none' once the encounter is over (attack/graveyard)", () => {
    expect(computeTitanAudioTrack("attack")).toBe("none");
    expect(computeTitanAudioTrack("graveyard")).toBe("none");
  });
});

describe("computeTitanStressFloor — immediate +30 minimum at encounter start, rising with proximity", () => {
  it("is at least 30 at the very start of the encounter ('outside')", () => {
    expect(computeTitanStressFloor("outside")).toBeGreaterThanOrEqual(30);
  });

  it("rises through outer_yard/left_hallway/door_hallway", () => {
    const outerYard = computeTitanStressFloor("outer_yard");
    const leftHallway = computeTitanStressFloor("left_hallway");
    const doorHallway = computeTitanStressFloor("door_hallway");
    expect(outerYard).toBeGreaterThan(computeTitanStressFloor("outside"));
    expect(leftHallway).toBeGreaterThan(outerYard);
    expect(doorHallway).toBeGreaterThan(leftHallway);
  });

  it("is significantly higher at the door than at the start", () => {
    const start = computeTitanStressFloor("outside");
    const atDoor = computeTitanStressFloor("at_door");
    expect(atDoor).toBeGreaterThan(start + 30);
  });

  it("never exceeds the 0-100 scale used by the existing heartbeat stress system", () => {
    for (const stage of ["outside", "outer_yard", "left_hallway", "right_hallway", "door_hallway", "at_door", "breach", "attack", "graveyard"] as const) {
      const floor = computeTitanStressFloor(stage);
      expect(floor).toBeGreaterThanOrEqual(0);
      expect(floor).toBeLessThanOrEqual(100);
    }
  });
});
