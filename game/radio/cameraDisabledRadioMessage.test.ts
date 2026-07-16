import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CAMERA_DISABLED_RADIO_MESSAGES,
  CameraDisabledRadioMessage,
  pickRandomCameraDisabledMessage,
  resolveCameraDisabledOverlayDurationMs,
} from "./cameraDisabledRadioMessage";
import { AUDIO_EVENTS } from "../audio/audioEvents";

// Hook-level chování (useCameraDisabledRadioMessage.ts) sdílí stejný
// `[seq]`-keyed useEffect + cleanup vzor jako useMonsterRepelRadioMessage.ts/
// useRadioMessage.ts (žádná renderHook infrastruktura v projektu, viz audit
// u zadání) — testuje se proto jen datová definice tady + skutečné
// vícenásobné/no-overlap chování na úrovni reduceru
// (gameReducer.cameraDamage.test.ts "cameraOfflineSeq" testy).

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CAMERA_DISABLED_RADIO_MESSAGES", () => {
  it("has exactly three variants (the source recording's fourth segment was unintelligible and was dropped)", () => {
    expect(CAMERA_DISABLED_RADIO_MESSAGES).toHaveLength(3);
  });

  it("every variant has a non-empty text and a real audioSrc (never null)", () => {
    for (const message of CAMERA_DISABLED_RADIO_MESSAGES) {
      expect(message.text.length).toBeGreaterThan(0);
      expect(message.audioSrc).toMatch(/^\/object_13\/sound\/camera_destroid\/radio_camera_destroyed_\d\.mp3$/);
    }
  });

  it("contains the exact transcribed lines", () => {
    const texts = CAMERA_DISABLED_RADIO_MESSAGES.map((m) => m.text);
    expect(texts).toEqual(["No, tak do rána jsme po tmě.", "Kamera zničena!", "Zbývá už jenom mikrofon."]);
  });

  it("ids map to the three dedicated audio events", () => {
    const ids = CAMERA_DISABLED_RADIO_MESSAGES.map((m) => m.id);
    expect(ids).toEqual([AUDIO_EVENTS.radioCameraDestroyed0, AUDIO_EVENTS.radioCameraDestroyed1, AUDIO_EVENTS.radioCameraDestroyed2]);
  });
});

describe("pickRandomCameraDisabledMessage", () => {
  it("picks a message from the given pool according to Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandomCameraDisabledMessage(CAMERA_DISABLED_RADIO_MESSAGES)).toBe(CAMERA_DISABLED_RADIO_MESSAGES[0]);
  });

  it("picks the last message when the roll is just under 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(pickRandomCameraDisabledMessage(CAMERA_DISABLED_RADIO_MESSAGES)).toBe(CAMERA_DISABLED_RADIO_MESSAGES[2]);
  });

  it("defaults to the real manifest", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandomCameraDisabledMessage()).toBe(CAMERA_DISABLED_RADIO_MESSAGES[0]);
  });

  it("returns null for an empty pool, never throws", () => {
    const empty: CameraDisabledRadioMessage[] = [];
    expect(pickRandomCameraDisabledMessage(empty)).toBeNull();
  });
});

describe("resolveCameraDisabledOverlayDurationMs", () => {
  it("returns a sensible positive duration for each known variant", () => {
    for (const message of CAMERA_DISABLED_RADIO_MESSAGES) {
      expect(resolveCameraDisabledOverlayDurationMs(message.id)).toBeGreaterThan(1000);
    }
  });

  it("falls back to just the tail reserve for an unknown id, never throws", () => {
    expect(resolveCameraDisabledOverlayDurationMs(AUDIO_EVENTS.uiClick)).toBeGreaterThan(0);
  });
});
