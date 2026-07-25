import { describe, expect, it } from "vitest";
import { computeCameraMaintenanceWindupProgressRatio } from "./cameraMaintenanceWindupProgress";
import { CAMERA_MAINTENANCE_WINDUP_DURATION_MS } from "../balancing/constants";

describe("computeCameraMaintenanceWindupProgressRatio", () => {
  it("is 0 at the start", () => {
    expect(computeCameraMaintenanceWindupProgressRatio(0)).toBe(0);
  });

  it("is 0.5 at half the duration", () => {
    expect(computeCameraMaintenanceWindupProgressRatio(CAMERA_MAINTENANCE_WINDUP_DURATION_MS / 2)).toBe(0.5);
  });

  it("is 1 at completion", () => {
    expect(computeCameraMaintenanceWindupProgressRatio(CAMERA_MAINTENANCE_WINDUP_DURATION_MS)).toBe(1);
  });

  it("clamps to 1 above the duration", () => {
    expect(computeCameraMaintenanceWindupProgressRatio(CAMERA_MAINTENANCE_WINDUP_DURATION_MS * 2)).toBe(1);
  });
});
