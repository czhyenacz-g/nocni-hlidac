import { describe, expect, it } from "vitest";
import { getMiniGameRoomDisplayLabel, getMiniGameWallRenderStyle, shouldShowRoomLabelByDefault } from "./mapVisuals";

describe("getMiniGameRoomDisplayLabel", () => {
  it("is room.name uppercased", () => {
    expect(getMiniGameRoomDisplayLabel({ name: "Sklad A" })).toBe("SKLAD A");
    expect(getMiniGameRoomDisplayLabel({ name: "Rozvodna" })).toBe("ROZVODNA");
    expect(getMiniGameRoomDisplayLabel({ name: "Kancelář" })).toBe("KANCELÁŘ");
  });
});

describe("shouldShowRoomLabelByDefault", () => {
  it("shows labels for identifying room kinds (storage/technical/maintenance/loading/office)", () => {
    expect(shouldShowRoomLabelByDefault("storage")).toBe(true);
    expect(shouldShowRoomLabelByDefault("technical")).toBe(true);
    expect(shouldShowRoomLabelByDefault("maintenance")).toBe(true);
    expect(shouldShowRoomLabelByDefault("loading")).toBe(true);
    expect(shouldShowRoomLabelByDefault("office")).toBe(true);
  });

  it("hides labels for corridor/utility/service/unknown kinds by default", () => {
    expect(shouldShowRoomLabelByDefault("corridor")).toBe(false);
    expect(shouldShowRoomLabelByDefault("utility")).toBe(false);
    expect(shouldShowRoomLabelByDefault("service")).toBe(false);
    expect(shouldShowRoomLabelByDefault("unknown")).toBe(false);
  });
});

describe("getMiniGameWallRenderStyle", () => {
  it("shelf kind maps to render style 'shelf'", () => {
    expect(getMiniGameWallRenderStyle({ kind: "shelf" })).toBe("shelf");
  });

  it("machine kind maps to render style 'machine'", () => {
    expect(getMiniGameWallRenderStyle({ kind: "machine" })).toBe("machine");
  });

  it("obstacle kind maps to render style 'obstacle'", () => {
    expect(getMiniGameWallRenderStyle({ kind: "obstacle" })).toBe("obstacle");
  });

  it("door_block kind maps to render style 'door_block'", () => {
    expect(getMiniGameWallRenderStyle({ kind: "door_block" })).toBe("door_block");
  });

  it("wall kind maps to render style 'wall'", () => {
    expect(getMiniGameWallRenderStyle({ kind: "wall" })).toBe("wall");
  });

  it("missing kind falls back to 'wall'", () => {
    expect(getMiniGameWallRenderStyle({ kind: undefined })).toBe("wall");
  });
});
