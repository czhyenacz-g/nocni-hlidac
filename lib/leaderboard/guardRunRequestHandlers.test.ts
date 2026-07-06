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
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 202 (not 500) when the VPS API is unconfigured, even for a logged-in player", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    const result = await handleSurviveNightRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(202);
    expect(result.body).toEqual({ ok: false });
  });

  it("returns 200 with the updated state when the VPS API succeeds", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ bestRun: 4, currentRun: 3 }), { status: 200 }))),
    );

    const result = await handleSurviveNightRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, state: { bestRun: 4, currentRun: 3 } });
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
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
