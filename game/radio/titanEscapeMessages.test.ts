import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  pickRandomTitanEscapeMessage,
  resolveTitanEscapeOverlayDurationMs,
  TITAN_ESCAPE_MESSAGES,
  TitanEscapeMessage,
} from "./titanEscapeMessages";

const EXPECTED_TEXTS = [
  "Sakra, Titan utekl! Dveře ani světla ho nezastaví. Vymyslete něco silnějšího!",
  "Titan je venku! Běžná obrana nefunguje. Použijte všechno, co máte!",
  "Nezastřelíte ho ani neudržíte za dveřmi. Něco vymyslete, rychle!",
  "Titan míří k vám! Zbraně jsou k ničemu. Potřebujete větší sílu!",
  "Bože… Titan unikl. Použijte něco, co dokáže vyřadit celý systém!",
];

describe("TITAN_ESCAPE_MESSAGES", () => {
  it("has exactly 5 variants", () => {
    expect(TITAN_ESCAPE_MESSAGES).toHaveLength(5);
  });

  it("has unique ids", () => {
    const ids = TITAN_ESCAPE_MESSAGES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique audioSrc paths", () => {
    const srcs = TITAN_ESCAPE_MESSAGES.map((m) => m.audioSrc);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it("text mapping matches the exact fixed spec, in order", () => {
    expect(TITAN_ESCAPE_MESSAGES.map((m) => m.text)).toEqual(EXPECTED_TEXTS);
  });

  it("every audioSrc points at a file that actually exists under public/", () => {
    for (const message of TITAN_ESCAPE_MESSAGES) {
      const absolutePath = join(process.cwd(), "public", message.audioSrc);
      expect(existsSync(absolutePath), `missing file for ${message.id}: ${absolutePath}`).toBe(true);
    }
  });

  it("every audioSrc lives under public/object_13/sound/titan_escape/ following the project's naming convention", () => {
    for (const message of TITAN_ESCAPE_MESSAGES) {
      expect(message.audioSrc).toMatch(/^\/object_13\/sound\/titan_escape\/titan_escape_0[1-5]\.mp3$/);
    }
  });

  it("no cut file is empty (verifies real speech was actually captured in the split)", () => {
    for (const message of TITAN_ESCAPE_MESSAGES) {
      const absolutePath = join(process.cwd(), "public", message.audioSrc);
      const size = statSync(absolutePath).size;
      expect(size, `${message.id} is suspiciously small/empty: ${size} bytes`).toBeGreaterThan(10_000);
    }
  });
});

describe("pickRandomTitanEscapeMessage", () => {
  it("returns one of the 5 registered variants", () => {
    for (let i = 0; i < 20; i++) {
      const picked = pickRandomTitanEscapeMessage();
      expect(picked).not.toBeNull();
      expect(TITAN_ESCAPE_MESSAGES).toContainEqual(picked);
    }
  });

  it("returns null for an empty pool, never throws", () => {
    expect(() => pickRandomTitanEscapeMessage([])).not.toThrow();
    expect(pickRandomTitanEscapeMessage([])).toBeNull();
  });

  it("only ever picks from a real, registered variant — never a fabricated one", () => {
    const singleton: TitanEscapeMessage[] = [TITAN_ESCAPE_MESSAGES[2]];
    for (let i = 0; i < 10; i++) {
      expect(pickRandomTitanEscapeMessage(singleton)).toBe(TITAN_ESCAPE_MESSAGES[2]);
    }
  });
});

describe("resolveTitanEscapeOverlayDurationMs", () => {
  it("returns a positive duration for every registered message id", () => {
    for (const message of TITAN_ESCAPE_MESSAGES) {
      expect(resolveTitanEscapeOverlayDurationMs(message.id)).toBeGreaterThan(0);
    }
  });

  it("falls back to a safe non-crashing value (just the tail) for an unregistered id", () => {
    expect(() => resolveTitanEscapeOverlayDurationMs("not_a_real_event" as never)).not.toThrow();
    expect(resolveTitanEscapeOverlayDurationMs("not_a_real_event" as never)).toBeGreaterThan(0);
  });
});
