import { describe, expect, it } from "vitest";
import { isOfficeBreachResolved, resolveOfficeBreachPhase } from "./officeBreachAftermath";
import { RoomBulbsState } from "./types";

function bulbs(broken: boolean): RoomBulbsState {
  return { nearRoom: { remainingMs: broken ? 0 : 10_000, maxMs: 10_000, broken } };
}

describe("resolveOfficeBreachPhase", () => {
  it("null when officeBreachAftermathActive is false, regardless of the other fields", () => {
    expect(
      resolveOfficeBreachPhase({
        officeBreachAftermathActive: false,
        doorClosed: false,
        generatorState: "criticalBeeping",
        roomBulbs: bulbs(true),
      }),
    ).toBeNull();
  });

  it("close_door when active and the door is still open, regardless of generator/bulb", () => {
    expect(
      resolveOfficeBreachPhase({
        officeBreachAftermathActive: true,
        doorClosed: false,
        generatorState: "normal",
        roomBulbs: bulbs(false),
      }),
    ).toBe("close_door");
  });

  it("restart_generator once the door is closed but the generator is still faulted", () => {
    expect(
      resolveOfficeBreachPhase({
        officeBreachAftermathActive: true,
        doorClosed: true,
        generatorState: "criticalBeeping",
        roomBulbs: bulbs(true),
      }),
    ).toBe("restart_generator");
  });

  it("restart_generator also for silentFault/restarting (any non-normal state)", () => {
    expect(
      resolveOfficeBreachPhase({
        officeBreachAftermathActive: true,
        doorClosed: true,
        generatorState: "silentFault",
        roomBulbs: bulbs(true),
      }),
    ).toBe("restart_generator");
  });

  it("replace_bulb once the door is closed and generator is normal, but the bulb is still broken", () => {
    expect(
      resolveOfficeBreachPhase({
        officeBreachAftermathActive: true,
        doorClosed: true,
        generatorState: "normal",
        roomBulbs: bulbs(true),
      }),
    ).toBe("replace_bulb");
  });

  it("null once all three steps are resolved (door closed, generator normal, bulb fixed)", () => {
    expect(
      resolveOfficeBreachPhase({
        officeBreachAftermathActive: true,
        doorClosed: true,
        generatorState: "normal",
        roomBulbs: bulbs(false),
      }),
    ).toBeNull();
  });

  it("phases follow the required order: door -> generator -> bulb, never skipping ahead", () => {
    // Door still open AND generator still faulted AND bulb still broken -> door wins.
    expect(
      resolveOfficeBreachPhase({
        officeBreachAftermathActive: true,
        doorClosed: false,
        generatorState: "criticalBeeping",
        roomBulbs: bulbs(true),
      }),
    ).toBe("close_door");
  });
});

describe("isOfficeBreachResolved", () => {
  it("true only when door closed AND generator normal AND bulb not broken", () => {
    expect(isOfficeBreachResolved({ doorClosed: true, generatorState: "normal", bulbBroken: false })).toBe(true);
  });

  it("false if the door is still open", () => {
    expect(isOfficeBreachResolved({ doorClosed: false, generatorState: "normal", bulbBroken: false })).toBe(false);
  });

  it("false if the generator is not normal", () => {
    expect(isOfficeBreachResolved({ doorClosed: true, generatorState: "criticalBeeping", bulbBroken: false })).toBe(false);
  });

  it("false if the bulb is still broken", () => {
    expect(isOfficeBreachResolved({ doorClosed: true, generatorState: "normal", bulbBroken: true })).toBe(false);
  });
});
