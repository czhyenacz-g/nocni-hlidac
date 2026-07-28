import { describe, expect, it } from "vitest";
import { formatRemainingTime } from "./formatRoundTime";

describe("formatRemainingTime", () => {
  it("formats a full 5 minutes as 5:00", () => {
    expect(formatRemainingTime(5 * 60 * 1000)).toBe("5:00");
  });

  it("pads seconds under 10 with a leading zero", () => {
    expect(formatRemainingTime(65 * 1000)).toBe("1:05");
  });

  it("rounds up sub-second remainders so it never shows 0:00 while time is still left", () => {
    expect(formatRemainingTime(400)).toBe("0:01");
  });

  it("clamps negative input to 0:00 instead of showing a negative time", () => {
    expect(formatRemainingTime(-500)).toBe("0:00");
  });
});
