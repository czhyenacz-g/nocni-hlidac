import { DiscordPlayer } from "../auth/types";
import { ServerHardcorePlayerProfile, sanitizeHardcoreProfileSnapshot } from "../../game/core/hardcorePlayerProfileSnapshot";
import { fetchRemoteHardcoreProfile, syncRemoteHardcoreProfile } from "./remoteHardcoreProfile";

export interface HardcoreProfileResponse {
  status: number;
  body: { ok: true; profile: ServerHardcorePlayerProfile } | { ok: false; error: string };
}

/**
 * Session-in/response-out logika sdílená mezi
 * app/api/player/hardcore-profile/route.ts a .../sync/route.ts — session je
 * záměrně parametr, ne interní `getSession()` volání, ať se dá otestovat
 * bez cookies/request mockingu (stejný vzor jako
 * lib/leaderboard/guardRunRequestHandlers.ts).
 *
 * Anonymní (nepřihlášený) požadavek nikdy nevolá VPS API — `discordUserId`
 * smí pocházet jen ze server-side session, nikdy z těla requestu (viz
 * zadání "Bezpečnost": client nesmí posílat discordUserId jako důvěryhodnou
 * hodnotu).
 *
 * Na rozdíl od death/survive-night NENÍ tady žádný gameMode guard — tyhle
 * dva endpointy jsou Hardcore-only PODLE NÁVRHU (žádný Normal ekvivalent
 * vůbec neexistuje, viz zadání "Nevytvářej endpoint pro Normal profil").
 * Gating "volej sync jen když gameMode === hardcore" žije u volajícího
 * (app/play/page.tsx#handleMonsterDefeatedCinematicComplete), ne tady —
 * endpoint samotný nemá jak zjistit, jakým režimem run běžel.
 */
export async function handleGetHardcoreProfileRequest(session: DiscordPlayer | null): Promise<HardcoreProfileResponse> {
  if (!session) {
    console.warn("[hardcoreProfileRequestHandlers] get called without a valid session");
    return { status: 401, body: { ok: false, error: "not_authenticated" } };
  }

  const remote = await fetchRemoteHardcoreProfile(session.discordUserId);
  if (!remote) {
    console.warn(
      `[hardcoreProfileRequestHandlers] get: hub returned no profile (not configured or failing), discordUserId: ${session.discordUserId}`,
    );
    return { status: 502, body: { ok: false, error: "hardcore_profile_unavailable" } };
  }
  return { status: 200, body: { ok: true, profile: remote } };
}

/**
 * `rawBody` je the ještě neparsované/nedůvěryhodné JSON tělo requestu —
 * `sanitizeHardcoreProfileSnapshot` ho whitelistuje/validuje/clampuje PŘED
 * odesláním na VPS (viz zadání "Validace", "Server nesmí přijmout Normal
 * hodnoty ani je ukládat" — neznámá/Normal-like pole se tiše zahodí tady,
 * nikdy se nedostanou dál).
 */
export async function handleSyncHardcoreProfileRequest(
  session: DiscordPlayer | null,
  rawBody: unknown,
): Promise<HardcoreProfileResponse> {
  if (!session) {
    console.warn("[hardcoreProfileRequestHandlers] sync called without a valid session");
    return { status: 401, body: { ok: false, error: "not_authenticated" } };
  }

  const snapshot = sanitizeHardcoreProfileSnapshot(rawBody);
  const remote = await syncRemoteHardcoreProfile(session.discordUserId, snapshot, {
    displayName: session.displayName ?? null,
    avatarUrl: session.avatarUrl ?? null,
  });
  if (!remote) {
    console.warn(
      `[hardcoreProfileRequestHandlers] sync: hub returned no profile (not configured or failing), discordUserId: ${session.discordUserId}`,
    );
    return { status: 502, body: { ok: false, error: "hardcore_profile_sync_failed" } };
  }
  return { status: 200, body: { ok: true, profile: remote } };
}
