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

  it("old_guard_first_death_warning has 13 segments", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments).toHaveLength(13);
  });

  it("the first segment is 'Baf.'", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments[0].text).toBe("Baf.");
  });

  it("the last segment's responseLabel is 'Zpátky ke stolu.'", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.at(-1)?.responseLabel).toBe("Zpátky ke stolu.");
  });

  it("includes the technician introduction line", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.some((segment) => segment.text === "Jsem místní technik. Máš kliku, že jsem to já.")).toBe(
      true,
    );
  });

  it("every segment has a responseLabel", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.every((segment) => Boolean(segment.responseLabel))).toBe(true);
  });

  it("every segment has an audioSrc pointing into public/object_13/story/segments/", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.every((segment) => segment.audioSrc?.startsWith("/object_13/story/segments/story_1_"))).toBe(
      true,
    );
  });

  it("each segment's audioSrc filename matches its id", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.every((segment) => segment.audioSrc === `/object_13/story/segments/story_1_${segment.id}.m4a`)).toBe(
      true,
    );
  });

  it("getCinematicScene returns the exact same data as CINEMATIC_SCENES", () => {
    expect(getCinematicScene("old_guard_first_death_warning")).toEqual(
      CINEMATIC_SCENES.old_guard_first_death_warning,
    );
  });
});
