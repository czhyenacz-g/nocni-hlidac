import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  pickRandomReleaseMonsterMessage,
  RELEASE_MONSTER_MESSAGES,
  ReleaseMonsterMessage,
  resolveReleaseMonsterOverlayDurationMs,
} from "./releaseMonsterMessages";
import { AUDIO_EVENTS } from "../audio/audioEvents";

describe("RELEASE_MONSTER_MESSAGES", () => {
  it("is not empty", () => {
    expect(RELEASE_MONSTER_MESSAGES.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = RELEASE_MONSTER_MESSAGES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique audioSrc paths", () => {
    const srcs = RELEASE_MONSTER_MESSAGES.map((m) => m.audioSrc);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  // Vitest tady běží ve výchozím "node" prostředí (žádné jsdom) — `public/`
  // je proto přístupné rovnou přes node:fs, žádný mock/server potřeba (viz
  // stejná konvence jako game/radio/speakRadioMessage.test.ts komentář
  // o node prostředí).
  it("every audioSrc points at a file that actually exists under public/", () => {
    for (const message of RELEASE_MONSTER_MESSAGES) {
      const absolutePath = join(process.cwd(), "public", message.audioSrc);
      expect(existsSync(absolutePath), `missing file for ${message.id}: ${absolutePath}`).toBe(true);
    }
  });

  // Zdrojový dlouhý záznam (viz zadání "Nevkládej ho do herního random
  // poolu") — patří do public/object_13/sound/release_monster/source/, ne
  // mezi jednotlivé release_monster_XX.mp3 varianty.
  it("never includes the long raw source recording", () => {
    for (const message of RELEASE_MONSTER_MESSAGES) {
      expect(message.audioSrc).not.toContain("release_monster_raw");
      expect(message.audioSrc).not.toContain("/source/");
    }
  });

  it("ids are all radioReleaseMonster* audio events", () => {
    const validIds = new Set<string>([
      AUDIO_EVENTS.radioReleaseMonster01,
      AUDIO_EVENTS.radioReleaseMonster02,
      AUDIO_EVENTS.radioReleaseMonster03,
      AUDIO_EVENTS.radioReleaseMonster04,
      AUDIO_EVENTS.radioReleaseMonster05,
      AUDIO_EVENTS.radioReleaseMonster06,
      AUDIO_EVENTS.radioReleaseMonster07,
      AUDIO_EVENTS.radioReleaseMonster08,
      AUDIO_EVENTS.radioReleaseMonster09,
      AUDIO_EVENTS.radioReleaseMonster10,
      AUDIO_EVENTS.radioReleaseMonster11,
    ]);
    for (const message of RELEASE_MONSTER_MESSAGES) {
      expect(validIds.has(message.id)).toBe(true);
    }
  });
});

describe("pickRandomReleaseMonsterMessage", () => {
  it("returns the only asset when the list has exactly one", () => {
    const only: ReleaseMonsterMessage = { id: AUDIO_EVENTS.radioReleaseMonster01, audioSrc: "/x.mp3" };
    expect(pickRandomReleaseMonsterMessage([only])).toBe(only);
  });

  it("always returns an item from the provided list", () => {
    for (let i = 0; i < 50; i++) {
      const picked = pickRandomReleaseMonsterMessage(RELEASE_MONSTER_MESSAGES);
      expect(picked).not.toBeNull();
      expect(RELEASE_MONSTER_MESSAGES).toContain(picked);
    }
  });

  it("returns null for an empty list instead of throwing", () => {
    expect(() => pickRandomReleaseMonsterMessage([])).not.toThrow();
    expect(pickRandomReleaseMonsterMessage([])).toBeNull();
  });

  it("defaults to the real RELEASE_MONSTER_MESSAGES manifest when called without arguments", () => {
    const picked = pickRandomReleaseMonsterMessage();
    expect(picked).not.toBeNull();
    expect(RELEASE_MONSTER_MESSAGES).toContain(picked);
  });
});

describe("resolveReleaseMonsterOverlayDurationMs", () => {
  it("returns a positive duration for every message in the manifest", () => {
    for (const message of RELEASE_MONSTER_MESSAGES) {
      expect(resolveReleaseMonsterOverlayDurationMs(message.id)).toBeGreaterThan(0);
    }
  });

  it("falls back to just the tail reserve (not a crash) for an unknown id", () => {
    expect(resolveReleaseMonsterOverlayDurationMs("not_a_real_event" as never)).toBeGreaterThanOrEqual(0);
  });
});
