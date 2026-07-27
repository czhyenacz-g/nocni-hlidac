import { describe, expect, it } from "vitest";
import { shouldAcceptSnapshot } from "./protocol";

describe("shouldAcceptSnapshot", () => {
  it("accepts a snapshot with a higher seq than the last applied one", () => {
    expect(shouldAcceptSnapshot(5, 6)).toBe(true);
  });

  it("rejects a snapshot with the same seq (duplicate delivery)", () => {
    expect(shouldAcceptSnapshot(5, 5)).toBe(false);
  });

  it("rejects a snapshot with a lower seq (out-of-order/stale delivery)", () => {
    expect(shouldAcceptSnapshot(5, 3)).toBe(false);
  });

  it("accepts the very first snapshot (lastAppliedSeq starts at 0)", () => {
    expect(shouldAcceptSnapshot(0, 1)).toBe(true);
  });
});
