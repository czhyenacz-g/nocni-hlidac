import { describe, expect, it } from "vitest";
import { BACKGROUND_SCENES, doorClosedFrameOffsetForStep, DOOR_CLOSED_FRAME_START_INDEX } from "./backgroundImages";

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

// Death obrazovka — jednorázová 4-snímková animace útoku (viz zadání
// "nahradit statickou death obrazovku jednoduchou animací", pak "mám nové
// obrázky ghoul_death_1-4"), nahrazuje dřívější jediný statický
// death_bg_0.webp i starší 3-snímkovou sadu ghoul_death_0/1/2. `playOnce:
// true` je otestované na úrovni SceneBackground.tsx (viz komentář tam) —
// tady jen ověřujeme samotnou konfiguraci dat.
describe("BACKGROUND_SCENES.death", () => {
  it("has all four ghoul_death frames in order, exact filenames", () => {
    const srcs = BACKGROUND_SCENES.death.frames.map((f) => f.src);
    expect(srcs).toEqual([
      "/object_13/monster/ghoul/ghoul_death_1.webp",
      "/object_13/monster/ghoul/ghoul_death_2.webp",
      "/object_13/monster/ghoul/ghoul_death_3.webp",
      "/object_13/monster/ghoul/ghoul_death_4.webp",
    ]);
  });

  it("holds each frame for ~120ms", () => {
    for (const frame of BACKGROUND_SCENES.death.frames) {
      expect(frame.holdMs).toBe(120);
    }
  });

  it("crossfades faster than the hold time, so frames don't fade into each other", () => {
    expect(BACKGROUND_SCENES.death.crossfadeMs).toBeLessThan(BACKGROUND_SCENES.death.frames[0].holdMs!);
  });

  it("is marked playOnce (plays through once, then freezes on the last frame)", () => {
    expect(BACKGROUND_SCENES.death.playOnce).toBe(true);
  });
});

// door_open_at_attack (útok u dveří — nejčastější způsob smrti, viz
// DeathScreen.tsx) používá vlastní scénu "deathDoorAttack", ne "death" výše
// — dostala stejnou ghoul animaci na žádost po prvním živém testu, kde
// zůstala nečekaně statická.
// Zavřené dveře — 4-snímková idle animace (door_closed_0..3, viz zadání
// "přidal jsem door_closed_1/2/3.png"), na indexech 1-4 mezi otevřenými (0)
// a death reveal (poslední).
describe("BACKGROUND_SCENES.door", () => {
  it("has open, 4 closed idle frames, generator-overload, destroyed, imp-at-door-open, and the death-reveal frame last, in that order", () => {
    const srcs = BACKGROUND_SCENES.door.frames.map((f) => f.src);
    expect(srcs).toEqual([
      "/object_13/background/door_open_0.webp",
      "/object_13/background/door_closed_0.webp",
      "/object_13/background/door_closed_1.webp",
      "/object_13/background/door_closed_2.webp",
      "/object_13/background/door_closed_3.webp",
      "/object_13/background/door_generator_overload_0.webp",
      "/object_13/background/door_destroyed_0.webp",
      "/object_13/monster/imp/imp_at_door.webp",
      "/object_13/background/door_open_death_0.webp",
    ]);
  });

  it("keeps the death-reveal frame last (DoorView.tsx#deathRevealIndex depends on frames.length - 1)", () => {
    const frames = BACKGROUND_SCENES.door.frames;
    expect(frames[frames.length - 1].src).toBe("/object_13/background/door_open_death_0.webp");
  });
});

describe("doorClosedFrameOffsetForStep — ping-pong sequence for the closed-door idle animation", () => {
  it("produces 0,1,2,3,2,1,0,1,2,3,2,1,0,... (zadání), not a hard cut back to 0", () => {
    const steps = Array.from({ length: 13 }, (_, step) => doorClosedFrameOffsetForStep(step));
    expect(steps).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0]);
  });

  it("every offset stays within the DOOR_CLOSED_FRAME_START_INDEX..+3 frame range", () => {
    for (let step = 0; step < 20; step++) {
      const offset = doorClosedFrameOffsetForStep(step);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(3);
      expect(DOOR_CLOSED_FRAME_START_INDEX + offset).toBeLessThanOrEqual(4);
    }
  });
});

describe("BACKGROUND_SCENES.deathDoorAttack", () => {
  it("has the same four ghoul_death frames in order as BACKGROUND_SCENES.death", () => {
    const srcs = BACKGROUND_SCENES.deathDoorAttack.frames.map((f) => f.src);
    expect(srcs).toEqual(BACKGROUND_SCENES.death.frames.map((f) => f.src));
  });

  it("holds each frame for ~120ms and is marked playOnce", () => {
    for (const frame of BACKGROUND_SCENES.deathDoorAttack.frames) {
      expect(frame.holdMs).toBe(120);
    }
    expect(BACKGROUND_SCENES.deathDoorAttack.playOnce).toBe(true);
  });
});

// Titan (viz zadání "oprav dvojitý Game Over") — vlastní jednosnímková
// scéna, žádná animace/cyklení, žádné ghoul_death snímky. Musí ukazovat
// PŘESNĚ stejný obrázek jako 4s GAME OVER reveal (game/death/gameOverReveal.ts),
// ať mezi revealem a touhle scénou není žádný viditelný přechod.
describe("BACKGROUND_SCENES.titanDeath", () => {
  it("is a single static frame, not the Ghoul ghoul_death animation", () => {
    expect(BACKGROUND_SCENES.titanDeath.frames).toHaveLength(1);
    for (const src of BACKGROUND_SCENES.death.frames.map((f) => f.src)) {
      expect(BACKGROUND_SCENES.titanDeath.frames.map((f) => f.src)).not.toContain(src);
    }
  });

  it("uses the exact same image as the Titan GAME OVER reveal (game/death/gameOverReveal.ts)", () => {
    expect(BACKGROUND_SCENES.titanDeath.frames[0].src).toBe("/object_13/monster/titan/titan_attacks_broken_door.webp");
  });

  it("is not marked playOnce (nothing to play — it's a static background)", () => {
    expect(BACKGROUND_SCENES.titanDeath.playOnce).toBeFalsy();
  });
});
