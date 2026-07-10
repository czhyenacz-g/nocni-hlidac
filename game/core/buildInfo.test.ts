import { describe, expect, it } from "vitest";
import { formatBuildNumber } from "./buildInfo";

describe("formatBuildNumber", () => {
  it("formats an ISO timestamp as YYMMDDHHmm in UTC", () => {
    expect(formatBuildNumber("2026-07-10T16:32:00.000Z")).toBe("2607101632");
  });

  it("pads single-digit month/day/hour/minute with a leading zero", () => {
    expect(formatBuildNumber("2026-01-05T03:07:00.000Z")).toBe("2601050307");
  });

  it("falls back to all-zero placeholder for an invalid timestamp", () => {
    expect(formatBuildNumber("not-a-date")).toBe("0000000000");
  });
});
