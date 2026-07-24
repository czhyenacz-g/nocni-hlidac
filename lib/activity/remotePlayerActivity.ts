import { hubPost } from "../hubClient";
import { ActivityClient } from "./activityClient";

/**
 * Souhrnná pole hráče aktualizovaná aktivitou (viz zadání "2. Souhrnná pole
 * hráče") — VPS strana (project-hub-api, mimo tento repozitář) je ukládá na
 * existující tabulku hráče. `null` znamená "hráč zatím tuhle událost nikdy
 * neměl", ne chybu.
 */
export interface PlayerActivitySummary {
  lastLoginAt: string | null;
  lastPlayedAt: string | null;
  lastActivityAt: string | null;
  lastClient: ActivityClient | null;
  lastBuildVersion: string | null;
}

/**
 * POST /nocni-hlidac/player/login (NOVÝ VPS endpoint, viz TECH_DESIGN.md
 * "Logování hráčské aktivity") — volá se VÝHRADNĚ po skutečně dokončeném
 * Discord OAuth callbacku (viz app/api/auth/callback/route.ts), NIKDY z
 * `/api/auth/me`/`ensureHubPlayer` (ten běží při každé kontrole session —
 * zadání výslovně zakazuje zápis `last_login_at` na každý GET). VPS strana
 * aktualizuje `last_login_at`/`last_activity_at` a zapíše `login` řádek do
 * `player_activity_events`. `false`, když API není nakonfigurované nebo
 * volání selže — nikdy nevyhazuje (stejný "tichý no-op" vzor jako
 * ensureHubPlayer.ts).
 */
export async function recordPlayerLogin(discordUserId: string): Promise<boolean> {
  try {
    const result = await hubPost<{ ok: boolean }>("/nocni-hlidac/player/login", { discordUserId });
    if (!result?.ok) {
      console.warn(`[remotePlayerActivity] login not recorded (hub not configured/failing), discordUserId: ${discordUserId}`);
    }
    return result?.ok === true;
  } catch (err) {
    console.error(`[remotePlayerActivity] unexpected error recording login, discordUserId: ${discordUserId}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

export interface RecordGameStartPayload {
  discordUserId: string;
  client: ActivityClient;
  buildVersion: string | null;
}

/**
 * POST /nocni-hlidac/player/activity/game-start (NOVÝ VPS endpoint) —
 * aktualizuje `last_played_at`/`last_activity_at`/`last_client`/
 * `last_build_version` a zapíše `game_started` řádek do
 * `player_activity_events`. `null`, když API není nakonfigurované nebo
 * volání selže (stejný "tichá null" vzor jako zbytek remote*.ts modulů).
 */
export async function recordGameStart(payload: RecordGameStartPayload): Promise<PlayerActivitySummary | null> {
  return hubPost<PlayerActivitySummary>("/nocni-hlidac/player/activity/game-start", payload);
}
