import { describe, expect, it } from "vitest";
import {
  computeAtmosphereFlickerActive,
  computeFlickerIntervalRangeMs,
  rollFlickerEvent,
  rollNextFlickerDelayMs,
} from "./atmosphereFlicker";

// Deterministický "random" generátor pro testy (viz stejný vzor jako
// game/core/titanEncounterNights.ts testy) — sekvence hodnot 0..1, cyklicky
// se opakuje, ať je test čitelný a reprodukovatelný.
function sequenceRandom(values: number[]): () => number {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

describe("computeFlickerIntervalRangeMs — frequency rises with tension", () => {
  it("interval range shrinks as tension increases (more frequent flicker)", () => {
    const rest = computeFlickerIntervalRangeMs(0);
    const critical = computeFlickerIntervalRangeMs(1);
    expect(critical.minMs).toBeLessThan(rest.minMs);
    expect(critical.maxMs).toBeLessThan(rest.maxMs);
  });

  it("min is always less than max, across the tension range", () => {
    for (let tension = 0; tension <= 1; tension += 0.1) {
      const { minMs, maxMs } = computeFlickerIntervalRangeMs(tension);
      expect(minMs).toBeLessThan(maxMs);
    }
  });
});

describe("rollNextFlickerDelayMs — never a constant/regular interval (viz zadání 'nikdy nepoužívej pravidelný loop')", () => {
  it("produces different delays for different random draws at the same tension", () => {
    const delays = [0, 0.25, 0.5, 0.75, 1].map((r) => rollNextFlickerDelayMs(0.5, () => r));
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("stays within the computed interval range for that tension", () => {
    const { minMs, maxMs } = computeFlickerIntervalRangeMs(0.7);
    for (const r of [0, 0.1, 0.5, 0.9, 1]) {
      const delay = rollNextFlickerDelayMs(0.7, () => r);
      expect(delay).toBeGreaterThanOrEqual(minMs);
      expect(delay).toBeLessThanOrEqual(maxMs);
    }
  });

  it("average delay at high tension is meaningfully shorter than at low tension", () => {
    const randoms = [0.1, 0.3, 0.5, 0.7, 0.9];
    const avg = (tension: number) => {
      const random = sequenceRandom(randoms);
      const samples = randoms.map(() => rollNextFlickerDelayMs(tension, random));
      return samples.reduce((a, b) => a + b, 0) / samples.length;
    };
    expect(avg(1)).toBeLessThan(avg(0));
  });
});

describe("rollFlickerEvent — varied duration/intensity, sometimes double (viz zadání 'různé délky a intenzity', 'někdy dvojité probliknutí')", () => {
  it("duration and intensity vary across different random draws", () => {
    const events = [0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => rollFlickerEvent(0.5, sequenceRandom([r, r, r])));
    const durations = new Set(events.map((e) => e.durationMs));
    const intensities = new Set(events.map((e) => e.intensity));
    expect(durations.size).toBeGreaterThan(1);
    expect(intensities.size).toBeGreaterThan(1);
  });

  it("can roll both single (double=false) and double (double=true) flickers", () => {
    const single = rollFlickerEvent(0.5, sequenceRandom([0.99, 0.5, 0.5]));
    const double = rollFlickerEvent(0.5, sequenceRandom([0.01, 0.5, 0.5]));
    expect(single.double).toBe(false);
    expect(double.double).toBe(true);
  });

  it("double-flicker chance rises with tension", () => {
    // Same random roll for the "is it a double" draw — only tension differs.
    const lowTensionDouble = rollFlickerEvent(0, sequenceRandom([0.4]));
    const highTensionDouble = rollFlickerEvent(1, sequenceRandom([0.4]));
    expect(lowTensionDouble.double).toBe(false); // 0.4 >= doubleChance(0)=0.15 -> false
    expect(highTensionDouble.double).toBe(true); // 0.4 < doubleChance(1)=0.5 -> true
  });

  it("intensity stays within 0..1, duration is always positive", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const event = rollFlickerEvent(1, sequenceRandom([r, r, r]));
      expect(event.intensity).toBeGreaterThanOrEqual(0);
      expect(event.intensity).toBeLessThanOrEqual(1);
      expect(event.durationMs).toBeGreaterThan(0);
    }
  });
});

describe("computeAtmosphereFlickerActive — gates (viz zadání '5. Ochrany')", () => {
  const base = { screen: "playing" as const, activeMiniGame: false, thinkItOverCinematicActive: false, prefersReducedMotion: false };

  it("active during normal gameplay", () => {
    expect(computeAtmosphereFlickerActive(base)).toBe(true);
  });

  it("off on menu, briefing, death, win, monsterDefeated, loading screens", () => {
    for (const screen of ["menu", "loading", "briefing", "death", "win", "monsterDefeated"] as const) {
      expect(computeAtmosphereFlickerActive({ ...base, screen })).toBe(false);
    }
  });

  it("off during the emergency minigame (viz zadání 'v minihře se má řídit jejím vlastním vizuálním stavem')", () => {
    expect(computeAtmosphereFlickerActive({ ...base, activeMiniGame: true })).toBe(false);
  });

  it("off during the 'think it over' cinematic", () => {
    expect(computeAtmosphereFlickerActive({ ...base, thinkItOverCinematicActive: true })).toBe(false);
  });

  it("off when prefers-reduced-motion is set, even during normal gameplay", () => {
    expect(computeAtmosphereFlickerActive({ ...base, prefersReducedMotion: true })).toBe(false);
  });
});
