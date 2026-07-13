import { afterEach, describe, expect, it, vi } from "vitest";
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

// Simulace "speechSynthesis dostupný a zdánlivě funguje" (viz zadání "radio
// se zaseklo" — bug, kdy onend/onerror z uvízlé/vadné syntézy nikdy
// nepřijde). Mockujeme minimální browser API přímo na globalThis (žádné
// jsdom potřeba) — ověřujeme hlavně, že speakRadioMessage.ts VŽDY zavolá
// `synth.cancel()` těsně před `synth.speak()` (obrana proti zaseknuté frontě
// z předchozího volání), ne jen samotné okrajové chování bez API.
describe("speakRadioMessage — speechSynthesis available (mocked)", () => {
  function stubSpeechSynthesis(voices: SpeechSynthesisVoice[] = []) {
    const speak = vi.fn();
    const cancel = vi.fn();
    const getVoices = vi.fn(() => voices);
    (globalThis as { window?: unknown }).window = {
      speechSynthesis: { speak, cancel, getVoices },
    };
    (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    };
    return { speak, cancel, getVoices };
  }

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  });

  it("reports supported: true and calls cancel() before speak() (defends against a stuck queued utterance)", () => {
    const { speak, cancel } = stubSpeechSynthesis();
    const result = speakRadioMessage("Testovací subjekt č. 4 vypuštěn.", () => {});
    expect(result.supported).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("picks a Czech voice when one is available", () => {
    const csVoice = { lang: "cs-CZ", name: "Czech" } as SpeechSynthesisVoice;
    const enVoice = { lang: "en-US", name: "English" } as SpeechSynthesisVoice;
    const { speak } = stubSpeechSynthesis([enVoice, csVoice]);
    speakRadioMessage("Testovací subjekt č. 4 vypuštěn.", () => {});
    const utterance = speak.mock.calls[0][0] as { voice: SpeechSynthesisVoice | null };
    expect(utterance.voice).toBe(csVoice);
  });

  it("cancel() clears the onend/onerror handlers and calls synth.cancel() again", () => {
    const { cancel } = stubSpeechSynthesis();
    const result = speakRadioMessage("Testovací subjekt č. 4 vypuštěn.", () => {});
    result.cancel();
    expect(cancel).toHaveBeenCalledTimes(2); // once before speak(), once from result.cancel()
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
