import { describe, expect, it } from "vitest";
import { CAMERA_DISABLED_OVERLAY_DURATION_MS, GHOUL_CAMERA_DISABLED_MESSAGE } from "./cameraDisabledRadioMessage";

// Hook-level chování (useCameraDisabledRadioMessage.ts) sdílí stejný
// `[seq]`-keyed useEffect + cleanup vzor jako useMonsterRepelRadioMessage.ts/
// useRadioMessage.ts (žádná renderHook infrastruktura v projektu, viz audit
// u zadání) — testuje se proto jen datová definice tady + skutečné
// vícenásobné/no-overlap chování na úrovni reduceru
// (gameReducer.cameraDamage.test.ts "cameraOfflineSeq" testy).

describe("GHOUL_CAMERA_DISABLED_MESSAGE", () => {
  it("20. has the exact required text", () => {
    expect(GHOUL_CAMERA_DISABLED_MESSAGE.text).toBe("To monstrum vyřadilo kameru! Opravit to půjde až ráno!");
  });

  it("5. audioSrc is null — text-only variant works without it", () => {
    expect(GHOUL_CAMERA_DISABLED_MESSAGE.audioSrc).toBeNull();
  });

  it("has a stable id for future audio wiring", () => {
    expect(GHOUL_CAMERA_DISABLED_MESSAGE.id).toBe("ghoul-camera-disabled");
  });
});

describe("CAMERA_DISABLED_OVERLAY_DURATION_MS", () => {
  it("is within the requested ~4-5s window", () => {
    expect(CAMERA_DISABLED_OVERLAY_DURATION_MS).toBeGreaterThanOrEqual(4000);
    expect(CAMERA_DISABLED_OVERLAY_DURATION_MS).toBeLessThanOrEqual(5000);
  });
});
