import { afterEach, describe, expect, it, vi } from "vitest";
import { handleGameStartRequest } from "./activityRequestHandlers";
import { DiscordPlayer } from "../auth/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const ANONYMOUS_SESSION = null;
const LOGGED_IN_SESSION: DiscordPlayer = { discordUserId: "123", username: "czhyenacz" };

describe("handleGameStartRequest", () => {
  it("returns 401 without calling the VPS API when there is no session (game-start without session must not pass)", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleGameStartRequest(ANONYMOUS_SESSION, { client: "web", buildVersion: "1.0.0" });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ ok: false, error: "not_authenticated" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("updates last-played/client/build via the hub and returns them on success", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const summary = {
      lastLoginAt: null,
      lastPlayedAt: "2026-07-24T10:00:00.000Z",
      lastActivityAt: "2026-07-24T10:00:00.000Z",
      lastClient: "itch",
      lastBuildVersion: "2.0.0",
    };
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(summary), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleGameStartRequest(LOGGED_IN_SESSION, { client: "itch", buildVersion: "2.0.0" });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, activity: summary });
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ discordUserId: "123", client: "itch", buildVersion: "2.0.0" });
  });

  it("sanitizes an unknown client value to 'unknown' rather than rejecting the request", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handleGameStartRequest(LOGGED_IN_SESSION, { client: "totally-bogus" });

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string).client).toBe("unknown");
  });

  it("accepts a missing/empty body without throwing", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))));

    await expect(handleGameStartRequest(LOGGED_IN_SESSION, null)).resolves.toMatchObject({ status: 200 });
  });

  it("returns 202 (not stored) when the VPS API is unconfigured, not an error", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    const result = await handleGameStartRequest(LOGGED_IN_SESSION, { client: "web" });

    expect(result.status).toBe(202);
    expect(result.body).toEqual({ ok: false, error: "activity_not_stored" });
  });
});
