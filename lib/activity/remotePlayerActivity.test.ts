import { afterEach, describe, expect, it, vi } from "vitest";
import { recordGameStart, recordPlayerLogin } from "./remotePlayerActivity";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("recordPlayerLogin", () => {
  it("posts to /nocni-hlidac/player/login with the discordUserId", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await recordPlayerLogin("123");

    expect(result).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hub.example.invalid/nocni-hlidac/player/login");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ discordUserId: "123" });
  });

  it("never throws when the hub is unconfigured, returns false", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(recordPlayerLogin("123")).resolves.toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("never throws when the upstream call fails, returns false", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));

    await expect(recordPlayerLogin("123")).resolves.toBe(false);
  });
});

describe("recordGameStart", () => {
  it("posts to /nocni-hlidac/player/activity/game-start with client/buildVersion", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const summary = { lastLoginAt: null, lastPlayedAt: "2026-07-24T10:00:00.000Z", lastActivityAt: "2026-07-24T10:00:00.000Z", lastClient: "web", lastBuildVersion: "1.0.0" };
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(summary), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await recordGameStart({ discordUserId: "123", client: "web", buildVersion: "1.0.0" });

    expect(result).toEqual(summary);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hub.example.invalid/nocni-hlidac/player/activity/game-start");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ discordUserId: "123", client: "web", buildVersion: "1.0.0" });
  });

  it("returns null when the hub is unconfigured or fails", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    await expect(recordGameStart({ discordUserId: "123", client: "web", buildVersion: null })).resolves.toBeNull();
  });
});
