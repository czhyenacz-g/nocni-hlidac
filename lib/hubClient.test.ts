import { afterEach, describe, expect, it, vi } from "vitest";
import { hubGet, hubPost, isHubConfigured } from "./hubClient";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isHubConfigured", () => {
  it("is false when both env vars are missing", () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");
    expect(isHubConfigured()).toBe(false);
  });

  it("is false when only the URL is set", () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");
    expect(isHubConfigured()).toBe(false);
  });

  it("is true when both env vars are set", () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    expect(isHubConfigured()).toBe(true);
  });
});

describe("hubGet / hubPost — never throw, never call fetch without config", () => {
  it("hubGet returns null and does not call fetch when unconfigured", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await hubGet("/nocni-hlidac/leaderboard");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hubPost sends the token as a Bearer Authorization header, never in the body", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "secret-token");
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await hubPost("/nocni-hlidac/player/survive-night", { discordUserId: "123" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hub.example.invalid/nocni-hlidac/player/survive-night");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-token");
    expect(init?.body).toBe(JSON.stringify({ discordUserId: "123" }));
  });

  it("returns null (not an exception) when the upstream call fails", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error"))),
    );

    await expect(hubGet("/nocni-hlidac/leaderboard")).resolves.toBeNull();
  });

  it("returns null when the upstream responds with a non-2xx status", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "nope" }), { status: 500 }))),
    );

    await expect(hubGet("/nocni-hlidac/leaderboard")).resolves.toBeNull();
  });
});
