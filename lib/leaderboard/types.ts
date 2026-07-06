/**
 * Jeden záznam v žebříčku hlídačů. Záměrně BEZ `rank` — pořadí je vždy jen
 * pozice v poli (index + 1, viz app/leaderboard/page.tsx), seřazené sestupně
 * podle `bestRun`, ne uložené číslo, ať nemůže dojít k nesouladu mezi
 * pořadím a skutečným řazením.
 *
 * `bestRun` = nejlepší dosažený počet přežitých nocí (rekord, nikdy neklesá).
 * `currentRun` = aktuálně rozehraná série přežitých nocí (0 = hlídač bez
 * aktivní směny — buď ještě nezačal, nebo naposledy zemřel). Budoucí herní
 * pravidlo (zatím NEIMPLEMENTOVANÉ, jen zápis do dat): po přežité noci
 * `currentRun += 1; bestRun = max(bestRun, currentRun)`, po smrti
 * `currentRun = 0` (bestRun zůstává beze změny). Death reason/last run/datum
 * záznamu záměrně nejsou součástí tohohle typu — patří do budoucího
 * `guard_runs`/vzkazů, ne do hlavního žebříčku.
 */
export interface GuardLeaderboardEntry {
  guardName: string;
  bestRun: number;
  currentRun: number;
}
