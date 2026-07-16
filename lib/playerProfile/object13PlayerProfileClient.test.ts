import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addBulbsToProfile,
  consumeBulbsFromProfile,
  fetchObject13PlayerProfile,
  saveObject13PlayerProfile,
  unlockWeaponOnProfile,
} from "./object13PlayerProfileClient";
import { Object13PlayerProfileDto } from "../../game/core/object13PlayerProfile";

// Testuje jen samotnou klientskou service vrstvu (fetch("/api/player/profile")
// wrapper) — čistě přes mockovaný `global.fetch`, žádný React/DOM potřeba
// (stejný vzor jako lib/hubClient.test.ts). Hook/Provider
// (components/playerProfile/Object13PlayerProfileProvider.tsx) svoje React
// specifické chování (Strict Mode/dedup/unmount) nemá jak otestovat bez
// testing-library/jsdom, které tenhle projekt nemá (viz report) — tenhle
// soubor pokrývá to, co testovatelné BEZE React je: jednotlivá volání
// fetch/save a jejich mapování na výsledné stavy.

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_DTO: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 1,
  profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } },
  revision: 1,
  createdAt: "2026-07-16T12:00:00.000Z",
  updatedAt: "2026-07-16T12:00:00.000Z",
  lastSeenAt: "2026-07-16T12:00:00.000Z",
};

describe("fetchObject13PlayerProfile", () => {
  it("1. returns 'ready' with the profile on 200", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 }))));
    const result = await fetchObject13PlayerProfile();
    expect(result).toEqual({ status: "ready", profile: VALID_DTO });
  });

  it("only ever calls the same-origin Next.js proxy, never a VPS URL", async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);
    await fetchObject13PlayerProfile();
    expect(fetchSpy).toHaveBeenCalledWith("/api/player/profile");
  });

  it("2. returns 'unauthorized' on 401", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }))));
    const result = await fetchObject13PlayerProfile();
    expect(result).toEqual({ status: "unauthorized" });
  });

  it("3. returns 'unavailable' on a 502/500", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "profile_unavailable" }), { status: 502 }))));
    const result = await fetchObject13PlayerProfile();
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns 'unavailable' on a network failure, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));
    await expect(fetchObject13PlayerProfile()).resolves.toEqual({ status: "unavailable" });
  });

  it("returns 'unavailable' for a malformed 200 body", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ garbage: true }), { status: 200 }))));
    const result = await fetchObject13PlayerProfile();
    expect(result).toEqual({ status: "unavailable" });
  });
});

const SAVE_PAYLOAD = { expectedRevision: 1, profileVersion: 1, profileData: { inventory: { items: { bulb: 15 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } } };

describe("saveObject13PlayerProfile", () => {
  it("4. a successful save returns the new profile with its revision", async () => {
    const saved = { ...VALID_DTO, revision: 2 };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(saved), { status: 200 }))));

    const result = await saveObject13PlayerProfile(SAVE_PAYLOAD);
    expect(result).toEqual({ status: "saved", profile: saved });
  });

  it("only PUTs to the same-origin Next.js proxy with the exact payload", async () => {
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await saveObject13PlayerProfile(SAVE_PAYLOAD);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/player/profile");
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe(JSON.stringify(SAVE_PAYLOAD));
  });

  it("5. a 409 conflict returns status: conflict with currentRevision/currentProfile", async () => {
    const conflictBody = { error: "profile_conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await saveObject13PlayerProfile(SAVE_PAYLOAD);
    expect(result).toEqual({ status: "conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } });
  });

  it("a 401 during save returns status: unauthorized", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }))));
    const result = await saveObject13PlayerProfile(SAVE_PAYLOAD);
    expect(result).toEqual({ status: "unauthorized" });
  });

  it("a 413 returns status: too_large", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "profile_too_large" }), { status: 413 }))));
    const result = await saveObject13PlayerProfile(SAVE_PAYLOAD);
    expect(result).toEqual({ status: "too_large" });
  });

  it("a network failure returns status: error, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));
    const result = await saveObject13PlayerProfile(SAVE_PAYLOAD);
    expect(result).toEqual({ status: "error", error: "network_error" });
  });

  it("two concurrent calls each resolve independently with no shared mutable state (service-level safety, distinct from hook-level in-flight dedup)", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        call += 1;
        const profile = { ...VALID_DTO, revision: call + 1 };
        return Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }));
      }),
    );

    const [a, b] = await Promise.all([saveObject13PlayerProfile(SAVE_PAYLOAD), saveObject13PlayerProfile({ ...SAVE_PAYLOAD, expectedRevision: 2 })]);
    expect(a.status).toBe("saved");
    expect(b.status).toBe("saved");
  });
});

const INVENTORY_PAYLOAD = { amount: 1, expectedRevision: 1 };

describe("addBulbsToProfile", () => {
  it("8. only POSTs to the same-origin bulb/add proxy with the exact payload", async () => {
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await addBulbsToProfile(INVENTORY_PAYLOAD);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/player/profile/inventory/bulb/add");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(INVENTORY_PAYLOAD));
  });

  it("a successful add returns 'updated' with the new profile", async () => {
    const updated = { ...VALID_DTO, revision: 2, profileData: { inventory: { items: { bulb: 11 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(updated), { status: 200 }))));

    const result = await addBulbsToProfile(INVENTORY_PAYLOAD);
    expect(result).toEqual({ status: "updated", profile: updated });
  });

  it("12. a 409 exceeds_maximum error returns its own distinct status", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "exceeds_maximum" }), { status: 409 }))));

    const result = await addBulbsToProfile(INVENTORY_PAYLOAD);
    expect(result).toEqual({ status: "exceeds_maximum" });
  });

  it("a 409 revision_conflict returns status: conflict with currentRevision/currentProfile", async () => {
    const conflictBody = { error: "profile_conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await addBulbsToProfile(INVENTORY_PAYLOAD);
    expect(result).toEqual({ status: "conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } });
  });
});

describe("consumeBulbsFromProfile", () => {
  it("only POSTs to the same-origin bulb/consume proxy", async () => {
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await consumeBulbsFromProfile(INVENTORY_PAYLOAD);

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/player/profile/inventory/bulb/consume");
  });

  it("11. a 409 insufficient_inventory error returns its own distinct status", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "insufficient_inventory" }), { status: 409 }))));

    const result = await consumeBulbsFromProfile(INVENTORY_PAYLOAD);
    expect(result).toEqual({ status: "insufficient_inventory" });
  });

  it("a network failure returns status: error, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));
    const result = await consumeBulbsFromProfile(INVENTORY_PAYLOAD);
    expect(result).toEqual({ status: "error", error: "network_error" });
  });
});

const WEAPON_UNLOCK_PAYLOAD = { weaponId: "single_shotgun" as const, expectedRevision: 1 };

describe("unlockWeaponOnProfile", () => {
  it("only POSTs to the same-origin equipment/weapon/unlock proxy with the exact payload", async () => {
    const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 })));
    vi.stubGlobal("fetch", fetchSpy);

    await unlockWeaponOnProfile(WEAPON_UNLOCK_PAYLOAD);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/player/profile/equipment/weapon/unlock");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(WEAPON_UNLOCK_PAYLOAD));
  });

  it("a successful unlock returns 'updated' with the new (now weapon-owning) profile", async () => {
    const updated = {
      ...VALID_DTO,
      revision: 2,
      profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" } },
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(updated), { status: 200 }))));

    const result = await unlockWeaponOnProfile(WEAPON_UNLOCK_PAYLOAD);
    expect(result).toEqual({ status: "updated", profile: updated });
  });

  it("an idempotent no-op unlock (already owned+equipped) still returns 'updated' with the current profile — the server's 200 doesn't distinguish updated vs unchanged", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(VALID_DTO), { status: 200 }))));

    const result = await unlockWeaponOnProfile(WEAPON_UNLOCK_PAYLOAD);
    expect(result).toEqual({ status: "updated", profile: VALID_DTO });
  });

  it("a 409 revision conflict returns status: conflict with currentRevision/currentProfile — optimistic locking surfaces to the caller", async () => {
    const conflictBody = { error: "profile_conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(conflictBody), { status: 409 }))));

    const result = await unlockWeaponOnProfile(WEAPON_UNLOCK_PAYLOAD);
    expect(result).toEqual({ status: "conflict", currentRevision: 4, currentProfile: { ...VALID_DTO, revision: 4 } });
  });

  it("returns status: unauthorized on 401", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }))));
    const result = await unlockWeaponOnProfile(WEAPON_UNLOCK_PAYLOAD);
    expect(result).toEqual({ status: "unauthorized" });
  });

  it("a network failure returns status: error, never throws — caller (Provider) never auto-retries on this", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));
    const result = await unlockWeaponOnProfile(WEAPON_UNLOCK_PAYLOAD);
    expect(result).toEqual({ status: "error", error: "network_error" });
  });
});
