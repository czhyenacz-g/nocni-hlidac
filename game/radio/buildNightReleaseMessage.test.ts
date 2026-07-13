import { describe, expect, it } from "vitest";
import { buildNightReleaseMessage } from "./buildNightReleaseMessage";

describe("buildNightReleaseMessage", () => {
  it("includes the exact night number in the required format", () => {
    expect(buildNightReleaseMessage(4)).toBe("Testovací subjekt č. 4 vypuštěn.");
  });

  it("works for night 1", () => {
    expect(buildNightReleaseMessage(1)).toBe("Testovací subjekt č. 1 vypuštěn.");
  });

  it("works for a much later night", () => {
    expect(buildNightReleaseMessage(30)).toBe("Testovací subjekt č. 30 vypuštěn.");
  });
});
