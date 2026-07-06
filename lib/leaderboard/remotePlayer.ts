import { hubPost } from "../hubClient";
import { DiscordPlayer } from "../auth/types";
import { GuardRunState } from "./types";

/**
 * POST /nocni-hlidac/player/upsert (viz TECH_DESIGN.md "VPS API specifikace")
 * — nikdy nevyhazuje, jen se pokusí (hubPost už sám o sobě nikdy neodmítne).
 * Vrací aktuální `GuardRunState` (nový hráč dostane `{bestRun: 0, currentRun: 0}`,
 * upsert existujícího nikdy nepřepíše bestRun/currentRun) — `null`, když
 * volání selže nebo API není nakonfigurované. Volající (viz
 * ensureHubPlayer.ts) podle `null` rozhodne, jestli zalogovat neúspěch, a
 * podle vrácené hodnoty ví, jaké currentRun/bestRun hráč doopravdy má (viz
 * app/api/auth/me/route.ts — frontend na tom navazuje další noc).
 */
export async function upsertHubPlayer(player: DiscordPlayer): Promise<GuardRunState | null> {
  return hubPost<GuardRunState>("/nocni-hlidac/player/upsert", player);
}

/**
 * POST /nocni-hlidac/player/survive-night — `discordUserId` musí pocházet
 * jen ze server-side session (viz app/api/player/survive-night/route.ts),
 * nikdy z klienta. `null`, když API není nakonfigurované nebo volání selže.
 */
export async function recordSurvivedNight(discordUserId: string): Promise<GuardRunState | null> {
  return hubPost<GuardRunState>("/nocni-hlidac/player/survive-night", { discordUserId });
}

/** POST /nocni-hlidac/player/death — stejná pravidla jako recordSurvivedNight. */
export async function recordDeath(discordUserId: string): Promise<GuardRunState | null> {
  return hubPost<GuardRunState>("/nocni-hlidac/player/death", { discordUserId });
}
