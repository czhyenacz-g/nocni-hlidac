import { afterEach, describe, expect, it, vi } from "vitest";
import { handleGetPlayerProfileRequest, handlePutPlayerProfileRequest } from "./playerProfileRequestHandlers";
import { DiscordPlayer } from "../auth/types";
import { Object13PlayerProfileDto } from "../../game/core/object13PlayerProfile";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const ANONYMOUS_SESSION = null;
const LOGGED_IN_SESSION: DiscordPlayer = { discordUserId: "123456789012345678", username: "czhyenacz", displayName: "Hynek" };

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

describe("handleGetPlayerProfileRequest", () => {
  it("1. returns 401 without calling the VPS when there is no session", async () => {
    configureHub();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleGetPlayerProfileRequest(ANONYMOUS_SESSION);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: "unauthorized" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("2. requests the profile for the SESSION's discordUserId (there is no query param input to this function at all)", async () => {
    configureHub();
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handleGetPlayerProfileRequest(LOGGED_IN_SESSION);

    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    expect(calledUrl).toContain(`discordUserId=${LOGGED_IN_SESSION.discordUserId}`);
  });

  it("3. returns 200 with a valid profile", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 }))));

    const result = await handleGetPlayerProfileRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(VALID_DTO);
  });

  it("4. rejects an invalid VPS response shape (maps to profile_unavailable, never passed through)", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ garbage: true }), { status: 200 }))));

    const result = await handleGetPlayerProfileRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "profile_unavailable" });
  });

  it("5. returns profile_unavailable when the VPS is unreachable/unconfigured", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    const result = await handleGetPlayerProfileRequest(LOGGED_IN_SESSION);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "profile_unavailable" });
  });
});

const VALID_PUT_BODY = { expectedRevision: 1, profileVersion: 1, profileData: {} };

describe("handlePutPlayerProfileRequest", () => {
  it("6. returns 401 without calling the VPS when there is no session", async () => {
    configureHub();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handlePutPlayerProfileRequest(ANONYMOUS_SESSION, VALID_PUT_BODY);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: "unauthorized" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("7/8. ignores any discordUserId in the browser payload — always uses the session's discordUserId in the outgoing VPS request", async () => {
    configureHub();
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, { ...VALID_PUT_BODY, discordUserId: "attacker-supplied-id" });

    const [, init] = fetchSpy.mock.calls[0];
    const sentBody = JSON.parse(String(init?.body));
    expect(sentBody.discordUserId).toBe(LOGGED_IN_SESSION.discordUserId);
  });

  it("9. a successful PUT returns the new profile and revision", async () => {
    configureHub();
    const saved = { ...VALID_DTO, revision: 2, profileData: { note: "x" } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(saved), { status: 200 }))));

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, VALID_PUT_BODY);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(saved);
  });

  it("10. a 409 conflict preserves currentRevision", async () => {
    configureHub();
    const conflictBody = { error: "revision_conflict", currentRevision: 4, profile: { ...VALID_DTO, revision: 4 } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, VALID_PUT_BODY);

    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: "profile_conflict", currentRevision: 4 });
  });

  it("11. a 409 conflict safely forwards currentProfile when the VPS includes one", async () => {
    configureHub();
    const conflictBody = { error: "revision_conflict", currentRevision: 4, profile: { ...VALID_DTO, revision: 4 } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, VALID_PUT_BODY);

    expect(result.body).toEqual({ error: "profile_conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } });
  });

  it("a 409 conflict without a valid nested profile omits currentProfile entirely (never fabricates one)", async () => {
    configureHub();
    const conflictBody = { error: "revision_conflict", currentRevision: 4, profile: { garbage: true } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, VALID_PUT_BODY);

    expect(result.body).toEqual({ error: "profile_conflict", currentRevision: 4 });
    expect("currentProfile" in (result.body as object)).toBe(false);
  });

  it("12. a 413 response maps to profile_too_large", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "profile_data_too_large" }), { status: 413 }))));

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, VALID_PUT_BODY);

    expect(result.status).toBe(413);
    expect(result.body).toEqual({ error: "profile_too_large" });
  });

  it("13. never leaks internal VPS error bodies or the bearer token to the client", async () => {
    configureHub();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ internal: "stack trace or token leak" }), { status: 500 }))),
    );

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, VALID_PUT_BODY);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "profile_unavailable" });
    expect(JSON.stringify(result.body)).not.toContain("test-token");
    expect(JSON.stringify(result.body)).not.toContain("stack trace");
  });

  it("14. an invalid browser payload returns 400 WITHOUT ever calling the VPS", async () => {
    configureHub();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, { expectedRevision: -1, profileVersion: 1, profileData: {} });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: "invalid_request" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("14b. profileData as null returns 400 without calling the VPS", async () => {
    configureHub();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, { ...VALID_PUT_BODY, profileData: null });

    expect(result.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a 404 (profile never created) maps to profile_not_found", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "profile_not_found" }), { status: 404 }))));

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, VALID_PUT_BODY);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: "profile_not_found" });
  });
});
