import { describe, expect, it } from "vitest";
import { buildDatabasePlayerPreview, buildDatabaseViewer, formatDatabasePlaceholderValue } from "./databaseViewer";

// Testuje jediné místo, které smí sahat na DiscordPlayer/AuthenticatedPlayer
// pro /database (viz zadání "5. STAV PŘIHLÁŠENÍ", "18. TESTY" #2-5, #18).

describe("buildDatabaseViewer", () => {
  it("2. guest (no session) -> isAuthenticated: false, no personal identity leaked", () => {
    const viewer = buildDatabaseViewer(null);
    expect(viewer).toEqual({ isAuthenticated: false });
  });

  it("4. authenticated player -> isAuthenticated: true with displayName", () => {
    const viewer = buildDatabaseViewer({ discordUserId: "123", username: "hynek", displayName: "Hynek" });
    expect(viewer).toEqual({ isAuthenticated: true, userId: "123", displayName: "Hynek" });
  });

  it("falls back to no displayName (undefined) when the player has none set — UI decides the AUTORIZOVANÝ UŽIVATEL fallback, not this function", () => {
    const viewer = buildDatabaseViewer({ discordUserId: "123", username: "hynek" });
    expect(viewer.displayName).toBeUndefined();
    expect(viewer.isAuthenticated).toBe(true);
  });

  it("18. never carries fields beyond the safe DatabaseViewer shape (no avatarUrl/username leak)", () => {
    const viewer = buildDatabaseViewer({
      discordUserId: "123",
      username: "hynek",
      displayName: "Hynek",
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(Object.keys(viewer).sort()).toEqual(["displayName", "isAuthenticated", "userId"]);
  });
});

describe("buildDatabasePlayerPreview", () => {
  it("3/5. no server run state (guest, or hub API unavailable) -> every field stays undefined, nothing invented", () => {
    const preview = buildDatabasePlayerPreview(null);
    expect(preview).toEqual({});
    expect(preview.currentNight).toBeUndefined();
    expect(preview.highestNightReached).toBeUndefined();
    expect(preview.discoveredSubjectCount).toBeUndefined();
    expect(preview.completedReportCount).toBeUndefined();
  });

  it("maps real server currentRun/bestRun onto currentNight/highestNightReached", () => {
    const preview = buildDatabasePlayerPreview({ currentRun: 4, bestRun: 12 });
    expect(preview.currentNight).toBe(4);
    expect(preview.highestNightReached).toBe(12);
  });

  it("currentRun/bestRun of 0 is a REAL value ('no active run yet'), not a placeholder — must stay 0, not become undefined", () => {
    const preview = buildDatabasePlayerPreview({ currentRun: 0, bestRun: 0 });
    expect(preview.currentNight).toBe(0);
    expect(preview.highestNightReached).toBe(0);
  });

  it("never fabricates discoveredSubjectCount/completedReportCount — no field in the project provides them yet", () => {
    const preview = buildDatabasePlayerPreview({ currentRun: 4, bestRun: 12 });
    expect(preview.discoveredSubjectCount).toBeUndefined();
    expect(preview.completedReportCount).toBeUndefined();
  });
});

describe("formatDatabasePlaceholderValue", () => {
  it("5. undefined -> caller-supplied placeholder text", () => {
    expect(formatDatabasePlaceholderValue(undefined, "ZATÍM NENAPOJENO")).toBe("ZATÍM NENAPOJENO");
  });

  it("0 is a real value, not a placeholder", () => {
    expect(formatDatabasePlaceholderValue(0, "ZATÍM NENAPOJENO")).toBe("0");
  });

  it("passes real numbers through as strings", () => {
    expect(formatDatabasePlaceholderValue(7, "ZATÍM NENAPOJENO")).toBe("7");
  });
});
