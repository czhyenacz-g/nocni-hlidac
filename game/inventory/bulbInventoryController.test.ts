import { describe, expect, it } from "vitest";
import {
  decideBulbReplacementConfirmAction,
  deriveBulbInventoryConfirmOutcome,
  resolveBulbInventoryPersistenceMode,
} from "./bulbInventoryController";
import { Object13PlayerProfileDto, Object13PlayerProfileLoadState } from "../core/object13PlayerProfile";

const VALID_PROFILE: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 1,
  profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } },
  revision: 1,
  createdAt: "2026-07-16T12:00:00.000Z",
  updatedAt: "2026-07-16T12:00:00.000Z",
  lastSeenAt: "2026-07-16T12:00:00.000Z",
};
const READY: Object13PlayerProfileLoadState = { status: "ready", profile: VALID_PROFILE };

describe("resolveBulbInventoryPersistenceMode", () => {
  it("1. Training (normal) is always local, even with a ready profile", () => {
    expect(resolveBulbInventoryPersistenceMode("normal", READY)).toBe("local");
  });

  it("3. anonymous (unauthorized) is always local", () => {
    expect(resolveBulbInventoryPersistenceMode("normal", { status: "unauthorized" })).toBe("local");
    expect(resolveBulbInventoryPersistenceMode("hardcore", { status: "unauthorized" })).toBe("local");
  });

  it("5. Hardcore with a ready profile is server", () => {
    expect(resolveBulbInventoryPersistenceMode("hardcore", READY)).toBe("server");
  });

  it("Hardcore without a ready profile (loading/unavailable) falls back to local — never silently drops the event", () => {
    expect(resolveBulbInventoryPersistenceMode("hardcore", { status: "loading" })).toBe("local");
    expect(resolveBulbInventoryPersistenceMode("hardcore", { status: "unavailable" })).toBe("local");
    expect(resolveBulbInventoryPersistenceMode("hardcore", { status: "idle" })).toBe("local");
  });
});

describe("deriveBulbInventoryConfirmOutcome", () => {
  it("10/11. maps 'updated' to confirmed", () => {
    expect(deriveBulbInventoryConfirmOutcome({ status: "updated", profile: VALID_PROFILE })).toEqual({ outcome: "confirmed" });
  });

  it("12. maps insufficient_inventory through unchanged", () => {
    expect(deriveBulbInventoryConfirmOutcome({ status: "insufficient_inventory" })).toEqual({ outcome: "insufficient_inventory" });
  });

  it("13. maps exceeds_maximum through unchanged", () => {
    expect(deriveBulbInventoryConfirmOutcome({ status: "exceeds_maximum" })).toEqual({ outcome: "exceeds_maximum" });
  });

  it("14. maps conflict through unchanged", () => {
    expect(deriveBulbInventoryConfirmOutcome({ status: "conflict", currentRevision: 4 })).toEqual({ outcome: "conflict" });
  });

  it("15. maps unauthorized/error to unavailable — caller doesn't need the exact reason", () => {
    expect(deriveBulbInventoryConfirmOutcome({ status: "unauthorized" })).toEqual({ outcome: "unavailable" });
    expect(deriveBulbInventoryConfirmOutcome({ status: "error", error: "network_error" })).toEqual({ outcome: "unavailable" });
  });
});

describe("decideBulbReplacementConfirmAction", () => {
  const base = { readyToConfirm: true, operationPending: false, needsReload: false, gameMode: "hardcore" as const, loadState: READY };

  it("returns 'none' when not ready to confirm, regardless of anything else", () => {
    expect(decideBulbReplacementConfirmAction({ ...base, readyToConfirm: false })).toEqual({ type: "none" });
  });

  it("16. returns 'none' while an operation is already pending — blocks a second consume", () => {
    expect(decideBulbReplacementConfirmAction({ ...base, operationPending: true })).toEqual({ type: "none" });
  });

  it("19. returns 'cancel_blocked_needs_reload' when a prior operation left an unclear result", () => {
    expect(decideBulbReplacementConfirmAction({ ...base, needsReload: true })).toEqual({ type: "cancel_blocked_needs_reload" });
  });

  it("needsReload takes priority over an otherwise-local persistence mode", () => {
    expect(decideBulbReplacementConfirmAction({ ...base, gameMode: "normal", needsReload: true })).toEqual({
      type: "cancel_blocked_needs_reload",
    });
  });

  it("1/2. Training confirms immediately, no server call", () => {
    expect(decideBulbReplacementConfirmAction({ ...base, gameMode: "normal" })).toEqual({ type: "confirm_immediately" });
  });

  it("3/4. anonymous confirms immediately, no server call", () => {
    expect(decideBulbReplacementConfirmAction({ ...base, gameMode: "normal", loadState: { status: "unauthorized" } })).toEqual({
      type: "confirm_immediately",
    });
  });

  it("5/6. Hardcore with a ready profile calls the server", () => {
    expect(decideBulbReplacementConfirmAction(base)).toEqual({ type: "call_server" });
  });

  it("Hardcore without a ready profile confirms immediately (defensive fallback — should not normally happen, Hardcore start is gated on ready)", () => {
    expect(decideBulbReplacementConfirmAction({ ...base, loadState: { status: "unavailable" } })).toEqual({
      type: "confirm_immediately",
    });
  });
});
