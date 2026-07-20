import { describe, expect, it } from "vitest";
import { IMP_CAMERA_ASSETS, IMP_PRESENTATION, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION } from "./monsterPresentation";
import { BACKGROUND_SCENES } from "../visuals/backgroundImages";
import { getCameraImageSrc } from "../cameras/cameraAssets.object13";
import { CameraId } from "../core/types";

const ALL_CAMERA_IDS: CameraId[] = ["outer_yard", "right_hallway", "left_hallway", "door_hallway"];

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

// Titan camera visuals (viz zadání "9. TITAN CAMERA VISUALS") — Titan zatím
// nemá vlastní kamerový art pro žádnou běžnou stage, jen prázdné sady pro
// všechny čtyři CameraId. getCameraImageSrc musí na tomhle vstupu VŽDY
// vrátit `null` (bezpečný fallback na prázdnou kameru), nikdy nespadnout.
describe("TITAN_CAMERA_ASSETS — safe empty fallback, never crashes", () => {
  it("has an entry for every CameraId, all with empty normal/monster/fleeing arrays", () => {
    for (const cameraId of ALL_CAMERA_IDS) {
      const entry = TITAN_CAMERA_ASSETS[cameraId];
      expect(entry).toBeDefined();
      expect(entry.default).toEqual({ normal: [], monster: [], fleeing: [] });
    }
  });

  it("getCameraImageSrc returns null (never throws) for every camera, with or without the monster present", () => {
    for (const cameraId of ALL_CAMERA_IDS) {
      for (const hasMonster of [true, false]) {
        expect(() =>
          getCameraImageSrc(cameraId, hasMonster, false, 0, "outer_yard", undefined, 0, TITAN_PRESENTATION.camera),
        ).not.toThrow();
        expect(getCameraImageSrc(cameraId, hasMonster, false, 0, "outer_yard", undefined, 0, TITAN_PRESENTATION.camera)).toBeNull();
      }
    }
  });

  it("TITAN_PRESENTATION has no cameraByEnemyStage (no at_door art either) — getCameraImageSrc still degrades gracefully", () => {
    expect(TITAN_PRESENTATION.cameraByEnemyStage).toBeUndefined();
    expect(
      getCameraImageSrc(
        "door_hallway",
        true,
        false,
        0,
        "at_door",
        undefined,
        0,
        TITAN_PRESENTATION.camera,
        TITAN_PRESENTATION.cameraByEnemyStage,
      ),
    ).toBeNull();
  });
});
