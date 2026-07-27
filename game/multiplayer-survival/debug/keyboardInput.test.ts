import { describe, expect, it } from "vitest";
import { EMPTY_KEYBOARD_MOVE_STATE, resolveMoveVectorFromKeys } from "./keyboardInput";

describe("resolveMoveVectorFromKeys", () => {
  it("returns zero vector when no key is pressed", () => {
    expect(resolveMoveVectorFromKeys(EMPTY_KEYBOARD_MOVE_STATE)).toEqual({ moveX: 0, moveY: 0 });
  });

  it("returns a unit vector for a single direction", () => {
    expect(resolveMoveVectorFromKeys({ ...EMPTY_KEYBOARD_MOVE_STATE, right: true })).toEqual({ moveX: 1, moveY: 0 });
  });

  it("normalizes diagonal movement so it is not faster than cardinal movement", () => {
    const { moveX, moveY } = resolveMoveVectorFromKeys({ ...EMPTY_KEYBOARD_MOVE_STATE, right: true, down: true });
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    expect(length).toBeCloseTo(1);
  });

  it("cancels out opposite keys", () => {
    expect(resolveMoveVectorFromKeys({ ...EMPTY_KEYBOARD_MOVE_STATE, left: true, right: true })).toEqual({ moveX: 0, moveY: 0 });
  });
});
