import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MONSTER_REPEL_RADIO_MESSAGES,
  MonsterRepelRadioMessage,
  pickRandomMonsterRepelMessage,
  resolveMonsterRepelOverlayDurationMs,
  TITAN_NO_EFFECT_DISPLAY_MS,
} from "./monsterRepelRadioMessages";

const CATEGORIES = ["success", "stay", "fail"] as const;

describe("MONSTER_REPEL_RADIO_MESSAGES", () => {
  it("has all three canonical categories: success, stay, fail", () => {
    for (const category of CATEGORIES) {
      expect(MONSTER_REPEL_RADIO_MESSAGES[category]).toBeDefined();
    }
  });

  it("every category has at least one variant after slicing", () => {
    for (const category of CATEGORIES) {
      expect(MONSTER_REPEL_RADIO_MESSAGES[category].length).toBeGreaterThan(0);
    }
  });

  it("ids are unique across ALL categories combined", () => {
    const allIds = CATEGORIES.flatMap((category) => MONSTER_REPEL_RADIO_MESSAGES[category].map((m) => m.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("audioSrc paths are unique across ALL categories combined", () => {
    const allSrcs = CATEGORIES.flatMap((category) => MONSTER_REPEL_RADIO_MESSAGES[category].map((m) => m.audioSrc));
    expect(new Set(allSrcs).size).toBe(allSrcs.length);
  });

  it("every audioSrc points at a file that actually exists under public/", () => {
    for (const category of CATEGORIES) {
      for (const message of MONSTER_REPEL_RADIO_MESSAGES[category]) {
        const absolutePath = join(process.cwd(), "public", message.audioSrc);
        expect(existsSync(absolutePath), `missing file for ${message.id}: ${absolutePath}`).toBe(true);
      }
    }
  });

  it("never includes the long raw source recordings (repel_success/stay/failed.wav)", () => {
    for (const category of CATEGORIES) {
      for (const message of MONSTER_REPEL_RADIO_MESSAGES[category]) {
        expect(message.audioSrc).not.toMatch(/repel_(success|stay|failed)\.wav$/);
      }
    }
  });
});

// Titan je na sonické dělo imunní (viz zadání "4. SONICKÉ DĚLO PROTI
// TITANOVI") — vlastní kategorie BEZ jakékoliv nahrávky (žádný nový audio
// asset nebyl součástí zadání), jen pevný text "Bez efektu" (viz
// useMonsterRepelRadioMessage.ts#resolveResultLabel).
describe("MONSTER_REPEL_RADIO_MESSAGES.no_effect — Titan's immunity, no audio asset", () => {
  it("is registered as an empty list (no recorded variants)", () => {
    expect(MONSTER_REPEL_RADIO_MESSAGES.no_effect).toEqual([]);
  });

  it("pickRandomMonsterRepelMessage returns null for it, never throws", () => {
    expect(() => pickRandomMonsterRepelMessage("no_effect")).not.toThrow();
    expect(pickRandomMonsterRepelMessage("no_effect")).toBeNull();
  });

  it("has a positive fallback display duration (used since there's no audio file length to derive it from)", () => {
    expect(TITAN_NO_EFFECT_DISPLAY_MS).toBeGreaterThan(0);
  });
});

describe("pickRandomMonsterRepelMessage", () => {
  it("always returns an item from the requested category's own list", () => {
    for (const category of CATEGORIES) {
      for (let i = 0; i < 30; i++) {
        const picked = pickRandomMonsterRepelMessage(category);
        expect(picked).not.toBeNull();
        expect(MONSTER_REPEL_RADIO_MESSAGES[category]).toContain(picked);
      }
    }
  });

  it("returns the only asset when a custom list has exactly one item", () => {
    const only: MonsterRepelRadioMessage = { id: MONSTER_REPEL_RADIO_MESSAGES.stay[0].id, audioSrc: "/x.mp3" };
    expect(pickRandomMonsterRepelMessage("stay", [only])).toBe(only);
  });

  it("returns null for an empty category list instead of throwing", () => {
    expect(() => pickRandomMonsterRepelMessage("fail", [])).not.toThrow();
    expect(pickRandomMonsterRepelMessage("fail", [])).toBeNull();
  });
});

describe("resolveMonsterRepelOverlayDurationMs", () => {
  it("returns a positive duration for every message in every category", () => {
    for (const category of CATEGORIES) {
      for (const message of MONSTER_REPEL_RADIO_MESSAGES[category]) {
        expect(resolveMonsterRepelOverlayDurationMs(message.id)).toBeGreaterThan(0);
      }
    }
  });

  it("falls back to just the tail reserve (not a crash) for an unknown id", () => {
    expect(resolveMonsterRepelOverlayDurationMs("not_a_real_event" as never)).toBeGreaterThanOrEqual(0);
  });
});
