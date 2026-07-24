import { hubGet } from "../hubClient";
import { ActivityClient } from "../activity/activityClient";

/**
 * Data pro `/admin` (viz zadání "Logování hráčské aktivity" — "9./10./11.
 * Stránka /admin") — server-only, volané VÝHRADNĚ z `app/admin/page.tsx`
 * (Server Component, sám ověří `isAdminUsername`, viz zadání "Nevytvářej
 * samostatné admin API, pokud lze data bezpečně načíst přímo v serverové
 * stránce"). Žádný nový Next.js API route — stejný "tichá null na cokoliv,
 * co se pokazí" vzor jako zbytek remote*.ts modulů.
 */
export interface AdminPlayerSummary {
  discordUserId: string;
  displayName: string | null;
  username: string;
  lastLoginAt: string | null;
  lastPlayedAt: string | null;
  lastActivityAt: string | null;
  lastClient: ActivityClient | null;
  lastBuildVersion: string | null;
  /** Přesný název existujícího pole (viz game/core/hardcorePlayerProfileSnapshot.ts#ServerHardcorePlayerProfile). */
  hardcoreBestNight: number;
}

export type PlayerActivityEventType = "login" | "game_started" | "night_survived" | "player_died";

export interface AdminActivityEvent {
  id: string;
  discordUserId: string;
  displayName: string | null;
  username: string;
  eventType: PlayerActivityEventType;
  nightNumber: number | null;
  gameMode: string | null;
  client: ActivityClient | null;
  buildVersion: string | null;
  createdAt: string;
}

/**
 * GET /nocni-hlidac/admin/players?limit=100 (NOVÝ VPS endpoint, viz
 * TECH_DESIGN.md "Logování hráčské aktivity") — VPS strana vrací už
 * seřazené sestupně podle `lastActivityAt` (hráči bez aktivity až dole, viz
 * zadání "10. Řazení"). `null`, když API není nakonfigurované nebo volání
 * selže — `/admin` v tom případě zobrazí prázdnou tabulku, ne chybu.
 */
export async function fetchAdminPlayers(limit = 100): Promise<AdminPlayerSummary[] | null> {
  return hubGet<AdminPlayerSummary[]>(`/nocni-hlidac/admin/players?limit=${limit}`);
}

/**
 * GET /nocni-hlidac/admin/activity-events?limit=100 (NOVÝ VPS endpoint) —
 * VPS strana vrací už seřazené sestupně podle `createdAt` (viz zadání "11.
 * Poslední události"), s denormalizovaným `displayName`/`username` (ať
 * `/admin` nemusí dělat vlastní join podle interního player ID, které tenhle
 * repozitář vůbec nezná — jen `discordUserId`).
 */
export async function fetchAdminActivityEvents(limit = 100): Promise<AdminActivityEvent[] | null> {
  return hubGet<AdminActivityEvent[]>(`/nocni-hlidac/admin/activity-events?limit=${limit}`);
}
