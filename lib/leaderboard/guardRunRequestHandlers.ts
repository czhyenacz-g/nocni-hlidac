import { DiscordPlayer } from "../auth/types";
import { ensureHubPlayer } from "./ensureHubPlayer";
import { recordDeath, recordSurvivedNight } from "./remotePlayer";
import { GuardRunState } from "./types";

export interface GuardRunResponse {
  status: number;
  body: { ok: true; stored: true; player: GuardRunState } | { ok: false; stored: false } | { ok: false; error: string };
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
 *
 * `ensureHubPlayer` běží PŘED samotným survive-night/death voláním — řeší
 * starou session z doby před VPS wiringem, kdy hráč nikdy nebyl založen (viz
 * TECH_DESIGN.md "Diagnostika: přihlášený hráč chybí na /leaderboard").
 * Volá se pokaždé, ne jen když by hráč chyběl — je to idempotentní upsert,
 * ne drahá kontrola existence.
 */
export async function handleSurviveNightRequest(session: DiscordPlayer | null): Promise<GuardRunResponse> {
  if (!session) {
    console.warn("[guardRunRequestHandlers] survive-night called without a valid session");
    return { status: 401, body: { ok: false, error: "not_authenticated" } };
  }

  await ensureHubPlayer(session, "survive-night");

  const state = await recordSurvivedNight(session.discordUserId);
  if (!state) {
    console.warn(
      `[guardRunRequestHandlers] survive-night: hub returned no state (not configured or still failing after ensure), discordUserId: ${session.discordUserId}`,
    );
    return { status: 202, body: { ok: false, stored: false } };
  }
  return { status: 200, body: { ok: true, stored: true, player: state } };
}

export async function handleDeathRequest(session: DiscordPlayer | null): Promise<GuardRunResponse> {
  if (!session) {
    console.warn("[guardRunRequestHandlers] death called without a valid session");
    return { status: 401, body: { ok: false, error: "not_authenticated" } };
  }

  await ensureHubPlayer(session, "death");

  const state = await recordDeath(session.discordUserId);
  if (!state) {
    console.warn(
      `[guardRunRequestHandlers] death: hub returned no state (not configured or still failing after ensure), discordUserId: ${session.discordUserId}`,
    );
    return { status: 202, body: { ok: false, stored: false } };
  }
  return { status: 200, body: { ok: true, stored: true, player: state } };
}
