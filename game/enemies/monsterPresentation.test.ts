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

// Titan camera visuals (viz zadání "Napoj Titanovy kamerové vizuály", opraveno
// v "regresní bug — kamery během Titana zobrazují jen Titana") — každá ze
// čtyř běžných CameraId má vlastní monster-přítomný obrázek (viz
// TITAN_CAMERA_PATH v monsterPresentation.ts, ověřeně kompletní kompozitní
// záběry). `normal` sdílí Impovo pole pro stejnou fyzickou kameru (žádný
// Titan-specific "bez monstra" art, ale lokace je stejná bez ohledu na
// monstrum), `fleeing` zůstává prázdné (Titan nikdy neustupuje).
describe("TITAN_CAMERA_ASSETS — real monster art per stage, empty-only for truly unsupported cases", () => {
  it("11. outer_yard uses outdoor_titan.webp", () => {
    expect(TITAN_CAMERA_ASSETS.outer_yard.default.monster).toEqual(["/object_13/monster/titan/outdoor_titan.webp"]);
  });

  it("11. left_hallway uses left_hallway_titan.webp", () => {
    expect(TITAN_CAMERA_ASSETS.left_hallway.default.monster).toEqual(["/object_13/monster/titan/left_hallway_titan.webp"]);
  });

  it("11. right_hallway uses right_hallway_titan.webp", () => {
    expect(TITAN_CAMERA_ASSETS.right_hallway.default.monster).toEqual(["/object_13/monster/titan/right_hallway_titan.webp"]);
  });

  it("11. door_hallway without light uses titan_door_hallway.webp", () => {
    expect(TITAN_CAMERA_ASSETS.door_hallway.default.monster).toEqual(["/object_13/monster/titan/titan_door_hallway.webp"]);
  });

  it("11. door_hallway with light uses titan_door_hallway_light.webp", () => {
    expect(TITAN_CAMERA_ASSETS.door_hallway.lightOn?.monster).toEqual(["/object_13/monster/titan/titan_door_hallway_light.webp"]);
  });

  it("3. registry uses only .webp paths, never .png", () => {
    for (const entry of Object.values(TITAN_CAMERA_ASSETS)) {
      for (const set of [entry.default, entry.lightOn]) {
        if (!set) continue;
        for (const src of [...set.normal, ...set.monster, ...set.fleeing]) {
          expect(src.endsWith(".webp")).toBe(true);
          expect(src.endsWith(".png")).toBe(false);
        }
      }
    }
  });

  it("getCameraImageSrc resolves the real Titan asset for every normal stage when the monster is present", () => {
    expect(getCameraImageSrc("outer_yard", true, false, 0, "outer_yard", undefined, 0, TITAN_PRESENTATION.camera)).toBe(
      "/object_13/monster/titan/outdoor_titan.webp",
    );
    expect(getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", undefined, 0, TITAN_PRESENTATION.camera)).toBe(
      "/object_13/monster/titan/left_hallway_titan.webp",
    );
    expect(getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", undefined, 0, TITAN_PRESENTATION.camera)).toBe(
      "/object_13/monster/titan/right_hallway_titan.webp",
    );
    expect(getCameraImageSrc("door_hallway", true, false, 0, "door_hallway", undefined, 0, TITAN_PRESENTATION.camera)).toBe(
      "/object_13/monster/titan/titan_door_hallway.webp",
    );
    // 7/8. door_hallway light varianta — stejný `lightOn`/`resolveAssetSet`
    // mechanismus jako Imp, žádné nové Titan-specific "je světlo" pole.
    expect(getCameraImageSrc("door_hallway", true, true, 0, "door_hallway", undefined, 0, TITAN_PRESENTATION.camera)).toBe(
      "/object_13/monster/titan/titan_door_hallway_light.webp",
    );
  });

  it("without the monster present, these cameras fall back to Imp's shared base ('normal') shot for the same physical camera, never null/Titan art", () => {
    for (const cameraId of ALL_CAMERA_IDS) {
      const src = getCameraImageSrc(cameraId, false, false, 0, cameraId, undefined, 0, TITAN_PRESENTATION.camera);
      expect(src).not.toBeNull();
      expect(src).not.toContain("titan");
      expect(IMP_CAMERA_ASSETS[cameraId].default.normal).toContain(src);
    }
  });

  it("12. an unknown/unsupported CameraId still returns null, never throws", () => {
    expect(() =>
      getCameraImageSrc("not_a_real_camera" as CameraId, true, false, 0, "outer_yard", undefined, 0, TITAN_PRESENTATION.camera),
    ).not.toThrow();
    expect(getCameraImageSrc("not_a_real_camera" as CameraId, true, false, 0, "outer_yard", undefined, 0, TITAN_PRESENTATION.camera)).toBeNull();
  });

  it("9. 'outside' is not a CameraId at all — no camera ever shows a Titan asset for it (stays invisible by construction)", () => {
    expect(Object.keys(TITAN_CAMERA_ASSETS)).not.toContain("outside");
  });

  it("TITAN_PRESENTATION has no cameraByEnemyStage — at_door/breach/attack art lives in titanDoorAssets.ts/DoorView.tsx instead, unaffected by this registry", () => {
    // Bez `cameraByEnemyStage` override getCameraImageSrc pro "at_door"
    // spadne zpět na běžný door_hallway monster obrázek (teď už reálný, ne
    // `null`, viz zadání "Napoj Titanovy kamerové vizuály") — pořád ale
    // BEZE stage-specific "at_door" varianty, kterou Imp má
    // (door_hallway_10_monster_at_door.webp) a Titan nemá.
    expect(TITAN_PRESENTATION.cameraByEnemyStage).toBeUndefined();
    expect(
      getCameraImageSrc("door_hallway", true, false, 0, "at_door", undefined, 0, TITAN_PRESENTATION.camera, TITAN_PRESENTATION.cameraByEnemyStage),
    ).toBe("/object_13/monster/titan/titan_door_hallway.webp");
  });
});
