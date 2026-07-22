import { describe, expect, it } from "vitest";
import { getCameraImageSrc } from "./cameraAssets.object13";
import { isNearRoomLightActive } from "../core/roomBulbs";
import { createInitialGameState } from "../core/gameState";
import { NIGHT_01 } from "../nights/night01";
import { IMP_CAMERA_ASSETS, IMP_PRESENTATION } from "../enemies/monsterPresentation";

// Testy tady záměrně používají IMP_CAMERA_ASSETS/IMP_PRESENTATION.cameraByEnemyStage
// jako fixturu (jediná reálná data v projektu dnes), ale getCameraImageSrc
// samo o sobě žádné monstrum nezná — cameraAssets/cameraByEnemyStage jsou
// POVINNÉ parametry, žádný výchozí fallback (viz zadání "dokončit skutečné
// vlastnictví kamerových assetů monstrem").
const cameraAssets = IMP_CAMERA_ASSETS;
const cameraByEnemyStage = IMP_PRESENTATION.cameraByEnemyStage;

describe("getCameraImageSrc — door_hallway at_door special case", () => {
  it("shows the dark near-door frame when enemyStage is at_door and light is off", () => {
    expect(getCameraImageSrc("door_hallway", false, false, 0, "at_door", undefined, 0, cameraAssets, cameraByEnemyStage)).toBe(
      "/object_13/camera/door_hallway/door_hallway_10_monster_at_door.webp",
    );
  });

  it("shows the lit near-door frame when enemyStage is at_door and light is on", () => {
    expect(getCameraImageSrc("door_hallway", false, true, 0, "at_door", undefined, 0, cameraAssets, cameraByEnemyStage)).toBe(
      "/object_13/camera/door_hallway_light/door_hallway_light_10_monster_at_door.webp",
    );
  });

  it("takes priority over hasMonster for at_door, regardless of hasMonster value", () => {
    expect(getCameraImageSrc("door_hallway", true, false, 0, "at_door", undefined, 0, cameraAssets, cameraByEnemyStage)).toBe(
      "/object_13/camera/door_hallway/door_hallway_10_monster_at_door.webp",
    );
  });

  it("does not apply to other enemy stages on door_hallway", () => {
    const src = getCameraImageSrc("door_hallway", true, false, 0, "door_hallway", undefined, 0, cameraAssets, cameraByEnemyStage);
    expect(src).not.toContain("at_door");
  });

  it("does not apply to at_door on other cameras (stays scoped to door_hallway only)", () => {
    const src = getCameraImageSrc("outer_yard", false, false, 0, "at_door", undefined, 0, cameraAssets, cameraByEnemyStage);
    expect(src).not.toContain("at_door");
  });

  it("falls back to normal behavior when enemyStage is omitted", () => {
    const src = getCameraImageSrc("door_hallway", false, false, 0, undefined, undefined, 0, cameraAssets, cameraByEnemyStage);
    expect(src).not.toContain("at_door");
  });

  it("falls through to normal camera logic when no cameraByEnemyStage is supplied", () => {
    const src = getCameraImageSrc("door_hallway", false, false, 0, "at_door", undefined, 0, cameraAssets);
    expect(src).not.toContain("at_door");
  });
});

describe("getCameraImageSrc — fleeing_monster (retreat)", () => {
  // Záměrně NEZÁVISÍ na monsterRetreatedTo/monsterRetreatVerified (ty řídí
  // jen bezpečnost otevření dveří) — jen na `lastEnemyDecision`, ať fleeing
  // funguje i pro obyčejnou náhodnou 10% šanci na ústup v ENEMY_ADVANCE
  // ("retreat"), ne jen pro vynucené ústupy (viz zadání "funguje fleeing i
  // při náhodném ústupu, kdy si to bestie sama rozmyslí?" — ANO).
  it("shows the fleeing asset for a plain random retreat decision ('retreat')", () => {
    const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat", 0, cameraAssets);
    expect(src).toBe("/object_13/camera/left_hallway/left_hallway_fleeing_monster.webp");
  });

  it("works the same for outer_yard (outdoor)", () => {
    const src = getCameraImageSrc("outer_yard", true, false, 0, "outer_yard", "retreat", 0, cameraAssets);
    expect(src).toBe("/object_13/camera/outdoor/outdoor_fleeing_monster.webp");
  });

  it("also shows fleeing for the forced-retreat decisions (gave_up, light_repelled, hallway_light_repelled, monster_hit_confirmed)", () => {
    for (const decision of ["gave_up", "light_repelled", "hallway_light_repelled", "monster_hit_confirmed"] as const) {
      const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", decision, 0, cameraAssets);
      expect(src).toContain("fleeing_monster");
    }
  });

  it("takes priority over the regular monster asset", () => {
    const regular = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "stay", 0, cameraAssets);
    const fleeing = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat", 0, cameraAssets);
    expect(fleeing).not.toBe(regular);
    expect(fleeing).toContain("fleeing_monster");
  });

  it("does not show fleeing for a non-retreat decision (advance/stay)", () => {
    expect(getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "advance", 0, cameraAssets)).not.toContain(
      "fleeing_monster",
    );
    expect(getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "stay", 0, cameraAssets)).not.toContain(
      "fleeing_monster",
    );
  });

  it("does not show fleeing when lastEnemyDecision is omitted", () => {
    const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", undefined, 0, cameraAssets);
    expect(src).not.toContain("fleeing_monster");
  });
});

describe("door_hallway camera never shows the lit variant when the bulb is broken", () => {
  it("uses the dark set for door_hallway even with lightOn === true at the switch, once bulb.broken", () => {
    const state = {
      ...createInitialGameState(NIGHT_01),
      lightOn: true,
      roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } },
    };
    // Stejný krok jako DeskView.tsx: reálný stav světla, ne surový přepínač.
    const realLightOn = isNearRoomLightActive(state);
    expect(realLightOn).toBe(false);

    const src = getCameraImageSrc("door_hallway", false, realLightOn, 0, state.enemyStage, undefined, 0, cameraAssets, cameraByEnemyStage);
    expect(src).not.toContain("door_hallway_light");
  });
});

describe("getCameraImageSrc — door_hallway fleeing (hallway UV retreat)", () => {
  // Viz gameReducer.ts#updateDoorHallwayUvRepel — na hallway UV retreatu se
  // enemyStage přesune na jednu z MONSTER_RETREAT_CANDIDATES
  // (right_hallway/left_hallway/outer_yard), nikdy zůstane na "door_hallway"
  // (to je stage, KDE se retreat spustil, ne kam nepřítel odešel). Tenhle
  // test jen ověřuje, že door_hallway kamera samotná (obecný mechanismus,
  // stejný jako u ostatních kamer) používá lightOn variantu fleeing setu,
  // kdyby jako cíl retreatu zůstala.
  it("uses the lit fleeing asset when UV is still on", () => {
    const src = getCameraImageSrc("door_hallway", true, true, 0, "door_hallway", "hallway_light_repelled", 0, cameraAssets);
    expect(src).toBe("/object_13/camera/door_hallway_light/door_hallway_light_fleeing_monster.webp");
  });

  it("falls back to the dark fleeing asset when UV is off", () => {
    const src = getCameraImageSrc("door_hallway", true, false, 0, "door_hallway", "hallway_light_repelled", 0, cameraAssets);
    expect(src).toBe("/object_13/camera/door_hallway/door_hallway_fleeing_monster.webp");
  });
});

describe("getCameraImageSrc — enemyStageVisitSeq drives monster/fleeing image variety", () => {
  // right_hallway má 4 monster snímky (viz IMP_CAMERA_ASSETS) — dost na to,
  // aby se přes několik různých seq hodnot projevila variabilita, ne jen
  // shoda náhodou. Bez enemyStageVisitSeq v seedu (viz zadání "pořád ty
  // samé") by tenhle test padal, protože by všechny seq hodnoty vracely
  // stejný snímek.
  it("picks a different monster image for different enemyStageVisitSeq values on the same camera/stage", () => {
    const picks = new Set<string | null>();
    for (let seq = 0; seq < 10; seq++) {
      picks.add(getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance", seq, cameraAssets));
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it("stays stable (same image) for the same enemyStageVisitSeq across repeated calls", () => {
    const first = getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance", 3, cameraAssets);
    const second = getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance", 3, cameraAssets);
    expect(first).toBe(second);
  });

  it("also varies the fleeing image by enemyStageVisitSeq when a camera has multiple fleeing assets", () => {
    // left_hallway má 2 fleeing snímky (viz IMP_CAMERA_ASSETS) — dost na to,
    // aby se přes několik různých seq hodnot projevila variabilita, stejně
    // jako u monster testu výše. Ostatní kamery mají jen 1 fleeing asset
    // (žádná variabilita možná), proto tenhle test cílí právě na left_hallway.
    const picks = new Set<string | null>();
    for (let seq = 0; seq < 10; seq++) {
      picks.add(getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat", seq, cameraAssets));
    }
    expect(picks.size).toBeGreaterThan(1);
    for (const pick of picks) {
      expect(pick).toContain("fleeing_monster");
    }

    const first = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat", 3, cameraAssets);
    const second = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat", 3, cameraAssets);
    expect(first).toBe(second);
  });
});

describe("getCameraImageSrc — explicit asset dependency (no implicit Imp fallback)", () => {
  it("returns null for a camera missing from the supplied cameraAssets, never borrowing another registry", () => {
    const partialAssets = { door_hallway: cameraAssets.door_hallway } as typeof cameraAssets;
    const src = getCameraImageSrc("outer_yard", false, false, 0, undefined, undefined, 0, partialAssets);
    expect(src).toBeNull();
  });
});
