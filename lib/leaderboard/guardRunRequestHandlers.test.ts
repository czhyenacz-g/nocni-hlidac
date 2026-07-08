import { afterEach, describe, expect, it, vi } from "vitest";
import { handleDeathRequest, handleSurviveNightRequest } from "./guardRunRequestHandlers";
import { DiscordPlayer } from "../auth/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const ANONYMOUS_SESSION = null;
const LOGGED_IN_SESSION: DiscordPlayer = { discordUserId: "123", username: "czhyenacz" };

describe("handleSurviveNightRequest — anonymous requests never write state", () => {
  it("returns 401 without calling the VPS API when there is no session", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleSurviveNightRequest(ANONYMOUS_SESSION);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ ok: false, error: "not_authenticated" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 202 (not 500) when the VPS API is unconfigured, even for a logged-in player", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    const result = await handleSurviveNightRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(202);
    expect(result.body).toEqual({ ok: false, stored: false });
  });

  it("returns 200 with the updated player state when the VPS API succeeds", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ bestRun: 4, currentRun: 3 }), { status: 200 }))),
    );

    const result = await handleSurviveNightRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, stored: true, player: { bestRun: 4, currentRun: 3 } });
  });

  it("ensures (upserts) the player before calling survive-night — both endpoints get hit", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string) =>
      Promise.resolve(new Response(JSON.stringify({ bestRun: 1, currentRun: 1 }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await handleSurviveNightRequest(LOGGED_IN_SESSION);

    const calledPaths = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledPaths).toContain("https://hub.example.invalid/nocni-hlidac/player/upsert");
    expect(calledPaths).toContain("https://hub.example.invalid/nocni-hlidac/player/survive-night");
  });

  it("still returns a safe response when the upsert step fails (VPS temporarily down)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error"))),
    );

    const result = await handleSurviveNightRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(202);
    expect(result.body).toEqual({ ok: false, stored: false });
  });
});

describe("handleSurviveNightRequest — gameMode eligibility guard", () => {
  it("ignores gameMode 'normal' and never calls the VPS API, even for a logged-in player", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleSurviveNightRequest(LOGGED_IN_SESSION, "normal");

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: false, stored: false, reason: "not_leaderboard_eligible" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows gameMode 'hardcore' for a logged-in player (calls the VPS API as usual)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ bestRun: 4, currentRun: 3 }), { status: 200 }))),
    );

    const result = await handleSurviveNightRequest(LOGGED_IN_SESSION, "hardcore");

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, stored: true, player: { bestRun: 4, currentRun: 3 } });
  });
});

describe("handleDeathRequest — anonymous requests never write state", () => {
  it("returns 401 without calling the VPS API when there is no session", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleDeathRequest(ANONYMOUS_SESSION);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ ok: false, error: "not_authenticated" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ensures (upserts) the player before calling death", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string) =>
      Promise.resolve(new Response(JSON.stringify({ bestRun: 2, currentRun: 0 }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleDeathRequest(LOGGED_IN_SESSION);

    const calledPaths = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledPaths).toContain("https://hub.example.invalid/nocni-hlidac/player/upsert");
    expect(calledPaths).toContain("https://hub.example.invalid/nocni-hlidac/player/death");
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, stored: true, player: { bestRun: 2, currentRun: 0 } });
  });
});

describe("handleDeathRequest — gameMode eligibility guard", () => {
  it("ignores gameMode 'normal' and never calls the VPS API, even for a logged-in player", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleDeathRequest(LOGGED_IN_SESSION, "normal");

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: false, stored: false, reason: "not_leaderboard_eligible" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows gameMode 'hardcore' for a logged-in player (calls the VPS API as usual)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string) =>
      Promise.resolve(new Response(JSON.stringify({ bestRun: 2, currentRun: 0 }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleDeathRequest(LOGGED_IN_SESSION, "hardcore");

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, stored: true, player: { bestRun: 2, currentRun: 0 } });
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("still returns 401 for an anonymous request even if gameMode 'hardcore' is passed", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleDeathRequest(ANONYMOUS_SESSION, "hardcore");

    expect(result.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
