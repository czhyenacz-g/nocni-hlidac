import { describe, expect, it } from "vitest";
import { chooseDoorBangPlaybackPlan } from "./doorBangPlayback";
import { MONSTER_DOOR_BANG_REPEAT_MAX_DELAY_MS, MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS } from "../balancing/constants";

// Sekvenční mock random — vrací hodnoty z fronty v pořadí volání, ať jde
// nezávisle kontrolovat "kolikátý random() rozhoduje count" a "kolikátý
// rozhoduje repeatDelayMs".
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe("chooseDoorBangPlaybackPlan", () => {
  it("random < 0.5 => count 1, no repeatDelayMs", () => {
    const plan = chooseDoorBangPlaybackPlan(sequence(0));
    expect(plan.count).toBe(1);
    expect(plan.repeatDelayMs).toBeUndefined();
  });

  it("random just under 0.5 => still count 1", () => {
    const plan = chooseDoorBangPlaybackPlan(sequence(0.49999));
    expect(plan.count).toBe(1);
  });

  it("random >= 0.5 => count 2, with a repeatDelayMs", () => {
    const plan = chooseDoorBangPlaybackPlan(sequence(0.5, 0.5));
    expect(plan.count).toBe(2);
    expect(plan.repeatDelayMs).toBeDefined();
  });

  it("repeatDelayMs is at the minimum when the second random() call returns 0", () => {
    const plan = chooseDoorBangPlaybackPlan(sequence(0.9, 0));
    expect(plan.count).toBe(2);
    expect(plan.repeatDelayMs).toBe(MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS);
  });

  it("repeatDelayMs is at the maximum when the second random() call returns just under 1", () => {
    const plan = chooseDoorBangPlaybackPlan(sequence(0.9, 0.999999));
    expect(plan.count).toBe(2);
    expect(plan.repeatDelayMs).toBeGreaterThan(MONSTER_DOOR_BANG_REPEAT_MAX_DELAY_MS - 1);
    expect(plan.repeatDelayMs).toBeLessThanOrEqual(MONSTER_DOOR_BANG_REPEAT_MAX_DELAY_MS);
  });

  it("repeatDelayMs always stays within [MIN, MAX] across many random draws", () => {
    for (let i = 0; i < 200; i++) {
      const plan = chooseDoorBangPlaybackPlan(Math.random);
      if (plan.count === 2) {
        expect(plan.repeatDelayMs).toBeGreaterThanOrEqual(MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS);
        expect(plan.repeatDelayMs).toBeLessThanOrEqual(MONSTER_DOOR_BANG_REPEAT_MAX_DELAY_MS);
      } else {
        expect(plan.repeatDelayMs).toBeUndefined();
      }
    }
  });

  it("defaults to Math.random when no random function is provided", () => {
    const plan = chooseDoorBangPlaybackPlan();
    expect([1, 2]).toContain(plan.count);
  });
});
