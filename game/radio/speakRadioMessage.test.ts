import { describe, expect, it, vi } from "vitest";
import { resolveRadioFallbackDurationMs, speakRadioMessage } from "./speakRadioMessage";

// Vitest tady běží ve výchozím "node" prostředí (žádné jsdom, žádný `window`
// global) — stejná konvence jako game/core/monsterDefeatReward.ts SSR testy.
// To je přesně scénář "speechSynthesis není dostupný" (viz zadání "fallback
// funguje bez speechSynthesis"), bez potřeby cokoliv mockovat.
describe("speakRadioMessage — no speechSynthesis available (SSR/unsupported)", () => {
  it("reports supported: false and never calls onEnd on its own", () => {
    const onEnd = vi.fn();
    const result = speakRadioMessage("Testovací subjekt č. 4 vypuštěn.", onEnd);
    expect(result.supported).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("cancel() is a safe no-op", () => {
    const result = speakRadioMessage("Testovací subjekt č. 4 vypuštěn.", () => {});
    expect(() => result.cancel()).not.toThrow();
  });
});

describe("resolveRadioFallbackDurationMs", () => {
  it("clamps a very short text up to the 3s minimum", () => {
    expect(resolveRadioFallbackDurationMs("Ok.")).toBe(3000);
  });

  it("clamps a very long text down to the 4s maximum", () => {
    const longText = "x".repeat(200);
    expect(resolveRadioFallbackDurationMs(longText)).toBe(4000);
  });

  it("scales with text length within the 3-4s range", () => {
    // "Testovací subjekt č. 4 vypuštěn." is 33 chars — 33*70=2310, clamped to 3000.
    const text = "Testovací subjekt č. 4 vypuštěn.";
    const duration = resolveRadioFallbackDurationMs(text);
    expect(duration).toBeGreaterThanOrEqual(3000);
    expect(duration).toBeLessThanOrEqual(4000);
  });
});
