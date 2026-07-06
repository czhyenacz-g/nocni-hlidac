import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureHubPlayer } from "./ensureHubPlayer";
import { DiscordPlayer } from "../auth/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const PLAYER: DiscordPlayer = { discordUserId: "123", username: "czhyenacz" };

describe("ensureHubPlayer", () => {
  it("never throws when the hub is unconfigured", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(ensureHubPlayer(PLAYER, "test")).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("never throws when the upstream call fails", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error"))),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(ensureHubPlayer(PLAYER, "test")).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("does not warn when the upsert succeeds, and resolves with the returned GuardRunState", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ bestRun: 3, currentRun: 1 }), { status: 200 }))),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(ensureHubPlayer(PLAYER, "test")).resolves.toEqual({ bestRun: 3, currentRun: 1 });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("never logs the API token", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "super-secret-token-value");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error"))),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await ensureHubPlayer(PLAYER, "test");

    const allLoggedArgs = [...warnSpy.mock.calls, ...errorSpy.mock.calls].flat().join(" ");
    expect(allLoggedArgs).not.toContain("super-secret-token-value");
  });
});
