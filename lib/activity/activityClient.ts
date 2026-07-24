/**
 * "Odkud hráč hraje" — čistě diagnostická hodnota (viz zadání "Tyto údaje
 * jsou pouze diagnostické. Nemají dávat žádná oprávnění."), NENÍ to auth ani
 * feature-flag. Žádné server-only importy — používá ji jak
 * `app/api/player/activity/game-start/route.ts` (server), tak
 * `app/play/page.tsx` (klient, přes `NEXT_PUBLIC_GAME_CLIENT`).
 */
export const ACTIVITY_CLIENTS = ["web", "itch", "local-export"] as const;
export type ActivityClient = (typeof ACTIVITY_CLIENTS)[number] | "unknown";

const BUILD_VERSION_MAX_LENGTH = 64;

/** Neznámá/chybějící/neplatná hodnota bezpečně padá na "unknown", nikdy se nezahazuje request kvůli tomuhle poli. */
export function resolveActivityClient(raw: unknown): ActivityClient {
  if (typeof raw === "string" && (ACTIVITY_CLIENTS as readonly string[]).includes(raw)) {
    return raw as ActivityClient;
  }
  return "unknown";
}

/** `null` pro chybějící/neplatný typ — string se navíc ořízne na max. délku (viz zadání "maximálně 64 znaků"), nikdy se neodmítá celý request kvůli moc dlouhé hodnotě. */
export function sanitizeBuildVersion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, BUILD_VERSION_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}
