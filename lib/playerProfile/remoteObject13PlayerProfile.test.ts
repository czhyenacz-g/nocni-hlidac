import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRemoteObject13PlayerProfile, putRemoteObject13PlayerProfile } from "./remoteObject13PlayerProfile";
import { Object13PlayerProfileDto } from "../../game/core/object13PlayerProfile";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const VALID_DTO: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 1,
  profileData: {},
  revision: 1,
  createdAt: "2026-07-16T12:00:00.000Z",
  updatedAt: "2026-07-16T12:00:00.000Z",
  lastSeenAt: "2026-07-16T12:00:00.000Z",
};

function configureHub() {
  vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
  vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
}

describe("fetchRemoteObject13PlayerProfile", () => {
  it("returns the profile on a valid 200 response", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 }))));

    const result = await fetchRemoteObject13PlayerProfile("123456789012345678");
    expect(result).toEqual(VALID_DTO);
  });

  it("requests the exact discordUserId via query string", async () => {
    configureHub();
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchRemoteObject13PlayerProfile("123456789012345678");

    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    expect(calledUrl).toBe("https://hub.example.invalid/nocni-hlidac/player-profile?discordUserId=123456789012345678");
  });

  it("returns null for a malformed/invalid-shape response (never trusts the VPS blindly)", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ nope: true }), { status: 200 }))));

    const result = await fetchRemoteObject13PlayerProfile("123456789012345678");
    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));

    const result = await fetchRemoteObject13PlayerProfile("123456789012345678");
    expect(result).toBeNull();
  });

  it("returns null when the hub is unconfigured", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchRemoteObject13PlayerProfile("123456789012345678");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

const PUT_PAYLOAD = {
  discordUserId: "123456789012345678",
  expectedRevision: 1,
  profileVersion: 1,
  profileData: {},
};

describe("putRemoteObject13PlayerProfile", () => {
  it("maps a 200 response to outcome: saved", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ...VALID_DTO, revision: 2 }), { status: 200 }))));

    const result = await putRemoteObject13PlayerProfile(PUT_PAYLOAD);
    expect(result).toEqual({ outcome: "saved", profile: { ...VALID_DTO, revision: 2 } });
  });

  it("sends the Bearer token and JSON body, never discordUserId anywhere but the payload itself", async () => {
    configureHub();
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await putRemoteObject13PlayerProfile(PUT_PAYLOAD);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hub.example.invalid/nocni-hlidac/player-profile");
    expect(init?.method).toBe("PUT");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(init?.body).toBe(JSON.stringify(PUT_PAYLOAD));
  });

  it("maps a 409 response to outcome: conflict, with currentRevision and currentProfile", async () => {
    configureHub();
    const conflictBody = { error: "revision_conflict", currentRevision: 4, profile: { ...VALID_DTO, revision: 4 } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await putRemoteObject13PlayerProfile(PUT_PAYLOAD);
    expect(result).toEqual({ outcome: "conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } });
  });

  it("409 with a malformed nested profile still reports the conflict, with currentProfile: null", async () => {
    configureHub();
    const conflictBody = { error: "revision_conflict", currentRevision: 4, profile: { garbage: true } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await putRemoteObject13PlayerProfile(PUT_PAYLOAD);
    expect(result).toEqual({ outcome: "conflict", currentRevision: 4, currentProfile: null });
  });

  it("maps a 413 response to outcome: too_large", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "profile_data_too_large" }), { status: 413 }))));

    const result = await putRemoteObject13PlayerProfile(PUT_PAYLOAD);
    expect(result).toEqual({ outcome: "too_large" });
  });

  it("maps a 404 response to outcome: not_found", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "profile_not_found" }), { status: 404 }))));

    const result = await putRemoteObject13PlayerProfile(PUT_PAYLOAD);
    expect(result).toEqual({ outcome: "not_found" });
  });

  it("maps a 500/network failure to outcome: unavailable", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "internal_error" }), { status: 500 }))));

    const result = await putRemoteObject13PlayerProfile(PUT_PAYLOAD);
    expect(result).toEqual({ outcome: "unavailable" });

    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));
    const result2 = await putRemoteObject13PlayerProfile(PUT_PAYLOAD);
    expect(result2).toEqual({ outcome: "unavailable" });
  });
});
