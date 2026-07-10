import { describe, expect, it } from "vitest";
import { isDeathScreenContinuing, resolveDeathScreenStatus } from "./deathScreenStatus";

describe("resolveDeathScreenStatus", () => {
  it("returns hardcore_game_over for gameMode 'hardcore', never lives text", () => {
    const status = resolveDeathScreenStatus("hardcore", 0, 3);
    expect(status.kind).toBe("hardcore_game_over");
  });

  it("returns hardcore_game_over even if livesRemaining is accidentally positive (regression: must never show Normal lives text in Hardcore)", () => {
    const status = resolveDeathScreenStatus("hardcore", 2, 3);
    expect(status.kind).toBe("hardcore_game_over");
    expect(status).not.toHaveProperty("livesRemaining");
  });

  it("returns normal_continue when Normal still has lives left", () => {
    const status = resolveDeathScreenStatus("normal", 2, 5);
    expect(status).toEqual({ kind: "normal_continue", livesRemaining: 2, nightNumber: 5 });
  });

  it("returns normal_game_over when Normal has 0 lives left", () => {
    const status = resolveDeathScreenStatus("normal", 0, 5);
    expect(status.kind).toBe("normal_game_over");
  });

  it("returns normal_game_over for Normal with negative livesRemaining (defensive, should never happen but must not crash/misreport)", () => {
    const status = resolveDeathScreenStatus("normal", -1, 5);
    expect(status.kind).toBe("normal_game_over");
  });
});

describe("isDeathScreenContinuing", () => {
  it("is true only for normal_continue", () => {
    expect(isDeathScreenContinuing(resolveDeathScreenStatus("normal", 1, 2))).toBe(true);
    expect(isDeathScreenContinuing(resolveDeathScreenStatus("normal", 0, 2))).toBe(false);
    expect(isDeathScreenContinuing(resolveDeathScreenStatus("hardcore", 5, 2))).toBe(false);
  });
});
