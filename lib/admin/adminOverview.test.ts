import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAdminActivityEvents, fetchAdminPlayers } from "./adminOverview";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchAdminPlayers", () => {
  it("GETs /nocni-hlidac/admin/players with a limit query param and returns the parsed list", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const players = [{ discordUserId: "1", displayName: "Hynek", username: "czhyenacz", lastLoginAt: null, lastPlayedAt: null, lastActivityAt: null, lastClient: null, lastBuildVersion: null, hardcoreBestNight: 5 }];
    const fetchSpy = vi.fn((_url: string) => Promise.resolve(new Response(JSON.stringify(players), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchAdminPlayers(100);

    expect(result).toEqual(players);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://hub.example.invalid/nocni-hlidac/admin/players?limit=100");
  });

  it("returns null when the hub is unconfigured (page shows an empty table, not a crash)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    await expect(fetchAdminPlayers()).resolves.toBeNull();
  });
});

describe("fetchAdminActivityEvents", () => {
  it("GETs /nocni-hlidac/admin/activity-events with a limit query param", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const events = [
      {
        id: "evt_1",
        discordUserId: "1",
        displayName: "Hynek",
        username: "czhyenacz",
        eventType: "login",
        nightNumber: null,
        gameMode: null,
        client: null,
        buildVersion: null,
        createdAt: "2026-07-24T10:00:00.000Z",
      },
    ];
    const fetchSpy = vi.fn((_url: string) => Promise.resolve(new Response(JSON.stringify(events), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchAdminActivityEvents(100);

    expect(result).toEqual(events);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://hub.example.invalid/nocni-hlidac/admin/activity-events?limit=100");
  });

  it("returns null when the upstream call fails", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));

    await expect(fetchAdminActivityEvents()).resolves.toBeNull();
  });
});
