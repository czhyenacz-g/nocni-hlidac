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
