import { describe, expect, it } from "vitest";
import { resolveNightBriefingKey } from "./nightBriefing";
import { COPY_CS } from "./copy";
import { COPY_EN } from "./copy.en";

describe("resolveNightBriefingKey", () => {
  it("nights 1-4 and 6 each resolve to their own dedicated key", () => {
    expect(resolveNightBriefingKey(1)).toBe("night1");
    expect(resolveNightBriefingKey(2)).toBe("night2");
    expect(resolveNightBriefingKey(3)).toBe("night3");
    expect(resolveNightBriefingKey(4)).toBe("night4");
    expect(resolveNightBriefingKey(6)).toBe("night6");
  });

  // Noc 5 je Titanovo pevné první setkání (viz hlavička souboru) — sdílí
  // fallback stejně jako 7+.
  it("night 5 and every night from 7 upward fall back to the shared 'fallback' key", () => {
    for (const nightNumber of [5, 7, 8, 9, 10, 50, 999]) {
      expect(resolveNightBriefingKey(nightNumber)).toBe("fallback");
    }
  });

  it("every returned key resolves to a real, non-empty entry in both COPY_CS and COPY_EN", () => {
    for (const nightNumber of [1, 2, 3, 4, 5, 6, 7, 999]) {
      const key = resolveNightBriefingKey(nightNumber);
      expect(COPY_CS.nightBriefing[key].lines.length).toBeGreaterThan(0);
      expect(COPY_EN.nightBriefing[key].lines.length).toBeGreaterThan(0);
      for (const line of COPY_CS.nightBriefing[key].lines) expect(line.length).toBeGreaterThan(0);
      for (const line of COPY_EN.nightBriefing[key].lines) expect(line.length).toBeGreaterThan(0);
    }
  });
});
