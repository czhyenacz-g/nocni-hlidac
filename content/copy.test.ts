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

// Brokovnice — první krok k true endingu (viz game/core/shotgunEquipment.ts,
// components/game/LeftWallView.tsx). {ammo}/{max} nahrazují LeftWallView.tsx.
describe("COPY.game shotgun copy", () => {
  it("shotgunAcquiredLabel is a non-empty message", () => {
    expect(COPY.game.shotgunAcquiredLabel.length).toBeGreaterThan(0);
  });

  it("shotgunAmmoReadyLabel contains both placeholders", () => {
    expect(COPY.game.shotgunAmmoReadyLabel).toContain("{ammo}");
    expect(COPY.game.shotgunAmmoReadyLabel).toContain("{max}");
  });

  it("shotgunAmmoEmptyLabel is a non-empty message distinct from the ready label", () => {
    expect(COPY.game.shotgunAmmoEmptyLabel.length).toBeGreaterThan(0);
    expect(COPY.game.shotgunAmmoEmptyLabel).not.toBe(COPY.game.shotgunAmmoReadyLabel);
  });
});

// "Nechat si to projít hlavou" — vedlejší tlačítko vidět jen s brokovnicí
// (viz LeftWallView.tsx, game/core/thinkItOverWindup*.ts).
describe("COPY.game think-it-over copy", () => {
  it("startThinkItOverLabel is the exact required button text", () => {
    expect(COPY.game.startThinkItOverLabel).toBe("Nechat si to projít hlavou");
  });

  it("thinkItOverHoldingLabel contains the {seconds} placeholder", () => {
    expect(COPY.game.thinkItOverHoldingLabel).toContain("{seconds}");
  });

  it("thinkItOverResultLabel is the exact required message", () => {
    expect(COPY.game.thinkItOverResultLabel).toBe(
      "Nevzdávej se a bojuj! To monstrum určitě lze nějak zabít. Potřebuješ možná více ran, nebo větší kalibr.",
    );
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

// Death screen copy podle gameMode/livesRemaining (viz DeathScreen.tsx,
// game/core/gameMode.ts) — Normal se zbývajícím životem pokračuje,
// cokoliv jiné run definitivně ukončí.
describe("COPY.death mode-specific copy", () => {
  it("normal-continue copy mentions the remaining lives placeholder", () => {
    expect(COPY.death.normalContinueLivesLabel).toContain("{lives}");
    expect(COPY.death.normalContinueNightLabel).toContain("{night}");
    expect(COPY.death.normalContinueButton).toBe("POKRAČOVAT");
  });

  it("normal-game-over copy mentions lives running out and the Síň slávy exclusion", () => {
    expect(COPY.death.normalGameOverLabel).toContain("Životy došly");
    expect(COPY.death.normalGameOverButton).toBe("NOVÁ HRA");
    expect(COPY.death.normalLeaderboardNote).toContain("Síně slávy");
  });

  it("hardcore-game-over copy mentions the return to night 1", () => {
    expect(COPY.death.hardcoreGameOverLabel).toContain("noc 1");
    expect(COPY.death.hardcoreGameOverButton).toBe("NOVÁ HRA");
  });
});
