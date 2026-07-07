import { describe, expect, it } from "vitest";
import { CINEMATIC_SCENES, getCinematicScene } from "./cinematics";

describe("cinematics config", () => {
  it("contains old_guard_first_death_warning", () => {
    expect(CINEMATIC_SCENES.old_guard_first_death_warning).toBeDefined();
  });

  it("old_guard_first_death_warning has an imageSrc", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.imageSrc).toBe("/object_13/story/story_1.webp");
  });

  it("old_guard_first_death_warning has a segment with the text 'Baf!'", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.some((segment) => segment.text === "Baf!")).toBe(true);
  });

  it("the 'Baf!' segment has a responseLabel", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    const bafSegment = scene?.segments.find((segment) => segment.text === "Baf!");
    expect(bafSegment?.responseLabel).toBe("...");
  });

  it("getCinematicScene returns the exact same data as CINEMATIC_SCENES", () => {
    expect(getCinematicScene("old_guard_first_death_warning")).toEqual(
      CINEMATIC_SCENES.old_guard_first_death_warning,
    );
  });
});
