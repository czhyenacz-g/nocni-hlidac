import { describe, expect, it } from "vitest";
import { validateMiniGameLayout } from "../layoutValidation";
import { resolveMiniGamePlacement } from "../layoutPlacement";
import { MONITORED_HALLS_MAP } from "./monitoredHallsMap";
import { MiniGameCameraId } from "../types";

const CAMERA_IDS: MiniGameCameraId[] = ["outer_yard", "right_hallway", "left_hallway", "door_hallway"];

describe("monitored_halls — validity", () => {
  it("passes validateMiniGameLayout", () => {
    expect(validateMiniGameLayout(MONITORED_HALLS_MAP)).toEqual({ ok: true, errors: [] });
  });

  it("has exactly the four camera-hall rooms plus the office", () => {
    const roomIds = MONITORED_HALLS_MAP.rooms.map((room) => room.id).sort();
    expect(roomIds).toEqual(["door_hallway", "left_hallway", "office", "outer_yard", "right_hallway"].sort());
  });

  it("has a player_start and player_exit slot, both in the office room (same convention as other maps)", () => {
    const start = MONITORED_HALLS_MAP.slots.find((slot) => slot.tags.includes("player_start"));
    const exit = MONITORED_HALLS_MAP.slots.find((slot) => slot.tags.includes("player_exit"));
    expect(start?.roomId).toBe("office");
    expect(exit?.roomId).toBe("office");
  });

  it("has at least one monster_spawn slot", () => {
    expect(MONITORED_HALLS_MAP.slots.some((slot) => slot.tags.includes("monster_spawn"))).toBe(true);
  });

  it("has exactly one camera slot per real CameraId, each in its matching room", () => {
    for (const cameraId of CAMERA_IDS) {
      const matches = MONITORED_HALLS_MAP.slots.filter((slot) => slot.tags.includes(cameraId));
      expect(matches, `expected exactly one slot tagged "${cameraId}"`).toHaveLength(1);
      expect(matches[0].roomId).toBe(cameraId);
    }
  });
});

describe("monitored_halls — mission slot selection (objective 'replace_camera')", () => {
  it("resolves the objective position to the slot tagged with the requested targetCameraId", () => {
    for (const cameraId of CAMERA_IDS) {
      const placement = resolveMiniGamePlacement(
        MONITORED_HALLS_MAP,
        { objective: "replace_camera", targetCameraId: cameraId },
        `monitored-halls-${cameraId}`,
      );
      const slot = MONITORED_HALLS_MAP.slots.find((s) => s.id === placement.objectiveSlotId);
      expect(slot?.tags).toContain(cameraId);
    }
  });

  it("the same seed selects the same slots", () => {
    const first = resolveMiniGamePlacement(
      MONITORED_HALLS_MAP,
      { objective: "replace_camera", targetCameraId: "door_hallway" },
      "monitored-halls-repeat",
    );
    const second = resolveMiniGamePlacement(
      MONITORED_HALLS_MAP,
      { objective: "replace_camera", targetCameraId: "door_hallway" },
      "monitored-halls-repeat",
    );
    expect(second.playerStartSlotId).toBe(first.playerStartSlotId);
    expect(second.objectiveSlotId).toBe(first.objectiveSlotId);
  });
});
