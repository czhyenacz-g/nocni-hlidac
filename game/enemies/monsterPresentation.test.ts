import { describe, expect, it } from "vitest";
import { IMP_PRESENTATION } from "./monsterPresentation";
import { CAMERA_ASSETS } from "../cameras/cameraAssets.object13";
import { BACKGROUND_SCENES } from "../visuals/backgroundImages";

// Čistě datové testy `IMP_PRESENTATION` samotné — testy PŘÍSTUPU k prezentaci
// přes jediný registr (getMonsterDefinition("imp").presentation) žijí v
// monsterDefinitions.test.ts, ne tady (viz zadání "sjednoť definici Impa" —
// žádný samostatný presentation registr už neexistuje).

describe("IMP_PRESENTATION.camera", () => {
  it("points at the existing CAMERA_ASSETS registry — no duplicated data", () => {
    expect(IMP_PRESENTATION.camera).toBe(CAMERA_ASSETS);
  });
});

describe("4/5. outcomes.playerKill.default — same death sequence as before, just reachable via the presentation", () => {
  it("playerKill.default points at the existing 'death' background scene", () => {
    expect(IMP_PRESENTATION.outcomes.playerKill.default).toBe("death");
    expect(BACKGROUND_SCENES[IMP_PRESENTATION.outcomes.playerKill.default]).toBe(BACKGROUND_SCENES.death);
  });

  it("monsterDeath points at the existing 'monsterDefeated' background scene (a genuinely separate, already-existing sequence)", () => {
    expect(IMP_PRESENTATION.outcomes.monsterDeath).toBe("monsterDefeated");
    expect(BACKGROUND_SCENES.monsterDefeated).toBeDefined();
  });

  it("doorAttackFailed is left undefined — no distinct visual sequence exists for a blocked closed-door attack today", () => {
    expect(IMP_PRESENTATION.outcomes.doorAttackFailed).toBeUndefined();
  });
});
