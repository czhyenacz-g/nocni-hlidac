import { describe, expect, it } from "vitest";
import { BACKGROUND_SCENES } from "./backgroundImages";

// Post-win menu background (viz zadání, game/core/monsterDefeatReward.ts,
// MainMenuScreen.tsx) — reuses the existing multi-frame crossfade scene
// system (see "menu"/"win" above for the same 2-frame pattern), no new
// rendering code needed. SceneBackground.tsx itself already tolerates
// 0/1/2+ frames gracefully (frames.length <= 1 just skips the auto-cycle
// interval) — that's exercised by the existing single-frame scenes below
// ("loading"/"about"/"death"), not re-tested here.
describe("BACKGROUND_SCENES.menuFirstWin", () => {
  it("exists", () => {
    expect(BACKGROUND_SCENES.menuFirstWin).toBeDefined();
  });

  it("has both provided frames (menu_backgroud_first_win_0/1)", () => {
    const srcs = BACKGROUND_SCENES.menuFirstWin.frames.map((f) => f.src);
    expect(srcs).toEqual([
      "/object_13/background/menu_backgroud_first_win_0.webp",
      "/object_13/background/menu_backgroud_first_win_1.webp",
    ]);
  });

  it("preserves the source 'backgroud' typo in the filename (asset name, not renamed)", () => {
    expect(BACKGROUND_SCENES.menuFirstWin.frames[0].src).toContain("backgroud");
  });

  it("has a positive holdMs/crossfadeMs so the two frames actually cycle (same mechanism as 'menu')", () => {
    expect(BACKGROUND_SCENES.menuFirstWin.holdMs).toBe(BACKGROUND_SCENES.menu.holdMs);
    expect(BACKGROUND_SCENES.menuFirstWin.crossfadeMs).toBe(BACKGROUND_SCENES.menu.crossfadeMs);
    expect(BACKGROUND_SCENES.menuFirstWin.holdMs).toBeGreaterThan(0);
  });
});

// Existing scenes already prove frames arrays of length 1 are a fully valid,
// non-crashing config (SceneBackground.tsx just skips the interval and shows
// a static image) — documented here so it's explicit that menuFirstWin could
// safely shrink back to a single frame if _1 were ever missing again.
describe("single-frame scenes stay valid (graceful degradation precedent for menuFirstWin)", () => {
  it("'about' has exactly 1 frame and is still a well-formed scene", () => {
    expect(BACKGROUND_SCENES.about.frames).toHaveLength(1);
    expect(BACKGROUND_SCENES.about.frames[0].src.length).toBeGreaterThan(0);
  });
});
