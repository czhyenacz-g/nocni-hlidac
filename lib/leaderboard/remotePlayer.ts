import { hubPost } from "../hubClient";
import { DiscordPlayer } from "../auth/types";
import { GuardRunState } from "./types";

/**
 * POST /nocni-hlidac/player/upsert (viz TECH_DESIGN.md "VPS API specifikace")
 * — voláno best-effort po Discord loginu (app/api/auth/callback/route.ts).
 * Nikdy nesmí rozbít přihlášení, proto nevrací nic zajímavé, jen se pokusí.
 */
export async function upsertHubPlayer(player: DiscordPlayer): Promise<void> {
  await hubPost<unknown>("/nocni-hlidac/player/upsert", player);
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
