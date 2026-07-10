import { describe, expect, it } from "vitest";
import { computeAppVersion } from "./buildInfo";

describe("computeAppVersion", () => {
  it("is v1.00+HHmm on the epoch day itself", () => {
    expect(computeAppVersion("2026-07-01T00:05:00.000Z")).toBe("v1.00+0005");
  });

  it("counts days since the epoch for the day-in-cycle segment", () => {
    // 2026-07-10 is 9 full days after the 2026-07-01 epoch.
    expect(computeAppVersion("2026-07-10T16:32:00.000Z")).toBe("v1.09+1632");
  });

  it("rolls over to v2.00 exactly 100 days after the epoch", () => {
    // 2026-07-01 + 100 days = 2026-10-09.
    expect(computeAppVersion("2026-10-09T00:00:00.000Z")).toBe("v2.00+0000");
  });

  it("keeps counting within the second 100-day cycle before the next rollover", () => {
    expect(computeAppVersion("2026-10-10T12:00:00.000Z")).toBe("v2.01+1200");
  });

  it("clamps a build time before the epoch to day 0 instead of going negative", () => {
    expect(computeAppVersion("2020-01-01T00:00:00.000Z")).toBe("v1.00+0000");
  });

  it("falls back to day 0 / 00:00 for an invalid timestamp", () => {
    expect(computeAppVersion("not-a-date")).toBe("v1.00+0000");
  });
});
