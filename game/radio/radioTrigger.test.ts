import { describe, expect, it } from "vitest";
import { advanceRadioTriggerTracker, createInitialRadioTriggerTracker } from "./radioTrigger";

const NIGHT = 4;

describe("advanceRadioTriggerTracker", () => {
  it("triggers on the first real transition from another stage into outer_yard", () => {
    let tracker = createInitialRadioTriggerTracker(NIGHT);

    // Monster starts "outside" — no transition into outer_yard yet.
    let result = advanceRadioTriggerTracker(tracker, NIGHT, "outside");
    expect(result.shouldTrigger).toBe(false);
    tracker = result.next;

    // Now it steps into outer_yard — a real transition, should trigger.
    result = advanceRadioTriggerTracker(tracker, NIGHT, "outer_yard");
    expect(result.shouldTrigger).toBe(true);
    tracker = result.next;
  });

  it("does NOT trigger if outer_yard is already the very first observed stage (no known previous stage)", () => {
    const tracker = createInitialRadioTriggerTracker(NIGHT);
    const result = advanceRadioTriggerTracker(tracker, NIGHT, "outer_yard");
    expect(result.shouldTrigger).toBe(false);
  });

  it("does not trigger again when the monster returns to outer_yard later the same night", () => {
    let tracker = createInitialRadioTriggerTracker(NIGHT);
    tracker = advanceRadioTriggerTracker(tracker, NIGHT, "outside").next;
    let result = advanceRadioTriggerTracker(tracker, NIGHT, "outer_yard");
    expect(result.shouldTrigger).toBe(true);
    tracker = result.next;

    // Monster moves on, then comes back to outer_yard again — same night.
    tracker = advanceRadioTriggerTracker(tracker, NIGHT, "right_hallway").next;
    tracker = advanceRadioTriggerTracker(tracker, NIGHT, "outer_yard").next;
    result = advanceRadioTriggerTracker(tracker, NIGHT, "left_hallway");
    tracker = result.next;
    result = advanceRadioTriggerTracker(tracker, NIGHT, "outer_yard");
    expect(result.shouldTrigger).toBe(false);
  });

  it("can trigger again on a new night after already triggering on a previous night", () => {
    let tracker = createInitialRadioTriggerTracker(NIGHT);
    tracker = advanceRadioTriggerTracker(tracker, NIGHT, "outside").next;
    tracker = advanceRadioTriggerTracker(tracker, NIGHT, "outer_yard").next;
    expect(tracker.triggeredThisNight).toBe(true);

    const nextNight = NIGHT + 1;
    let result = advanceRadioTriggerTracker(tracker, nextNight, "outside");
    expect(result.shouldTrigger).toBe(false);
    tracker = result.next;

    result = advanceRadioTriggerTracker(tracker, nextNight, "outer_yard");
    expect(result.shouldTrigger).toBe(true);
  });

  it("never triggers while the monster passes through unrelated stages", () => {
    let tracker = createInitialRadioTriggerTracker(NIGHT);
    for (const stage of ["outside", "right_hallway", "door_hallway", "at_door", "attack"] as const) {
      const result = advanceRadioTriggerTracker(tracker, NIGHT, stage);
      expect(result.shouldTrigger).toBe(false);
      tracker = result.next;
    }
  });

  it("is idempotent when called repeatedly with the same (night, stage) pair (React Strict Mode double-invoke safety)", () => {
    let tracker = createInitialRadioTriggerTracker(NIGHT);
    tracker = advanceRadioTriggerTracker(tracker, NIGHT, "outside").next;

    // First real transition into outer_yard.
    const first = advanceRadioTriggerTracker(tracker, NIGHT, "outer_yard");
    expect(first.shouldTrigger).toBe(true);

    // Strict Mode re-invokes the same effect body again with the exact same
    // (night, stage) input, using the tracker state already advanced by the
    // first call — must NOT trigger a second time.
    const second = advanceRadioTriggerTracker(first.next, NIGHT, "outer_yard");
    expect(second.shouldTrigger).toBe(false);
  });
});
