import { DiscordPlayer } from "../auth/types";
import {
  Object13PlayerProfileDto,
  validateIncomingObject13PlayerProfilePutBody,
} from "../../game/core/object13PlayerProfile";
import { fetchRemoteObject13PlayerProfile, putRemoteObject13PlayerProfile } from "./remoteObject13PlayerProfile";

/**
 * Session-in/response-out logika sdílená mezi app/api/player/profile/route.ts
 * GET/PUT handlery — session je záměrně parametr, ne interní `getSession()`
 * volání, ať se dá otestovat bez cookies/request mockingu (stejný vzor jako
 * lib/hardcoreProfile/hardcoreProfileRequestHandlers.ts,
 * lib/leaderboard/guardRunRequestHandlers.ts).
 *
 * Response tvar je záměrně JINÝ než hardcoreProfileRequestHandlers.ts
 * (tam `{ ok: true, profile }` / `{ ok: false, error }`) — tady se na
 * úspěch vrací `Object13PlayerProfileDto` PŘÍMO (bez obálky), na chybu jen
 * `{ error: string, ...extra }` (viz zadání "krok 1B", přesné tvary
 * vyžádané pro 401/409/413/unavailable). Dva nezávislé kontrakty vedle
 * sebe, žádné sdílení typu mezi hardcore a obecným profilem.
 */

export type PlayerProfileGetResponseBody = Object13PlayerProfileDto | { error: string };

export interface PlayerProfileGetResponse {
  status: number;
  body: PlayerProfileGetResponseBody;
}

/**
 * Anonymní (nepřihlášený) požadavek nikdy nevolá VPS — `discordUserId` smí
 * pocházet jen ze server-side session (viz zadání "Browser nesmí mít
 * možnost načíst profil jiného Discord uživatele přidáním query
 * parametru" — tahle funkce se na query vůbec nedívá, jediný vstup je
 * `session`).
 */
export async function handleGetPlayerProfileRequest(session: DiscordPlayer | null): Promise<PlayerProfileGetResponse> {
  if (!session) {
    console.warn("[playerProfileRequestHandlers] get called without a valid session");
    return { status: 401, body: { error: "unauthorized" } };
  }

  const profile = await fetchRemoteObject13PlayerProfile(session.discordUserId);
  if (!profile) {
    console.warn(
      `[playerProfileRequestHandlers] get: hub returned no profile (not configured, failing, or invalid shape), discordUserId: ${session.discordUserId}`,
    );
    return { status: 502, body: { error: "profile_unavailable" } };
  }
  return { status: 200, body: profile };
}

export type PlayerProfilePutErrorBody =
  | { error: "unauthorized" }
  | { error: "invalid_request" }
  | { error: "profile_conflict"; currentRevision: number; currentProfile?: Object13PlayerProfileDto }
  | { error: "profile_too_large" }
  | { error: "profile_not_found" }
  | { error: "profile_unavailable" };

export type PlayerProfilePutResponseBody = Object13PlayerProfileDto | PlayerProfilePutErrorBody;

export interface PlayerProfilePutResponse {
  status: number;
  body: PlayerProfilePutResponseBody;
}

/**
 * `rawBody` je ještě neparsované/nedůvěryhodné JSON tělo requestu z
 * browseru — `validateIncomingObject13PlayerProfilePutBody` (game/core/object13PlayerProfile.ts)
 * ho ověří PŘED jakýmkoliv voláním VPS (viz zadání test "Neplatný browser
 * payload vrátí 400 bez volání VPS"). `discordUserId` se z `rawBody`
 * NIKDY nečte — jde výhradně ze `session.discordUserId` (viz zadání
 * "Browser NESMÍ posílat discordUserId jako autoritativní hodnotu"), takže
 * validátor tenhle typ vůbec nezná.
 */
export async function handlePutPlayerProfileRequest(
  session: DiscordPlayer | null,
  rawBody: unknown,
): Promise<PlayerProfilePutResponse> {
  if (!session) {
    console.warn("[playerProfileRequestHandlers] put called without a valid session");
    return { status: 401, body: { error: "unauthorized" } };
  }

  const validated = validateIncomingObject13PlayerProfilePutBody(rawBody);
  if (!validated.ok) {
    return { status: 400, body: { error: "invalid_request" } };
  }

  const result = await putRemoteObject13PlayerProfile({
    discordUserId: session.discordUserId,
    expectedRevision: validated.data.expectedRevision,
    profileVersion: validated.data.profileVersion,
    profileData: validated.data.profileData,
  });

  switch (result.outcome) {
    case "saved":
      return { status: 200, body: result.profile };
    case "conflict":
      return {
        status: 409,
        body: {
          error: "profile_conflict",
          currentRevision: result.currentRevision,
          ...(result.currentProfile ? { currentProfile: result.currentProfile } : {}),
        },
      };
    case "too_large":
      return { status: 413, body: { error: "profile_too_large" } };
    case "not_found":
      return { status: 404, body: { error: "profile_not_found" } };
    case "unavailable":
      console.warn(
        `[playerProfileRequestHandlers] put: hub returned no result (not configured or failing), discordUserId: ${session.discordUserId}`,
      );
      return { status: 502, body: { error: "profile_unavailable" } };
  }
}
