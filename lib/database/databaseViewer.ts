// Čisté funkce, které staví bezpečný "kdo se dívá na databázi" pohled (viz
// databaseTypes.ts#DatabaseViewer/DatabasePlayerPreview) — jediné místo,
// které smí sahat na DiscordPlayer/AuthenticatedPlayer a rozhodnout, co z
// nich smí dojít do klientských komponent. app/database/page.tsx volá tyhle
// funkce server-side (getSession() + ensureHubPlayer, stejný vzor jako
// app/api/auth/me/route.ts) a dál posílá jen výsledek, nikdy původní objekt.

import { AuthenticatedPlayer, DiscordPlayer } from "../auth/types";
import { DatabasePlayerPreview, DatabaseViewer } from "./databaseTypes";

/**
 * `player` = `null` pro nepřihlášeného hráče (getSession() nic nevrátí).
 * Nikdy nekopíruje avatar/token/další pole `DiscordPlayer` dál, než je
 * potřeba — jen `discordUserId`/`displayName`, přesně tvar `DatabaseViewer`.
 */
export function buildDatabaseViewer(player: DiscordPlayer | null): DatabaseViewer {
  if (!player) return { isAuthenticated: false };
  return {
    isAuthenticated: true,
    userId: player.discordUserId,
    displayName: player.displayName,
  };
}

/**
 * `run` = server `GuardRunState` (viz ensureHubPlayer), `null` když hub API
 * nevrátilo nic (nedostupné/nenakonfigurované/upsert selhal) — v tom
 * případě zůstávají `currentNight`/`highestNightReached` `undefined`
 * (zobrazí se "ZATÍM NENAPOJENO", viz DatabaseViewerStatus.tsx), NE `0` —
 * `currentRun: 0`/`bestRun: 0` je naopak SKUTEČNÁ hodnota ("zatím žádná
 * přežitá noc"), ne placeholder, takže se propíše beze změny.
 * `discoveredSubjectCount`/`completedReportCount` nikde v projektu zatím
 * neexistují — zůstávají vždy `undefined`, žádná vymyšlená hodnota.
 */
export function buildDatabasePlayerPreview(run: Pick<AuthenticatedPlayer, "currentRun" | "bestRun"> | null): DatabasePlayerPreview {
  if (!run) return {};
  return {
    currentNight: run.currentRun ?? undefined,
    highestNightReached: run.bestRun ?? undefined,
  };
}

/**
 * Sdílená "chybějící hodnota" formátovací funkce (viz zadání "Pokud
 * některá hodnota neexistuje, zobraz stav: NEEVIDOVÁNO nebo: ZATÍM NENÍ
 * NAPOJENO") — jedno místo pro DatabaseViewerStatus.tsx i
 * DatabaseSubjectsTab.tsx, ať se placeholder text nikdy nerozejde. `0` je
 * platná skutečná hodnota (viz buildDatabasePlayerPreview výše), takže se
 * propíše jako "0", ne jako placeholder — jen `undefined` znamená
 * "nenapojeno". `placeholderText` dodává volající klientská komponenta
 * (přes useCopy().database.notConnectedValue, viz i18n) — tahle čistá
 * funkce sama žádný jazyk nezná.
 */
export function formatDatabasePlaceholderValue(value: number | undefined, placeholderText: string): string {
  return value === undefined ? placeholderText : String(value);
}
