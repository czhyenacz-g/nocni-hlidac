import { describe, expect, it } from "vitest";
import { COPY } from "./copy";

// Přesný text hlášky po návratu z minihry s aktivní officeThreatOnReturn
// (viz zadání, app/play/page.tsx#handleEmergencyMiniGameComplete) — dvouřádkový
// (\n), ať se hráč hned dozví, že má zavřít dveře.
describe("COPY.game.emergencyRunThreatFollowedLabel", () => {
  it("is the exact required two-line warning", () => {
    expect(COPY.game.emergencyRunThreatFollowedLabel).toBe("Zdá se, že se nevracíš sám.\nZavři dveře!");
  });
});
