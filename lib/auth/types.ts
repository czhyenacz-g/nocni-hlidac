/**
 * Minimální identita hlídače z Discordu — jen tolik, kolik je potřeba k
 * zobrazení "kdo je přihlášený" a k budoucímu API (žebříček, vzkazy). Žádné
 * tokeny, e-mail, ani guild data se neukládají (viz lib/auth/session.ts).
 */
export interface DiscordPlayer {
  discordUserId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * `DiscordPlayer` + serverový run stav (viz lib/leaderboard/types.ts#GuardRunState)
 * — jen tvar, který vrací `/api/auth/me` (nikdy se neukládá do session cookie,
 * ta nese pořád jen `DiscordPlayer`). `null` u `bestRun`/`currentRun` znamená
 * "hub API nevrátilo stav" (nedostupné/nenakonfigurované/upsert selhal) — na
 * rozdíl od `currentRun: 0` (skutečně žádná odsloužená noc v aktuální šňůře),
 * `null` říká frontendu, ať spadne na lokální fallback (viz
 * game/core/survivedNights.ts, app/play/page.tsx).
 */
export interface AuthenticatedPlayer extends DiscordPlayer {
  bestRun: number | null;
  currentRun: number | null;
}
