import { describe, expect, it } from "vitest";
import { ADMIN_DISCORD_USERNAMES, isAdminUsername } from "./adminUsers";

describe("isAdminUsername", () => {
  it("true for a username on the admin list", () => {
    expect(isAdminUsername("czhyenacz")).toBe(true);
  });

  it("case-insensitive", () => {
    expect(isAdminUsername("CzHyEnAcZ")).toBe(true);
  });

  it("false for an unrelated username", () => {
    expect(isAdminUsername("someone_else")).toBe(false);
  });

  it("false for null/undefined/empty", () => {
    expect(isAdminUsername(null)).toBe(false);
    expect(isAdminUsername(undefined)).toBe(false);
    expect(isAdminUsername("")).toBe(false);
  });

  it("ADMIN_DISCORD_USERNAMES currently contains exactly the first admin", () => {
    expect(ADMIN_DISCORD_USERNAMES).toEqual(["czhyenacz"]);
  });
});
