import { describe, expect, it } from "vitest";
import { resolveGameOverImageSrc } from "./gameOverReveal";
import { TITAN_ATTACK_SRC } from "../visuals/titanDoorAssets";
import { BACKGROUND_SCENES } from "../visuals/backgroundImages";
import { GAME_OVER_REVEAL_DURATION_MS } from "../balancing/constants";

const IMP_FINAL_DEATH_REVEAL_SRC = BACKGROUND_SCENES.door.frames[BACKGROUND_SCENES.door.frames.length - 1].src;

describe("resolveGameOverImageSrc — deterministic, pure image selection", () => {
  it("Imp uses its current final door death-reveal image", () => {
    expect(resolveGameOverImageSrc("imp")).toBe(IMP_FINAL_DEATH_REVEAL_SRC);
    expect(resolveGameOverImageSrc("imp")).toBe("/object_13/background/door_open_death_0.webp");
  });

  it("Titan uses titan_attacks_broken_door.webp", () => {
    expect(resolveGameOverImageSrc("titan")).toBe(TITAN_ATTACK_SRC);
    expect(resolveGameOverImageSrc("titan")).toContain("titan_attacks_broken_door.webp");
  });

  it("an unknown/future monster id falls back to the same generic (Imp) image — never crashes, never returns empty", () => {
    const fallback = resolveGameOverImageSrc("some_future_monster");
    expect(fallback).toBe(IMP_FINAL_DEATH_REVEAL_SRC);
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("is a pure function — same input always returns the same output", () => {
    expect(resolveGameOverImageSrc("titan")).toBe(resolveGameOverImageSrc("titan"));
  });
});

describe("GAME_OVER_REVEAL_DURATION_MS", () => {
  it("is exactly 4 seconds", () => {
    expect(GAME_OVER_REVEAL_DURATION_MS).toBe(4000);
  });
});
