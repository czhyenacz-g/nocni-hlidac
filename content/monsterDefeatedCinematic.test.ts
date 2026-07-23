import { describe, expect, it } from "vitest";
import {
  MONSTER_DEFEATED_CINEMATIC_AUDIO_SRC,
  MONSTER_DEFEATED_CINEMATIC_CAPTIONS,
  MONSTER_DEFEATED_CINEMATIC_DURATION_MS,
  resolveActiveCaptionIndex,
} from "./monsterDefeatedCinematic";
import { COPY_CS } from "./copy";

function captionText(id: string): string {
  return COPY_CS.monsterDefeatedCinematicCaptions[id as keyof typeof COPY_CS.monsterDefeatedCinematicCaptions];
}

describe("monsterDefeatedCinematic config", () => {
  it("points at the actual asset location", () => {
    expect(MONSTER_DEFEATED_CINEMATIC_AUDIO_SRC).toBe("/object_13/story/dead_monster_1.m4a");
  });

  it("has all 9 lines from the spec, in order, with corrected spelling", () => {
    const texts = MONSTER_DEFEATED_CINEMATIC_CAPTIONS.map((c) => captionText(c.id));
    expect(texts).toEqual([
      "Blahopřeji a uznávám, že už nejsi ucho!",
      "Máš v sobě ducha bojovníka.",
      "Věř mi ale, že ta bestie nebyla první, ani poslední.",
      "Přijdou další.",
      "Za odměnu pro tebe něco mám.",
      "Dal jsem ti to na stěnu v kanceláři.",
      "Chceš vědět, o čem to reálně je?",
      "Potkáme se až nastane 30. den...",
      "...nebo ve Valhale.",
    ]);
  });

  it("does not contain the original typo 'Věřmi'", () => {
    expect(MONSTER_DEFEATED_CINEMATIC_CAPTIONS.some((c) => captionText(c.id).includes("Věřmi"))).toBe(false);
  });

  it("starts at 0ms and is strictly increasing", () => {
    expect(MONSTER_DEFEATED_CINEMATIC_CAPTIONS[0].atMs).toBe(0);
    for (let i = 1; i < MONSTER_DEFEATED_CINEMATIC_CAPTIONS.length; i++) {
      expect(MONSTER_DEFEATED_CINEMATIC_CAPTIONS[i].atMs).toBeGreaterThan(MONSTER_DEFEATED_CINEMATIC_CAPTIONS[i - 1].atMs);
    }
  });

  it("every caption fits within the total duration", () => {
    for (const caption of MONSTER_DEFEATED_CINEMATIC_CAPTIONS) {
      expect(caption.atMs).toBeLessThanOrEqual(MONSTER_DEFEATED_CINEMATIC_DURATION_MS);
    }
  });
});

describe("resolveActiveCaptionIndex", () => {
  it("returns 0 at elapsedMs 0 (first caption always starts at 0)", () => {
    expect(resolveActiveCaptionIndex(MONSTER_DEFEATED_CINEMATIC_CAPTIONS, 0)).toBe(0);
  });

  it("returns the last caption whose atMs is <= elapsedMs", () => {
    expect(resolveActiveCaptionIndex(MONSTER_DEFEATED_CINEMATIC_CAPTIONS, 9000)).toBe(2);
  });

  it("does not advance to the next caption before its atMs", () => {
    const idx = resolveActiveCaptionIndex(MONSTER_DEFEATED_CINEMATIC_CAPTIONS, 5299);
    expect(idx).toBe(0);
  });

  it("advances exactly at the boundary atMs", () => {
    const idx = resolveActiveCaptionIndex(MONSTER_DEFEATED_CINEMATIC_CAPTIONS, 5300);
    expect(idx).toBe(1);
  });

  it("stays on the last caption past the end of the recording", () => {
    const idx = resolveActiveCaptionIndex(MONSTER_DEFEATED_CINEMATIC_CAPTIONS, 999_999);
    expect(idx).toBe(MONSTER_DEFEATED_CINEMATIC_CAPTIONS.length - 1);
  });

  it("returns null before the first caption on an empty list", () => {
    expect(resolveActiveCaptionIndex([], 0)).toBeNull();
  });
});
