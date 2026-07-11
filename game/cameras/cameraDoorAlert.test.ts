import { describe, expect, it } from "vitest";
import { isCameraDoorAlertActive } from "./cameraDoorAlert";
import { CameraDefinition } from "../core/types";

const doorHallwayCamera: CameraDefinition = {
  id: "door_hallway",
  label: "KAM 04 — Chodba před dveřmi",
  type: "door",
  enemyVisibleAtStage: "door_hallway",
};

const outerYardCamera: CameraDefinition = {
  id: "outer_yard",
  label: "KAM 01 — Venkovní vstup",
  type: "outside",
  enemyVisibleAtStage: "outer_yard",
};

describe("isCameraDoorAlertActive", () => {
  it("is active when the enemy is on the stage this camera watches", () => {
    expect(isCameraDoorAlertActive(doorHallwayCamera, "door_hallway")).toBe(true);
    expect(isCameraDoorAlertActive(outerYardCamera, "outer_yard")).toBe(true);
  });

  it("is active for a door-type camera when the enemy is at_door or breach (stages with no camera of their own)", () => {
    expect(isCameraDoorAlertActive(doorHallwayCamera, "at_door")).toBe(true);
    expect(isCameraDoorAlertActive(doorHallwayCamera, "breach")).toBe(true);
  });

  it("is NOT active for a non-door camera when the enemy is at_door", () => {
    expect(isCameraDoorAlertActive(outerYardCamera, "at_door")).toBe(false);
  });

  it("is not active for any other mismatched stage", () => {
    expect(isCameraDoorAlertActive(doorHallwayCamera, "outer_yard")).toBe(false);
    expect(isCameraDoorAlertActive(doorHallwayCamera, "outside")).toBe(false);
  });
});
