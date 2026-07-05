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
