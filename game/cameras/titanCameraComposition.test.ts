import { describe, expect, it } from "vitest";
import { getCameraImageSrc } from "./cameraAssets.object13";
import { IMP_CAMERA_ASSETS, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION } from "../enemies/monsterPresentation";
import { CameraId } from "../core/types";

// Regresní testy pro opravu "kamery během Titana zobrazují jen Titana,
// klasické záběry chybí" — TITAN_CAMERA_ASSETS dřív mělo prázdné `normal`
// pole pro každou kameru, takže `getCameraImageSrc` na kamerách BEZ Titana
// spadalo na `pickCycling([])` -> `null` (prázdná kamera), a na jediné
// kameře, kde Titan zrovna byl, se zobrazil jen samotný Titan obrázek bez
// jakéhokoliv jiného kontextu. Oprava: `normal` teď sdílí stejná pole jako
// IMP_CAMERA_ASSETS (stejná fyzická lokace/kamera, monstrum-nezávislá), a
// `monster` pole jsou ověřeně KOMPLETNÍ kompozitní záběry (celé prostředí +
// Titan), ne průhledný overlay — viz monsterPresentation.ts komentář.

const TITAN_CAMERAS: CameraId[] = ["outer_yard", "right_hallway", "left_hallway", "door_hallway"];

describe("Titan camera composition — every camera keeps its base shot", () => {
  it("without Titan present (hasMonster=false), every camera returns its normal base shot, never null", () => {
    for (const cameraId of TITAN_CAMERAS) {
      const src = getCameraImageSrc(cameraId, false, false, 0, undefined, undefined, 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
      expect(src).not.toBeNull();
    }
  });

  it("the base shot for each Titan camera is identical to Imp's base shot for the same physical camera (shared, monster-agnostic)", () => {
    for (const cameraId of TITAN_CAMERAS) {
      const src = getCameraImageSrc(cameraId, false, false, 0, undefined, undefined, 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
      expect(TITAN_CAMERA_ASSETS[cameraId].default.normal).toEqual(IMP_CAMERA_ASSETS[cameraId].default.normal);
      expect(src).not.toBeNull();
    }
  });

  it("Titan in outer_yard shows the Titan composite ONLY on the outer_yard camera — other cameras keep their normal base shot", () => {
    const outerYard = getCameraImageSrc("outer_yard", true, false, 0, "outer_yard", "advance", 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
    expect(outerYard).toBe("/object_13/monster/titan/outdoor_titan.webp");

    for (const cameraId of TITAN_CAMERAS.filter((id) => id !== "outer_yard")) {
      const src = getCameraImageSrc(cameraId, false, false, 0, "outer_yard", "advance", 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
      expect(src).not.toContain("titan");
      expect(src).not.toBeNull();
    }
  });

  it("Titan in left_hallway shows the Titan composite ONLY on the left_hallway camera", () => {
    const leftHallway = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "advance", 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
    expect(leftHallway).toBe("/object_13/monster/titan/left_hallway_titan.webp");

    for (const cameraId of TITAN_CAMERAS.filter((id) => id !== "left_hallway")) {
      const src = getCameraImageSrc(cameraId, false, false, 0, "left_hallway", "advance", 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
      expect(src).not.toContain("titan");
      expect(src).not.toBeNull();
    }
  });

  it("Titan in door_hallway shows the Titan composite ONLY on the door_hallway camera", () => {
    const doorHallway = getCameraImageSrc("door_hallway", true, false, 0, "door_hallway", "advance", 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
    expect(doorHallway).toBe("/object_13/monster/titan/titan_door_hallway.webp");

    for (const cameraId of TITAN_CAMERAS.filter((id) => id !== "door_hallway")) {
      const src = getCameraImageSrc(cameraId, false, false, 0, "door_hallway", "advance", 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
      expect(src).not.toContain("titan");
      expect(src).not.toBeNull();
    }
  });

  it("the Titan asset is never used as a global background — each non-matching camera resolves independently to its own normal shot", () => {
    const doorHallwayNormal = getCameraImageSrc("door_hallway", false, false, 0, "left_hallway", "advance", 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
    expect(doorHallwayNormal).toBe(IMP_CAMERA_ASSETS.door_hallway.default.normal[0] ?? doorHallwayNormal);
    expect(doorHallwayNormal).not.toBeNull();
  });

  it("after Titan's death (hasMonster becomes false everywhere), all cameras fall back to their normal base shot again", () => {
    for (const cameraId of TITAN_CAMERAS) {
      const src = getCameraImageSrc(cameraId, false, false, 0, "graveyard", undefined, 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
      expect(src).not.toBeNull();
      expect(src).not.toContain("titan");
    }
  });

  it("a fresh night (no Titan encounter state) never carries over a Titan overlay — hasMonster=false everywhere resolves to normal shots", () => {
    for (const cameraId of TITAN_CAMERAS) {
      const src = getCameraImageSrc(cameraId, false, false, 0, "outside", undefined, 0, TITAN_CAMERA_ASSETS, TITAN_PRESENTATION.cameraByEnemyStage);
      expect(src).not.toBeNull();
      expect(src).not.toContain("titan");
    }
  });
});
