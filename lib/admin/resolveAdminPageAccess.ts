import { DiscordPlayer } from "../auth/types";
import { isAdminUsername } from "../auth/adminUsers";

export type AdminPageAccess = "guest" | "forbidden" | "allowed";

/**
 * Čistá, testovatelná verze `/admin` access gate (viz app/admin/page.tsx) —
 * používá BEZE ZMĚNY existující `isAdminUsername` (žádný nový admin/
 * permission systém, viz zadání "Použij existující kontrolu admina").
 * Vytažené mimo Server Component, ať se dá otestovat bez renderování JSX/
 * mockování `next/headers`.
 */
export function resolveAdminPageAccess(session: DiscordPlayer | null): AdminPageAccess {
  if (!session) return "guest";
  return isAdminUsername(session.username) ? "allowed" : "forbidden";
}
