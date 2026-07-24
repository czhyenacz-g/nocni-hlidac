import { describe, expect, it } from "vitest";
import { resolveAdminPageAccess } from "./resolveAdminPageAccess";
import { DiscordPlayer } from "../auth/types";

describe("resolveAdminPageAccess", () => {
  it("returns 'guest' for no session", () => {
    expect(resolveAdminPageAccess(null)).toBe("guest");
  });

  it("returns 'forbidden' for a regular logged-in user (not on the existing admin list)", () => {
    const session: DiscordPlayer = { discordUserId: "1", username: "someone_else" };
    expect(resolveAdminPageAccess(session)).toBe("forbidden");
  });

  it("returns 'allowed' for the existing hardcoded admin (czhyenacz)", () => {
    const session: DiscordPlayer = { discordUserId: "2", username: "czhyenacz" };
    expect(resolveAdminPageAccess(session)).toBe("allowed");
  });

  it("is case-insensitive, same as isAdminUsername", () => {
    const session: DiscordPlayer = { discordUserId: "3", username: "CzHyEnAcZ" };
    expect(resolveAdminPageAccess(session)).toBe("allowed");
  });
});
