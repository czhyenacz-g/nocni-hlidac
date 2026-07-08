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

// Přejmenování odkazu na žebříček v hlavním menu (viz components/screens/MainMenuScreen.tsx) —
// route/link zůstává /leaderboard, mění se jen viditelný text.
describe("COPY.menu.leaderboardLinkLabel", () => {
  it("uses the renamed 'Síň slávy hlídačů' label", () => {
    expect(COPY.menu.leaderboardLinkLabel).toBe("Síň slávy hlídačů");
  });
});

describe("COPY.gameMode", () => {
  it("has the exact NORMAL/HARDCORE mode labels", () => {
    expect(COPY.gameMode.normalLabel).toBe("NORMAL");
    expect(COPY.gameMode.hardcoreLabel).toBe("HARDCORE");
  });

  it("has the exact tooltip texts", () => {
    expect(COPY.gameMode.normalTooltip).toContain("3 životy");
    expect(COPY.gameMode.normalTooltip).toContain("Síně slávy");
    expect(COPY.gameMode.hardcoreTooltip).toContain("1 život");
    expect(COPY.gameMode.hardcoreTooltip).toContain("Discord");
  });

  it("has the exact hardcore login prompt text", () => {
    expect(COPY.gameMode.hardcoreLoginPromptText).toBe(
      "Hardcore režim se zapisuje do Síně slávy, proto vyžaduje přihlášení přes Discord.",
    );
    expect(COPY.gameMode.hardcoreLoginPromptStayNormalLabel).toBe("Zůstat v Normal");
  });
});
