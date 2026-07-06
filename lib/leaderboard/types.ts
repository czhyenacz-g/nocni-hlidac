/**
 * Jeden záznam v žebříčku hlídačů. Záměrně BEZ `rank` — pořadí je vždy jen
 * pozice v poli (index + 1, viz app/leaderboard/page.tsx), ne uložené číslo,
 * ať nemůže dojít k nesouladu mezi pořadím a skutečným řazením podle
 * `survivedNights`. `recordedAt` je ISO datum (`YYYY-MM-DD`), stejný tvar,
 * jaký by později poslalo skutečné API.
 */
export interface GuardLeaderboardEntry {
  guardName: string;
  survivedNights: number;
  endReason: string;
  recordedAt: string;
}
