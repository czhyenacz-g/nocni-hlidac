import { CAMERA_MAINTENANCE_WINDUP_DURATION_MS } from "../balancing/constants";

// Čistá odvozená hodnota z GameState.cameraMaintenanceWindup.progressMs —
// LeftWallView z ní počítá progress bar, stejný vzor jako
// computeEmergencyRunWindupProgressRatio.
export function computeCameraMaintenanceWindupProgressRatio(progressMs: number): number {
  return Math.min(1, Math.max(0, progressMs / CAMERA_MAINTENANCE_WINDUP_DURATION_MS));
}
