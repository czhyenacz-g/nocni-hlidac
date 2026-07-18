import { describe, expect, it } from "vitest";
import { IMP_CAMERA_ASSETS, IMP_PRESENTATION } from "./monsterPresentation";
import { BACKGROUND_SCENES } from "../visuals/backgroundImages";

// Čistě datové testy `IMP_PRESENTATION` samotné — testy PŘÍSTUPU k prezentaci
// přes jediný registr (getMonsterDefinition("imp").presentation) žijí v
// monsterDefinitions.test.ts, ne tady (viz zadání "sjednoť definici Impa" —
// žádný samostatný presentation registr už neexistuje).

describe("IMP_PRESENTATION.camera", () => {
  it("points at Imp's own IMP_CAMERA_ASSETS registry — no shared universal registry, no duplicated data", () => {
    expect(IMP_PRESENTATION.camera).toBe(IMP_CAMERA_ASSETS);
  });
});

describe("IMP_PRESENTATION.cameraByEnemyStage.at_door", () => {
  it("owns the at_door assets as single-element variant arrays (visually identical to the old single-path constant)", () => {
    expect(IMP_PRESENTATION.cameraByEnemyStage?.at_door).toEqual({
      default: ["/object_13/camera/door_hallway/door_hallway_10_monster_at_door.webp"],
      lightOn: ["/object_13/camera/door_hallway_light/door_hallway_light_10_monster_at_door.webp"],
    });
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
