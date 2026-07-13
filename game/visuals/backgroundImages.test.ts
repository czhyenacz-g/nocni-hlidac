import { describe, expect, it } from "vitest";
import { BACKGROUND_SCENES } from "./backgroundImages";

// Default (nepřihlášený hráč) menu pozadí — rozšířeno ze 2 na 3 snímky
// (menu_bg_0/1/2.webp, viz zadání "přidal jsem menu_bg_2.png"), stejný
// crossfade mechanismus jako dřív, jen s dalším snímkem navíc.
describe("BACKGROUND_SCENES.menu", () => {
  it("has all three frames (menu_bg_0/1/2), exact filenames", () => {
    const srcs = BACKGROUND_SCENES.menu.frames.map((f) => f.src);
    expect(srcs).toEqual([
      "/object_13/background/menu_bg_0.webp",
      "/object_13/background/menu_bg_1.webp",
      "/object_13/background/menu_bg_2.webp",
    ]);
  });
});

// Post-win menu background (viz zadání, game/core/monsterDefeatReward.ts,
// MainMenuScreen.tsx) — reuses the existing multi-frame crossfade scene
// system (see "menu"/"win" above for the same 2-frame pattern), no new
// rendering code needed. SceneBackground.tsx itself already tolerates
// 0/1/2+ frames gracefully (frames.length <= 1 just skips the auto-cycle
// interval) — that's exercised by the existing single-frame scenes below
// ("loading"/"about"), not re-tested here.
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

// Login menu background (viz zadání, game/visuals/mainMenuBackground.ts,
// MainMenuScreen.tsx) — přihlášený Discord hráč bez monster defeat odměny.
// Na rozdíl od menu/menuFirstWin/win výše má KAŽDÝ snímek vlastní holdMs
// (dlouhý základní frame, krátký alarmový záblesk), viz BackgroundFrame.
describe("BACKGROUND_SCENES.menuLogin", () => {
  it("has both provided frames (menu_bg_login_0/1), exact filenames, not renamed", () => {
    const srcs = BACKGROUND_SCENES.menuLogin.frames.map((f) => f.src);
    expect(srcs).toEqual([
      "/object_13/background/menu_bg_login_0.webp",
      "/object_13/background/menu_bg_login_1.webp",
    ]);
  });

  it("holds the base frame (0) noticeably longer than the alarm frame (1)", () => {
    const [base, alarm] = BACKGROUND_SCENES.menuLogin.frames;
    expect(base.holdMs).toBeGreaterThan(alarm.holdMs!);
    // Souhlasí s doporučeným rozsahem ze zadání (5-8s / 0.8-1.5s).
    expect(base.holdMs).toBeGreaterThanOrEqual(5000);
    expect(base.holdMs).toBeLessThanOrEqual(8000);
    expect(alarm.holdMs).toBeGreaterThanOrEqual(800);
    expect(alarm.holdMs).toBeLessThanOrEqual(1500);
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

// Death obrazovka — jednorázová 3-snímková animace útoku (viz zadání
// "nahradit statickou death obrazovku jednoduchou animací"), nahrazuje
// dřívější jediný statický death_bg_0.webp. `playOnce: true` je otestované
// na úrovni SceneBackground.tsx (viz komentář tam) — tady jen ověřujeme
// samotnou konfiguraci dat.
describe("BACKGROUND_SCENES.death", () => {
  it("has all three ghoul_death frames in order, exact filenames", () => {
    const srcs = BACKGROUND_SCENES.death.frames.map((f) => f.src);
    expect(srcs).toEqual([
      "/object_13/monster/ghoul/ghoul_death_0.webp",
      "/object_13/monster/ghoul/ghoul_death_1.webp",
      "/object_13/monster/ghoul/ghoul_death_2.webp",
    ]);
  });

  it("holds each frame for ~500ms", () => {
    for (const frame of BACKGROUND_SCENES.death.frames) {
      expect(frame.holdMs).toBe(500);
    }
  });

  it("is marked playOnce (plays through once, then freezes on the last frame)", () => {
    expect(BACKGROUND_SCENES.death.playOnce).toBe(true);
  });
});

// door_open_at_attack (útok u dveří — nejčastější způsob smrti, viz
// DeathScreen.tsx) používá vlastní scénu "deathDoorAttack", ne "death" výše
// — dostala stejnou ghoul animaci na žádost po prvním živém testu, kde
// zůstala nečekaně statická.
describe("BACKGROUND_SCENES.deathDoorAttack", () => {
  it("has the same three ghoul_death frames in order as BACKGROUND_SCENES.death", () => {
    const srcs = BACKGROUND_SCENES.deathDoorAttack.frames.map((f) => f.src);
    expect(srcs).toEqual(BACKGROUND_SCENES.death.frames.map((f) => f.src));
  });

  it("holds each frame for ~500ms and is marked playOnce", () => {
    for (const frame of BACKGROUND_SCENES.deathDoorAttack.frames) {
      expect(frame.holdMs).toBe(500);
    }
    expect(BACKGROUND_SCENES.deathDoorAttack.playOnce).toBe(true);
  });
});
