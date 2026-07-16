import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleAddBulbInventoryRequest,
  handleConsumeBulbInventoryRequest,
  handleGetPlayerProfileRequest,
  handlePutPlayerProfileRequest,
} from "./playerProfileRequestHandlers";
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
  profileData: { inventory: { items: { bulb: 10 } } },
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

const VALID_PUT_BODY = { expectedRevision: 1, profileVersion: 1, profileData: { inventory: { items: { bulb: 10 } } } };

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
    const saved = { ...VALID_DTO, revision: 2, profileData: { inventory: { items: { bulb: 5 } } } };
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

    const result = await handlePutPlayerProfileRequest(LOGGED_IN_SESSION, { expectedRevision: -1, profileVersion: 1, profileData: { inventory: { items: { bulb: 10 } } } });

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

const VALID_INVENTORY_BODY = { amount: 1, expectedRevision: 1 };

describe("handleAddBulbInventoryRequest", () => {
  it("returns 401 without calling the VPS when there is no session", async () => {
    configureHub();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleAddBulbInventoryRequest(ANONYMOUS_SESSION, VALID_INVENTORY_BODY);

    expect(result.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to the bulb/add VPS endpoint with the session's discordUserId, ignoring any in the body", async () => {
    configureHub();
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handleAddBulbInventoryRequest(LOGGED_IN_SESSION, { ...VALID_INVENTORY_BODY, discordUserId: "attacker-supplied-id" });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/nocni-hlidac/player-profile/inventory/bulb/add");
    const sentBody = JSON.parse(String(init?.body));
    expect(sentBody.discordUserId).toBe(LOGGED_IN_SESSION.discordUserId);
  });

  it("a successful add returns 200 with the updated profile", async () => {
    configureHub();
    const updated = { ...VALID_DTO, revision: 2, profileData: { inventory: { items: { bulb: 11 } } } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(updated), { status: 200 }))));

    const result = await handleAddBulbInventoryRequest(LOGGED_IN_SESSION, VALID_INVENTORY_BODY);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(updated);
  });

  it("maps a 409 exceeds_maximum error to its own distinct status", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "exceeds_maximum" }), { status: 409 }))));

    const result = await handleAddBulbInventoryRequest(LOGGED_IN_SESSION, VALID_INVENTORY_BODY);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ error: "exceeds_maximum" });
  });

  it("maps a 409 revision_conflict error, preserving currentRevision/currentProfile", async () => {
    configureHub();
    const conflictBody = { error: "revision_conflict", currentRevision: 4, profile: { ...VALID_DTO, revision: 4 } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await handleAddBulbInventoryRequest(LOGGED_IN_SESSION, VALID_INVENTORY_BODY);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ error: "profile_conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } });
  });

  it("an invalid amount returns 400 without calling the VPS", async () => {
    configureHub();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await handleAddBulbInventoryRequest(LOGGED_IN_SESSION, { amount: 0, expectedRevision: 1 });

    expect(result.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps a 404 to profile_not_found", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "profile_not_found" }), { status: 404 }))));

    const result = await handleAddBulbInventoryRequest(LOGGED_IN_SESSION, VALID_INVENTORY_BODY);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: "profile_not_found" });
  });
});

describe("handleConsumeBulbInventoryRequest", () => {
  it("posts to the bulb/consume VPS endpoint", async () => {
    configureHub();
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await handleConsumeBulbInventoryRequest(LOGGED_IN_SESSION, VALID_INVENTORY_BODY);

    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/nocni-hlidac/player-profile/inventory/bulb/consume");
  });

  it("maps a 409 insufficient_inventory error to its own distinct status", async () => {
    configureHub();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "insufficient_inventory" }), { status: 409 }))));

    const result = await handleConsumeBulbInventoryRequest(LOGGED_IN_SESSION, VALID_INVENTORY_BODY);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ error: "insufficient_inventory" });
  });
});
