import { describe, expect, it } from "vitest";
import { resolveMainMenuBackground } from "./mainMenuBackground";

describe("resolveMainMenuBackground", () => {
  it("returns 'default' for a logged-out player with no reward", () => {
    expect(
      resolveMainMenuBackground({
        isDiscordLoggedIn: false,
        hasDefeatedMonster: false,
        doubleBarrelUnlocked: false,
      }),
    ).toBe("default");
  });

  it("returns 'login' for a Discord-logged-in player with no reward yet", () => {
    expect(
      resolveMainMenuBackground({
        isDiscordLoggedIn: true,
        hasDefeatedMonster: false,
        doubleBarrelUnlocked: false,
      }),
    ).toBe("login");
  });

  it("returns 'post_monster' for a logged-in player with hasDefeatedMonster", () => {
    expect(
      resolveMainMenuBackground({
        isDiscordLoggedIn: true,
        hasDefeatedMonster: true,
        doubleBarrelUnlocked: false,
      }),
    ).toBe("post_monster");
  });

  it("returns 'post_monster' for a logged-in player with doubleBarrelUnlocked (even without hasDefeatedMonster)", () => {
    expect(
      resolveMainMenuBackground({
        isDiscordLoggedIn: true,
        hasDefeatedMonster: false,
        doubleBarrelUnlocked: true,
      }),
    ).toBe("post_monster");
  });

  it("returns 'post_monster' even for a logged-out player, since the reward is local/persistent regardless of login", () => {
    expect(
      resolveMainMenuBackground({
        isDiscordLoggedIn: false,
        hasDefeatedMonster: true,
        doubleBarrelUnlocked: false,
      }),
    ).toBe("post_monster");
  });

  it("never lets 'login' override 'post_monster' — post_monster wins whenever both conditions are true", () => {
    expect(
      resolveMainMenuBackground({
        isDiscordLoggedIn: true,
        hasDefeatedMonster: true,
        doubleBarrelUnlocked: true,
      }),
    ).toBe("post_monster");
  });
});
