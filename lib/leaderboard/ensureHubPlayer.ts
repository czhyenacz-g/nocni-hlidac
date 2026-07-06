import { DiscordPlayer } from "../auth/types";
import { upsertHubPlayer } from "./remotePlayer";
import { GuardRunState } from "./types";

/**
 * Self-healing upsert — volaná odkudkoliv, kde máme platnou session
 * (`/api/auth/me`, `/api/player/survive-night`, `/api/player/death`), NE JEN
 * z OAuth callbacku (`app/api/auth/callback/route.ts` ho volá taky, ať je
 * logování na jednom místě). Řeší staré session cookie z doby PŘED tím, než
 * callback vůbec začal volat VPS upsert — taková session je pořád platná
 * (`getSession()` jen dekóduje cookie, nikdy se neptá VPS), takže hráč by
 * jinak zůstal navždy nezaložený, dokud se ručně znovu nepřihlásí (viz
 * TECH_DESIGN.md "Diagnostika: přihlášený hráč chybí na /leaderboard").
 *
 * Idempotentní (upsert), nikdy nevyhazuje, jen zaloguje neúspěch —
 * `discordUserId` v logu není citlivý údaj (veřejné Discord snowflake ID,
 * ne token), ale token/hlavičky/cookie se nikdy nelogují. Vrací aktuální
 * `GuardRunState` (`null` na neúspěch/nedostupnost) — `/api/auth/me` na tom
 * staví odpověď, ať frontend zná server currentRun/bestRun hned po přihlášení.
 */
export async function ensureHubPlayer(player: DiscordPlayer, context: string): Promise<GuardRunState | null> {
  try {
    const state = await upsertHubPlayer(player);
    if (!state) {
      console.warn(`[ensureHubPlayer] upsert did not succeed (context: ${context}, discordUserId: ${player.discordUserId})`);
    }
    return state;
  } catch (err) {
    console.error(
      `[ensureHubPlayer] unexpected error (context: ${context}, discordUserId: ${player.discordUserId}):`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
