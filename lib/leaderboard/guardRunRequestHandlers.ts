import { DiscordPlayer } from "../auth/types";
import { recordDeath, recordSurvivedNight } from "./remotePlayer";
import { GuardRunState } from "./types";

export interface GuardRunResponse {
  status: number;
  body: { ok: true; state: GuardRunState } | { ok: false } | { error: string };
}

/**
 * Session-in / response-out logika sdílená mezi
 * `app/api/player/survive-night/route.ts` a `.../death/route.ts` — session
 * je záměrně parametr, ne interní `getSession()` volání, ať se dá otestovat
 * bez cookies/request mockingu (viz guardRunRequestHandlers.test.ts).
 *
 * Anonymní (nepřihlášený) požadavek nikdy nevolá VPS API — `discordUserId`
 * smí pocházet jen ze server-side session, nikdy z těla requestu (viz
 * app/api/player/*.ts route handlery, které sem session posílají).
 */
export async function handleSurviveNightRequest(session: DiscordPlayer | null): Promise<GuardRunResponse> {
  if (!session) return { status: 401, body: { error: "Not authenticated" } };

  const state = await recordSurvivedNight(session.discordUserId);
  if (!state) return { status: 202, body: { ok: false } };
  return { status: 200, body: { ok: true, state } };
}

export async function handleDeathRequest(session: DiscordPlayer | null): Promise<GuardRunResponse> {
  if (!session) return { status: 401, body: { error: "Not authenticated" } };

  const state = await recordDeath(session.discordUserId);
  if (!state) return { status: 202, body: { ok: false } };
  return { status: 200, body: { ok: true, state } };
}
