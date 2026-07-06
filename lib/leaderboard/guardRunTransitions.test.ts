import { describe, expect, it } from "vitest";
import { applyDeath, applySurviveNight } from "./guardRunTransitions";

describe("applySurviveNight", () => {
  it("increments currentRun by 1", () => {
    const result = applySurviveNight({ bestRun: 5, currentRun: 2 });
    expect(result.currentRun).toBe(3);
  });

  it("raises bestRun when currentRun surpasses it", () => {
    const result = applySurviveNight({ bestRun: 2, currentRun: 2 });
    expect(result.currentRun).toBe(3);
    expect(result.bestRun).toBe(3);
  });

  it("keeps bestRun unchanged when currentRun is still below it", () => {
    const result = applySurviveNight({ bestRun: 9, currentRun: 2 });
    expect(result.currentRun).toBe(3);
    expect(result.bestRun).toBe(9);
  });

  it("works from a fresh (0/0) state", () => {
    const result = applySurviveNight({ bestRun: 0, currentRun: 0 });
    expect(result).toEqual({ bestRun: 1, currentRun: 1 });
  });
});

describe("applyDeath", () => {
  it("resets currentRun to 0", () => {
    const result = applyDeath({ bestRun: 5, currentRun: 3 });
    expect(result.currentRun).toBe(0);
  });

  it("leaves bestRun unchanged", () => {
    const result = applyDeath({ bestRun: 7, currentRun: 4 });
    expect(result.bestRun).toBe(7);
  });

  it("is a no-op on an already-inactive run", () => {
    const result = applyDeath({ bestRun: 3, currentRun: 0 });
    expect(result).toEqual({ bestRun: 3, currentRun: 0 });
  });
});
