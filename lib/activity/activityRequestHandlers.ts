import { DiscordPlayer } from "../auth/types";
import { resolveActivityClient, sanitizeBuildVersion } from "./activityClient";
import { PlayerActivitySummary, recordGameStart } from "./remotePlayerActivity";

export interface GameStartResponse {
  status: number;
  body: { ok: true; activity: PlayerActivitySummary } | { ok: false; error: string };
}

/**
 * `POST /api/player/activity/game-start` (viz zadání "4. Začátek hraní") —
 * session je explicitní parametr, ne interní `getSession()` volání (stejný
 * vzor jako guardRunRequestHandlers.ts/hardcoreProfileRequestHandlers.ts),
 * testovatelné bez mockování cookies/Request. `discordUserId` jde VÝHRADNĚ
 * ze session, request tělo posílá jen `client`/`buildVersion` (diagnostika,
 * "nemá dávat žádná oprávnění" — viz zadání).
 */
export async function handleGameStartRequest(session: DiscordPlayer | null, rawBody: unknown): Promise<GameStartResponse> {
  if (!session) {
    console.warn("[activityRequestHandlers] game-start called without a valid session");
    return { status: 401, body: { ok: false, error: "not_authenticated" } };
  }

  const body = rawBody && typeof rawBody === "object" ? (rawBody as Record<string, unknown>) : {};
  const client = resolveActivityClient(body.client);
  const buildVersion = sanitizeBuildVersion(body.buildVersion);

  const activity = await recordGameStart({ discordUserId: session.discordUserId, client, buildVersion });
  if (!activity) {
    console.warn(`[activityRequestHandlers] game-start: hub returned nothing (not configured or failing), discordUserId: ${session.discordUserId}`);
    return { status: 202, body: { ok: false, error: "activity_not_stored" } };
  }
  return { status: 200, body: { ok: true, activity } };
}
