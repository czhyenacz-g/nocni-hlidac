import {
  FetchObject13PlayerProfileResult,
  isValidObject13PlayerProfileDto,
  Object13PlayerProfileInventoryOperationResult,
  SaveObject13PlayerProfileResult,
} from "../../game/core/object13PlayerProfile";
import { Object13PlayerProfileDataV1 } from "../../game/core/object13PlayerProfileInventory";

/**
 * Browser-safe klient pro obecný profil Objektu 13 — volá VÝHRADNĚ vlastní
 * Next.js proxy (`/api/player/profile`), NIKDY VPS přímo (ten Bearer token
 * je server-only, viz lib/hubClient.ts). Žádné React, žádný hook tady —
 * čisté funkce nad `fetch`, testovatelné bez DOM (mockovaný `global.fetch`,
 * stejný vzor jako lib/hubClient.test.ts). Hook/Provider
 * (components/playerProfile/Object13PlayerProfileProvider.tsx) tenhle
 * modul jen volá a výsledek promítne do `Object13PlayerProfileLoadState`/
 * `SaveState` přes `deriveLoadStateFromFetchResult`/`deriveSaveStateFromSaveResult`
 * (game/core/object13PlayerProfile.ts).
 */
export async function fetchObject13PlayerProfile(): Promise<FetchObject13PlayerProfileResult> {
  try {
    const res = await fetch("/api/player/profile");
    if (res.status === 401) return { status: "unauthorized" };
    if (!res.ok) return { status: "unavailable" };

    const body: unknown = await res.json().catch(() => null);
    if (!isValidObject13PlayerProfileDto(body)) return { status: "unavailable" };
    return { status: "ready", profile: body };
  } catch {
    return { status: "unavailable" };
  }
}

/** Přesně to, co proxy PUT přijímá (viz app/api/player/profile/route.ts) — žádné `discordUserId` (to doplní proxy ze session). */
export interface SaveObject13PlayerProfilePayload {
  expectedRevision: number;
  profileVersion: number;
  profileData: Object13PlayerProfileDataV1;
}

export async function saveObject13PlayerProfile(payload: SaveObject13PlayerProfilePayload): Promise<SaveObject13PlayerProfileResult> {
  try {
    const res = await fetch("/api/player/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body: unknown = await res.json().catch(() => null);

    if (res.status === 200 && isValidObject13PlayerProfileDto(body)) {
      return { status: "saved", profile: body };
    }
    if (res.status === 401) return { status: "unauthorized" };
    if (res.status === 409) {
      const conflict = body as { currentRevision?: unknown; currentProfile?: unknown } | null;
      const currentRevision = typeof conflict?.currentRevision === "number" ? conflict.currentRevision : 0;
      const currentProfile = isValidObject13PlayerProfileDto(conflict?.currentProfile) ? conflict.currentProfile : undefined;
      return { status: "conflict", currentRevision, ...(currentProfile ? { currentProfile } : {}) };
    }
    if (res.status === 413) return { status: "too_large" };
    return { status: "error", error: `profile_save_failed_${res.status}` };
  } catch {
    return { status: "error", error: "network_error" };
  }
}

/** Přesně to, co proxy `/inventory/bulb/add|consume` přijímá — bez `discordUserId` (viz app/api/player/profile/inventory/bulb/add/route.ts). */
export interface InventoryOperationPayload {
  amount: number;
  expectedRevision: number;
}

async function callInventoryOperationEndpoint(
  path: string,
  payload: InventoryOperationPayload,
): Promise<Object13PlayerProfileInventoryOperationResult> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body: unknown = await res.json().catch(() => null);

    if (res.status === 200 && isValidObject13PlayerProfileDto(body)) {
      return { status: "updated", profile: body };
    }
    if (res.status === 401) return { status: "unauthorized" };
    if (res.status === 409) {
      const errorBody = body as { error?: unknown; currentRevision?: unknown; currentProfile?: unknown } | null;
      if (errorBody?.error === "exceeds_maximum") return { status: "exceeds_maximum" };
      if (errorBody?.error === "insufficient_inventory") return { status: "insufficient_inventory" };
      const currentRevision = typeof errorBody?.currentRevision === "number" ? errorBody.currentRevision : 0;
      const currentProfile = isValidObject13PlayerProfileDto(errorBody?.currentProfile) ? errorBody.currentProfile : undefined;
      return { status: "conflict", currentRevision, ...(currentProfile ? { currentProfile } : {}) };
    }
    return { status: "error", error: `inventory_operation_failed_${res.status}` };
  } catch {
    return { status: "error", error: "network_error" };
  }
}

/** Volá jen vlastní Next.js proxy (`/api/player/profile/inventory/bulb/add`), nikdy VPS přímo. Po úspěchu vrací celý aktuální profil s novou `revision`. */
export function addBulbsToProfile(payload: InventoryOperationPayload): Promise<Object13PlayerProfileInventoryOperationResult> {
  return callInventoryOperationEndpoint("/api/player/profile/inventory/bulb/add", payload);
}

/** Volá jen vlastní Next.js proxy (`/api/player/profile/inventory/bulb/consume`), nikdy VPS přímo. */
export function consumeBulbsFromProfile(payload: InventoryOperationPayload): Promise<Object13PlayerProfileInventoryOperationResult> {
  return callInventoryOperationEndpoint("/api/player/profile/inventory/bulb/consume", payload);
}
