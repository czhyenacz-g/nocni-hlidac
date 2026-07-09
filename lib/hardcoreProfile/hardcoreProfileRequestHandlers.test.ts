import { afterEach, describe, expect, it, vi } from "vitest";
import { handleGetHardcoreProfileRequest, handleSyncHardcoreProfileRequest } from "./hardcoreProfileRequestHandlers";
import { DiscordPlayer } from "../auth/types";
import { createDefaultServerHardcoreProfile } from "../../game/core/hardcorePlayerProfileSnapshot";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const ANONYMOUS_SESSION = null;
const LOGGED_IN_SESSION: DiscordPlayer = { discordUserId: "123", username: "czhyenacz", displayName: "Hynek" };

const SAMPLE_PROFILE = createDefaultServerHardcoreProfile({
  discordUserId: "123",
  displayName: "Hynek",
  avatarUrl: null,
  nowIso: "2026-01-01T00:00:00.000Z",
});

describe("handleGetHardcoreProfileRequest", () => {
  it("returns 401 without calling the VPS API when there is no session", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleGetHardcoreProfileRequest(ANONYMOUS_SESSION);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ ok: false, error: "not_authenticated" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 502 (not a crash) when the VPS API is unconfigured, even for a logged-in player", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    const result = await handleGetHardcoreProfileRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ ok: false, error: "hardcore_profile_unavailable" });
  });

  it("returns 200 with the profile when the VPS API succeeds (creates a default profile server-side for a first-time player)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(SAMPLE_PROFILE), { status: 200 }))));

    const result = await handleGetHardcoreProfileRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, profile: SAMPLE_PROFILE });
  });

  it("requests the profile for the SESSION's discordUserId, via query string, never a client-supplied id", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string) => Promise.resolve(new Response(JSON.stringify(SAMPLE_PROFILE), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handleGetHardcoreProfileRequest(LOGGED_IN_SESSION);

    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    expect(calledUrl).toBe("https://hub.example.invalid/nocni-hlidac/hardcore-profile?discordUserId=123");
  });

  it("still returns a safe response when the VPS call fails (network error)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));

    const result = await handleGetHardcoreProfileRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ ok: false, error: "hardcore_profile_unavailable" });
  });
});

describe("handleSyncHardcoreProfileRequest", () => {
  it("returns 401 without calling the VPS API when there is no session", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleSyncHardcoreProfileRequest(ANONYMOUS_SESSION, { hardcoreBestNight: 5 });

    expect(result.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 200 with the merged profile on success", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const merged = { ...SAMPLE_PROFILE, hardcoreBestNight: 5 };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(merged), { status: 200 }))));

    const result = await handleSyncHardcoreProfileRequest(LOGGED_IN_SESSION, { hardcoreBestNight: 5 });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, profile: merged });
  });

  it("sends the SESSION's discordUserId as the request identity, never trusting a client-supplied one", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(SAMPLE_PROFILE), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    // Client tries to smuggle a different discordUserId in the body.
    await handleSyncHardcoreProfileRequest(LOGGED_IN_SESSION, { hardcoreBestNight: 5, discordUserId: "someone-elses-id" });

    const sentBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(sentBody.discordUserId).toBe("123");
  });

  it("ignores Normal-like / unknown fields in the request body before forwarding to the VPS", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(SAMPLE_PROFILE), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handleSyncHardcoreProfileRequest(LOGGED_IN_SESSION, {
      hardcoreBestNight: 5,
      totalDeaths: 999,
      bulbsReplaced: 999,
      admin: true,
    });

    const sentBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(sentBody.totalDeaths).toBeUndefined();
    expect(sentBody.bulbsReplaced).toBeUndefined();
    expect(sentBody.admin).toBeUndefined();
    expect(sentBody.hardcoreBestNight).toBe(5);
  });

  it("rejects negative/non-numeric values before forwarding (they become 0)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(SAMPLE_PROFILE), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handleSyncHardcoreProfileRequest(LOGGED_IN_SESSION, { hardcoreBestNight: -50, hardcoreMonsterDefeatsCount: "lots" });

    const sentBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(sentBody.hardcoreBestNight).toBe(0);
    expect(sentBody.hardcoreMonsterDefeatsCount).toBe(0);
  });

  it("returns 502 when the VPS API is unconfigured", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    const result = await handleSyncHardcoreProfileRequest(LOGGED_IN_SESSION, { hardcoreBestNight: 5 });

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ ok: false, error: "hardcore_profile_sync_failed" });
  });
});
