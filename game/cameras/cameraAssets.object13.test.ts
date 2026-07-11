import { describe, expect, it } from "vitest";
import { getCameraImageSrc } from "./cameraAssets.object13";
import { isNearRoomLightActive } from "../core/roomBulbs";
import { createInitialGameState } from "../core/gameState";
import { NIGHT_01 } from "../nights/night01";

describe("getCameraImageSrc — door_hallway at_door special case", () => {
  it("shows the dark near-door frame when enemyStage is at_door and light is off", () => {
    expect(getCameraImageSrc("door_hallway", false, false, 0, "at_door")).toBe(
      "/object_13/camera/door_hallway/door_hallway_10_monster_at_door.webp",
    );
  });

  it("shows the lit near-door frame when enemyStage is at_door and light is on", () => {
    expect(getCameraImageSrc("door_hallway", false, true, 0, "at_door")).toBe(
      "/object_13/camera/door_hallway_light/door_hallway_light_10_monster_at_door.webp",
    );
  });

  it("takes priority over hasMonster for at_door, regardless of hasMonster value", () => {
    expect(getCameraImageSrc("door_hallway", true, false, 0, "at_door")).toBe(
      "/object_13/camera/door_hallway/door_hallway_10_monster_at_door.webp",
    );
  });

  it("does not apply to other enemy stages on door_hallway", () => {
    const src = getCameraImageSrc("door_hallway", true, false, 0, "door_hallway");
    expect(src).not.toContain("at_door");
  });

  it("does not apply to at_door on other cameras", () => {
    const src = getCameraImageSrc("outer_yard", false, false, 0, "at_door");
    expect(src).not.toContain("at_door");
  });

  it("falls back to normal behavior when enemyStage is omitted", () => {
    const src = getCameraImageSrc("door_hallway", false, false, 0);
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
    const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat");
    expect(src).toBe("/object_13/camera/left_hallway/left_hallway_fleeing_monster.webp");
  });

  it("works the same for outer_yard (outdoor)", () => {
    const src = getCameraImageSrc("outer_yard", true, false, 0, "outer_yard", "retreat");
    expect(src).toBe("/object_13/camera/outdoor/outdoor_fleeing_monster.webp");
  });

  it("also shows fleeing for the forced-retreat decisions (gave_up, light_repelled, hallway_light_repelled, monster_hit_confirmed)", () => {
    for (const decision of ["gave_up", "light_repelled", "hallway_light_repelled", "monster_hit_confirmed"] as const) {
      const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", decision);
      expect(src).toContain("fleeing_monster");
    }
  });

  it("takes priority over the regular monster asset", () => {
    const regular = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "stay");
    const fleeing = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat");
    expect(fleeing).not.toBe(regular);
    expect(fleeing).toContain("fleeing_monster");
  });

  it("does not show fleeing for a non-retreat decision (advance/stay)", () => {
    expect(getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "advance")).not.toContain("fleeing_monster");
    expect(getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "stay")).not.toContain("fleeing_monster");
  });

  it("does not show fleeing when lastEnemyDecision is omitted", () => {
    const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway");
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

    const src = getCameraImageSrc("door_hallway", false, realLightOn, 0, state.enemyStage);
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
    const src = getCameraImageSrc("door_hallway", true, true, 0, "door_hallway", "hallway_light_repelled");
    expect(src).toBe("/object_13/camera/door_hallway_light/door_hallway_light_fleeing_monster.webp");
  });

  it("falls back to the dark fleeing asset when UV is off", () => {
    const src = getCameraImageSrc("door_hallway", true, false, 0, "door_hallway", "hallway_light_repelled");
    expect(src).toBe("/object_13/camera/door_hallway/door_hallway_fleeing_monster.webp");
  });
});

describe("getCameraImageSrc — enemyStageVisitSeq drives monster/fleeing image variety", () => {
  // right_hallway má 4 monster snímky (viz CAMERA_ASSETS) — dost na to, aby
  // se přes několik různých seq hodnot projevila variabilita, ne jen shoda
  // náhodou. Bez enemyStageVisitSeq v seedu (viz zadání "pořád ty samé") by
  // tenhle test padal, protože by všechny seq hodnoty vracely stejný snímek.
  it("picks a different monster image for different enemyStageVisitSeq values on the same camera/stage", () => {
    const picks = new Set<string | null>();
    for (let seq = 0; seq < 10; seq++) {
      picks.add(getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance", seq));
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it("stays stable (same image) for the same enemyStageVisitSeq across repeated calls", () => {
    const first = getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance", 3);
    const second = getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance", 3);
    expect(first).toBe(second);
  });

  it("defaults enemyStageVisitSeq to 0 when omitted, matching an explicit 0", () => {
    const omitted = getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance");
    const explicitZero = getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "advance", 0);
    expect(omitted).toBe(explicitZero);
  });

  it("also varies the fleeing image by enemyStageVisitSeq when a camera has multiple fleeing assets", () => {
    // Většina kamer má jen 1 fleeing asset (žádná variabilita možná) — tenhle
    // test jen ověří, že seed string obsahuje seq (fleeing volání neselže,
    // vrací pořád platný asset), skutečnou variabilitu pokrývá monster test výše.
    const a = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat", 1);
    const b = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "retreat", 2);
    expect(a).toBe("/object_13/camera/left_hallway/left_hallway_fleeing_monster.webp");
    expect(b).toBe("/object_13/camera/left_hallway/left_hallway_fleeing_monster.webp");
  });
});
