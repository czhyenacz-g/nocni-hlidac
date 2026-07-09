import { hubGet, hubPost } from "../hubClient";
import { HardcoreProfileSnapshot, ServerHardcorePlayerProfile } from "../../game/core/hardcorePlayerProfileSnapshot";

/**
 * GET /nocni-hlidac/hardcore-profile?discordUserId=... (NOVÝ VPS endpoint,
 * viz TECH_DESIGN.md "VPS API specifikace — Hardcore profil") — stejný
 * "tichá null na cokoliv, co se pokazí" vzor jako
 * lib/leaderboard/remoteLeaderboard.ts/remotePlayer.ts (hubGet už sám o
 * sobě nikdy nevyhodí). `discordUserId` musí pocházet jen ze server-side
 * session (viz lib/hardcoreProfile/hardcoreProfileRequestHandlers.ts),
 * nikdy z klienta přímo. VPS strana podle specifikace založí a vrátí
 * default profil, pokud hráč ještě žádný nemá — tahle funkce sama žádný
 * default nevytváří, jen předává, co VPS vrátí (nebo `null`).
 */
export async function fetchRemoteHardcoreProfile(discordUserId: string): Promise<ServerHardcorePlayerProfile | null> {
  return hubGet<ServerHardcorePlayerProfile>(`/nocni-hlidac/hardcore-profile?discordUserId=${encodeURIComponent(discordUserId)}`);
}

/**
 * POST /nocni-hlidac/hardcore-profile/sync (NOVÝ VPS endpoint) — pošle
 * validovaný/clampnutý Hardcore snapshot (viz
 * game/core/hardcorePlayerProfileSnapshot.ts#sanitizeHardcoreProfileSnapshot)
 * + identitu z session. VPS strana snapshot sloučí se svým stavem podle
 * `mergeHardcoreProfileSnapshot` referenční specifikace (OR pro reward
 * boolean, max pro countery) a vrátí výsledný `ServerHardcorePlayerProfile`.
 * `null`, když API není nakonfigurované nebo volání selže — volající (viz
 * hardcoreProfileRequestHandlers.ts) na tom pozná, že se sync nepovedl.
 */
export async function syncRemoteHardcoreProfile(
  discordUserId: string,
  snapshot: HardcoreProfileSnapshot,
  identity: { displayName: string | null; avatarUrl: string | null },
): Promise<ServerHardcorePlayerProfile | null> {
  return hubPost<ServerHardcorePlayerProfile>("/nocni-hlidac/hardcore-profile/sync", {
    discordUserId,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    ...snapshot,
  });
}
