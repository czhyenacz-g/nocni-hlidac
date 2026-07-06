import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ensureHubPlayer } from "@/lib/leaderboard/ensureHubPlayer";

/**
 * "Kdo je přihlášený" pro klientské komponenty (adaptováno z osmaliga.cz
 * `app/api/auth/me/route.ts`) — AuthStatus.tsx si tohle natáhne přes fetch
 * při mountu, ať menu ukazuje aktuální stav bez potřeby Server Component
 * boundary (MainMenuScreen běží pod "use client" app/play/page.tsx stromem).
 *
 * Když je session platná, zároveň best-effort self-healing
 * `ensureHubPlayer` — řeší staré session cookie z doby před VPS wiringem,
 * kdy hráč nikdy nebyl založen v DB (viz TECH_DESIGN.md "Diagnostika:
 * přihlášený hráč chybí na /leaderboard"). Nikdy nezpomalí/nerozbije
 * odpověď — `ensureHubPlayer` sám nikdy nevyhazuje.
 */
export async function GET(): Promise<NextResponse> {
  const player = await getSession();
  if (player) {
    await ensureHubPlayer(player, "auth/me");
  }
  return NextResponse.json({ player });
}
