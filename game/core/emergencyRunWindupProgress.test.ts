import { describe, expect, it } from "vitest";
import { computeEmergencyRunWindupProgressRatio } from "./emergencyRunWindupProgress";
import { EMERGENCY_RUN_WINDUP_DURATION_MS } from "../balancing/constants";

describe("computeEmergencyRunWindupProgressRatio", () => {
  it("is 0 at the start", () => {
    expect(computeEmergencyRunWindupProgressRatio(0)).toBe(0);
  });

  it("is 0.5 at half the duration", () => {
    expect(computeEmergencyRunWindupProgressRatio(EMERGENCY_RUN_WINDUP_DURATION_MS / 2)).toBe(0.5);
  });

  it("is 1 at completion", () => {
    expect(computeEmergencyRunWindupProgressRatio(EMERGENCY_RUN_WINDUP_DURATION_MS)).toBe(1);
  });

  it("clamps to 1 above the duration", () => {
    expect(computeEmergencyRunWindupProgressRatio(EMERGENCY_RUN_WINDUP_DURATION_MS * 2)).toBe(1);
  });
});
