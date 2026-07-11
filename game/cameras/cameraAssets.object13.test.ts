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
  // Záměrně NEZÁVISÍ na monsterRetreatVerified/monsterRetreatVerificationEnabled
  // (viz zadání "ad2) fleeing monster i bez confirm loginu") — jinak by na
  // nocích bez vyžadovaného ověření (Noc 1–3, monsterRetreatVerified se tam
  // nastaví na true hned při ústupu) fleeing snímek nikdy nešel vidět.
  it("shows the fleeing asset when the monster retreated to this camera's stage", () => {
    const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "left_hallway");
    expect(src).toBe("/object_13/camera/left_hallway/left_hallway_fleeing_monster.webp");
  });

  it("works the same for outer_yard (outdoor)", () => {
    const src = getCameraImageSrc("outer_yard", true, false, 0, "outer_yard", "outer_yard");
    expect(src).toBe("/object_13/camera/outdoor/outdoor_fleeing_monster.webp");
  });

  it("takes priority over the regular monster asset", () => {
    const regular = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway");
    const fleeing = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", "left_hallway");
    expect(fleeing).not.toBe(regular);
    expect(fleeing).toContain("fleeing_monster");
  });

  it("falls back to the regular monster asset when this camera isn't the retreat destination", () => {
    const src = getCameraImageSrc("right_hallway", true, false, 0, "right_hallway", "left_hallway");
    expect(src).not.toContain("fleeing_monster");
  });

  it("does not show fleeing when monsterRetreatedTo is null (no pending retreat at all)", () => {
    const src = getCameraImageSrc("left_hallway", true, false, 0, "left_hallway", null);
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
  // monsterRetreatedTo/enemyStage přesune na jednu z MONSTER_RETREAT_CANDIDATES
  // (right_hallway/left_hallway/outer_yard), nikdy zůstane na "door_hallway"
  // (to je stage, KDE se retreat spustil, ne kam nepřítel odešel). Tenhle
  // test jen ověřuje, že door_hallway kamera samotná (obecný mechanismus,
  // stejný jako u ostatních kamer) používá lightOn variantu fleeing setu,
  // kdyby to jako cíl retreatu použil.
  it("uses the lit fleeing asset when UV is still on", () => {
    const src = getCameraImageSrc("door_hallway", true, true, 0, "door_hallway", "door_hallway");
    expect(src).toBe("/object_13/camera/door_hallway_light/door_hallway_light_fleeing_monster.webp");
  });

  it("falls back to the dark fleeing asset when UV is off", () => {
    const src = getCameraImageSrc("door_hallway", true, false, 0, "door_hallway", "door_hallway");
    expect(src).toBe("/object_13/camera/door_hallway/door_hallway_fleeing_monster.webp");
  });
});
