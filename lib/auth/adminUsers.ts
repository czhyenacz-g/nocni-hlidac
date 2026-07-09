/**
 * Seznam Discord usernames s admin právy (viz zadání "postupně jich může
 * být seznam", "výjimky ve hře a lepší debug") — TEĎ jen jeden účet.
 * Používá se pro herní výjimky (např. brokovnice dostupná od noci 1, ne až
 * od SHOTGUN_LOOT_MIN_NIGHT, viz game/difficulty/nightConfig.ts#canSpawnShotgun)
 * a budoucí debug nástroje. NENÍ to autorizace k žádné serverové akci — hub
 * API/leaderboard se na tohle nespoléhá, je to čistě klientská/herní
 * vlastnost odvozená z přihlášeného Discord účtu (viz
 * app/play/page.tsx#/api/auth/me efekt, AuthenticatedPlayer.username).
 */
export const ADMIN_DISCORD_USERNAMES: readonly string[] = ["czhyenacz"];

/** Case-insensitive porovnání (Discord username je i tak vždy lowercase, ale nespoléhat se na to). */
export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  const normalized = username.toLowerCase();
  return ADMIN_DISCORD_USERNAMES.some((adminUsername) => adminUsername.toLowerCase() === normalized);
}
