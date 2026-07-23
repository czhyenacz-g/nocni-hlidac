import { afterEach, describe, expect, it, vi } from "vitest";
import { AUDIO_EVENTS } from "../audio/audioEvents";
import {
  GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS,
  GHOUL_CAMERA_ATTACK_WARNING_SOUNDS,
  pickRandomGhoulCameraAttackWarningSound,
} from "./ghoulCameraAttackWarningMessage";
import { COPY_CS } from "../../content/copy";

afterEach(() => {
  vi.restoreAllMocks();
});

// Hook-level chování (useGhoulCameraAttackWarningMessage.ts) sdílí stejný
// `[seq]`-keyed useEffect + cleanup vzor jako ostatní radio hooks (žádná
// renderHook infrastruktura v projektu, viz cameraDisabledRadioMessage.test.ts)
// — testuje se proto jen datová definice tady.

describe("COPY_CS.radio.ghoulCameraAttackWarningText", () => {
  it("is the exact warning text from the spec", () => {
    expect(COPY_CS.radio.ghoulCameraAttackWarningText).toBe("To ne! Sonické dělo přilákalo ghoula!");
  });
});

describe("GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS", () => {
  it("is a positive, short-lived duration", () => {
    expect(GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS).toBeGreaterThan(0);
    expect(GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS).toBeLessThan(10_000);
  });
});

describe("GHOUL_CAMERA_ATTACK_WARNING_SOUNDS", () => {
  it("has exactly the two converted ghoul_appear variants", () => {
    expect(GHOUL_CAMERA_ATTACK_WARNING_SOUNDS).toEqual([AUDIO_EVENTS.ghoulCameraAttackWarning0, AUDIO_EVENTS.ghoulCameraAttackWarning1]);
  });
});

describe("pickRandomGhoulCameraAttackWarningSound", () => {
  it("picks the first variant on a low roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandomGhoulCameraAttackWarningSound()).toBe(AUDIO_EVENTS.ghoulCameraAttackWarning0);
  });

  it("picks the second variant on a high roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickRandomGhoulCameraAttackWarningSound()).toBe(AUDIO_EVENTS.ghoulCameraAttackWarning1);
  });

  it("returns null for an empty pool, never throws", () => {
    expect(pickRandomGhoulCameraAttackWarningSound([])).toBeNull();
  });
});
