import { describe, expect, it } from "vitest";
import { GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS, GHOUL_CAMERA_ATTACK_WARNING_TEXT } from "./ghoulCameraAttackWarningMessage";

// Hook-level chování (useGhoulCameraAttackWarningMessage.ts) sdílí stejný
// `[seq]`-keyed useEffect + cleanup vzor jako ostatní radio hooks (žádná
// renderHook infrastruktura v projektu, viz cameraDisabledRadioMessage.test.ts)
// — testuje se proto jen datová definice tady.

describe("GHOUL_CAMERA_ATTACK_WARNING_TEXT", () => {
  it("is the exact warning text from the spec", () => {
    expect(GHOUL_CAMERA_ATTACK_WARNING_TEXT).toBe("To ne! Sonické dělo přilákalo ghoula!");
  });
});

describe("GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS", () => {
  it("is a positive, short-lived duration", () => {
    expect(GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS).toBeGreaterThan(0);
    expect(GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS).toBeLessThan(10_000);
  });
});
