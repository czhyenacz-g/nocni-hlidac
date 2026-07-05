import { describe, expect, it } from "vitest";
import { getCameraImageSrc } from "./cameraAssets.object13";

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
