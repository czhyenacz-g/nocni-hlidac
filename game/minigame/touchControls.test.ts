import { describe, expect, it } from "vitest";
import {
  NO_TEXT_SELECT_STYLE,
  canShowMobileFireButton,
  canShowReturnButton,
  computeMoveTowardsTarget,
  isMobileFireButtonDisabled,
  isMoveTargetMarkerVisible,
  isTouchCapableDevice,
  resolveMoveTargetFromWorldPoint,
  shouldAutoCollectItem,
  shouldHandleMapPointerEvent,
} from "./touchControls";

describe("computeMoveTowardsTarget", () => {
  it("steps towards a far target without arriving", () => {
    const result = computeMoveTowardsTarget(0, 0, { x: 100, y: 0 }, 5, 6);
    expect(result.arrived).toBe(false);
    expect(result.dx).toBeCloseTo(5);
    expect(result.dy).toBeCloseTo(0);
  });

  it("stops (dx=dy=0, arrived=true) once inside the arrival radius", () => {
    const result = computeMoveTowardsTarget(10, 10, { x: 12, y: 10 }, 5, 6);
    expect(result.arrived).toBe(true);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
  });

  it("never overshoots the target when speed exceeds remaining distance", () => {
    const result = computeMoveTowardsTarget(0, 0, { x: 10, y: 0 }, 100, 6);
    expect(result.dx).toBeCloseTo(10);
    expect(result.dy).toBeCloseTo(0);
  });
});

describe("resolveMoveTargetFromWorldPoint", () => {
  it("passes through points already inside the map", () => {
    expect(resolveMoveTargetFromWorldPoint(300, 200, 1000, 650)).toEqual({ x: 300, y: 200 });
  });

  it("clamps points outside the map bounds", () => {
    expect(resolveMoveTargetFromWorldPoint(-50, 9000, 1000, 650)).toEqual({ x: 0, y: 650 });
  });

  it("a tap inside the office/exit zone resolves to a valid in-bounds target", () => {
    // Zóna kanceláře je vždy uvnitř mapy — tap dovnitř tedy nikdy neořízne souřadnice.
    expect(resolveMoveTargetFromWorldPoint(120, 80, 1000, 650)).toEqual({ x: 120, y: 80 });
  });
});

describe("shouldHandleMapPointerEvent", () => {
  it("handles the tap when the event target is the map surface itself", () => {
    expect(shouldHandleMapPointerEvent(true)).toBe(true);
  });

  it("ignores the tap when it originated from a UI control, not the map", () => {
    expect(shouldHandleMapPointerEvent(false)).toBe(false);
  });
});

describe("isMoveTargetMarkerVisible", () => {
  it("is visible right after being set", () => {
    expect(isMoveTargetMarkerVisible(0, 900)).toBe(true);
  });

  it("disappears after the configured duration", () => {
    expect(isMoveTargetMarkerVisible(901, 900)).toBe(false);
  });
});

describe("shouldAutoCollectItem", () => {
  const base = {
    objective: "collect_item" as const,
    missionPhase: "outbound" as const,
    playerX: 100,
    playerY: 100,
    playerRadius: 14,
    itemPosition: { x: 105, y: 100 },
    itemRadius: 10,
  };

  it("triggers when the player is within the pickup radius", () => {
    expect(shouldAutoCollectItem(base)).toBe(true);
  });

  it("does not trigger outside the pickup radius", () => {
    expect(shouldAutoCollectItem({ ...base, itemPosition: { x: 500, y: 500 } })).toBe(false);
  });

  it("does not trigger once the mission has moved past outbound", () => {
    expect(shouldAutoCollectItem({ ...base, missionPhase: "returning" })).toBe(false);
  });

  it("does not trigger for objectives other than collect_item", () => {
    expect(shouldAutoCollectItem({ ...base, objective: "return_to_office" })).toBe(false);
  });
});

describe("canShowReturnButton", () => {
  const base = {
    status: "playing" as const,
    inExitZone: true,
    objective: "collect_item" as const,
    mission: { phase: "returning" as const },
    hasLeftStartZone: true,
  };

  it("shows the button when the player is in the exit zone and can actually return", () => {
    expect(canShowReturnButton(base, true)).toBe(true);
  });

  it("hides the button when the player cannot return yet", () => {
    expect(canShowReturnButton(base, false)).toBe(false);
  });

  it("hides the button when the player is not standing in the exit zone", () => {
    expect(canShowReturnButton({ ...base, inExitZone: false }, true)).toBe(false);
  });
});

describe("isTouchCapableDevice", () => {
  it("is true for a coarse pointer", () => {
    expect(isTouchCapableDevice({ matchesCoarsePointer: true, hasTouchSupport: false })).toBe(true);
  });

  it("is true for touch support without a coarse pointer match", () => {
    expect(isTouchCapableDevice({ matchesCoarsePointer: false, hasTouchSupport: true })).toBe(true);
  });

  it("is false for a regular mouse/trackpad desktop", () => {
    expect(isTouchCapableDevice({ matchesCoarsePointer: false, hasTouchSupport: false })).toBe(false);
  });
});

describe("canShowMobileFireButton", () => {
  it("shows on touch devices when the player has a shotgun", () => {
    expect(canShowMobileFireButton({ isTouchDevice: true, hasShotgun: true })).toBe(true);
  });

  it("hides on desktop even with a shotgun", () => {
    expect(canShowMobileFireButton({ isTouchDevice: false, hasShotgun: true })).toBe(false);
  });

  it("hides on touch devices without a shotgun", () => {
    expect(canShowMobileFireButton({ isTouchDevice: true, hasShotgun: false })).toBe(false);
  });
});

describe("isMobileFireButtonDisabled", () => {
  it("is disabled at 0 ammo", () => {
    expect(isMobileFireButtonDisabled(0)).toBe(true);
  });

  it("is enabled with at least 1 ammo", () => {
    expect(isMobileFireButtonDisabled(1)).toBe(false);
  });
});

describe("NO_TEXT_SELECT_STYLE", () => {
  it("disables text selection and iOS long-press callout", () => {
    expect(NO_TEXT_SELECT_STYLE).toEqual({
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTouchCallout: "none",
    });
  });
});
