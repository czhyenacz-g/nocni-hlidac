import { describe, expect, it } from "vitest";
import { classifyTensionBand, tensionToAtmosphereStyle } from "./visualEffects";

// Revize atmosféry (viz zadání "posun vizuálu od modře nasvíceného
// cyberpunkového UI k průmyslovému analogovému hororu") — regresní testy pro
// pásmové mapování saturace/kontrastu/jasu.

describe("classifyTensionBand", () => {
  it("low: [0, 0.33)", () => {
    expect(classifyTensionBand(0)).toBe("low");
    expect(classifyTensionBand(0.2)).toBe("low");
    expect(classifyTensionBand(0.32)).toBe("low");
  });

  it("medium: [0.33, 0.66)", () => {
    expect(classifyTensionBand(1 / 3)).toBe("medium");
    expect(classifyTensionBand(0.5)).toBe("medium");
    expect(classifyTensionBand(0.65)).toBe("medium");
  });

  it("high: [0.66, 0.9)", () => {
    expect(classifyTensionBand(2 / 3)).toBe("high");
    expect(classifyTensionBand(0.8)).toBe("high");
    expect(classifyTensionBand(0.89)).toBe("high");
  });

  it("critical: [0.9, 1]", () => {
    expect(classifyTensionBand(0.9)).toBe("critical");
    expect(classifyTensionBand(0.95)).toBe("critical");
    expect(classifyTensionBand(1)).toBe("critical");
  });
});

describe("tensionToAtmosphereStyle — saturation bands (viz zadání '2. Přepiš lineární mapování saturace na pásma')", () => {
  it("low tension (reprezentativní bod uprostřed pásma): saturation 0.65–0.75", () => {
    const { saturation } = tensionToAtmosphereStyle(0.165);
    expect(saturation).toBeGreaterThanOrEqual(0.65);
    expect(saturation).toBeLessThanOrEqual(0.75);
  });

  it("medium tension (reprezentativní bod uprostřed pásma): saturation 0.35–0.5", () => {
    const { saturation } = tensionToAtmosphereStyle(0.495);
    expect(saturation).toBeGreaterThanOrEqual(0.35);
    expect(saturation).toBeLessThanOrEqual(0.5);
  });

  it("high tension (reprezentativní bod uprostřed pásma): saturation 0.08–0.2", () => {
    const { saturation } = tensionToAtmosphereStyle(0.78);
    expect(saturation).toBeGreaterThanOrEqual(0.08);
    expect(saturation).toBeLessThanOrEqual(0.2);
  });

  it("critical/attack (tension 1): téměř černobílé", () => {
    const { saturation } = tensionToAtmosphereStyle(1);
    expect(saturation).toBeLessThan(0.05);
    expect(saturation).toBeGreaterThanOrEqual(0);
  });
});

describe("tensionToAtmosphereStyle — never fully colorful, even at rest", () => {
  it("saturation at tension 0 is still below 1 (viz zadání '1. sniž základní saturaci i při nízkém tensionLevel')", () => {
    const { saturation } = tensionToAtmosphereStyle(0);
    expect(saturation).toBeLessThan(1);
    expect(saturation).toBeGreaterThan(0);
  });

  it("saturation never exceeds 1 or drops below 0 across the full tension range", () => {
    for (let tension = 0; tension <= 1; tension += 0.05) {
      const { saturation } = tensionToAtmosphereStyle(tension);
      expect(saturation).toBeLessThanOrEqual(1);
      expect(saturation).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("tensionToAtmosphereStyle — smooth interpolation, no hard jumps", () => {
  it("saturation is monotonically non-increasing as tension rises", () => {
    let previous = tensionToAtmosphereStyle(0).saturation;
    for (let tension = 0.01; tension <= 1; tension += 0.01) {
      const { saturation } = tensionToAtmosphereStyle(tension);
      expect(saturation).toBeLessThanOrEqual(previous + 1e-9);
      previous = saturation;
    }
  });

  it("no single small step in tension produces a large discontinuous jump in saturation (continuous, not a hard threshold flip)", () => {
    const step = 0.01;
    let previous = tensionToAtmosphereStyle(0).saturation;
    for (let tension = step; tension <= 1; tension += step) {
      const { saturation } = tensionToAtmosphereStyle(tension);
      expect(Math.abs(saturation - previous)).toBeLessThan(0.05);
      previous = saturation;
    }
  });

  it("out-of-range tension values (negative / >1) clamp instead of extrapolating", () => {
    expect(tensionToAtmosphereStyle(-1)).toEqual(tensionToAtmosphereStyle(0));
    expect(tensionToAtmosphereStyle(2)).toEqual(tensionToAtmosphereStyle(1));
  });
});

describe("tensionToAtmosphereStyle — contrast rises, brightness falls gently", () => {
  it("contrast grows with tension", () => {
    expect(tensionToAtmosphereStyle(1).contrast).toBeGreaterThan(tensionToAtmosphereStyle(0).contrast);
    expect(tensionToAtmosphereStyle(0).contrast).toBe(1);
  });

  it("brightness falls only mildly (never drops below ~0.85, viz zadání 'kontrolní prvky zůstanou čitelné')", () => {
    const { brightness } = tensionToAtmosphereStyle(1);
    expect(brightness).toBeLessThan(1);
    expect(brightness).toBeGreaterThanOrEqual(0.85);
  });
});
