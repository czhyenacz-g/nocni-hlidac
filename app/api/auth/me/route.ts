import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthenticatedPlayer } from "@/lib/auth/types";
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
 *
 * `player.bestRun`/`player.currentRun` (viz AuthenticatedPlayer) nesou
 * serverový run stav vrácený tímhle upsertem — `null`, když hub API
 * nevrátilo nic (nedostupné/nenakonfigurované). `app/play/page.tsx` na tom
 * staví, jakou noc má hráč po přihlášení nastoupit dál (currentRun + 1),
 * místo aby slepě spoléhal na lokální localStorage counter.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ player: null });
  }

  const runState = await ensureHubPlayer(session, "auth/me");
  const player: AuthenticatedPlayer = {
    ...session,
    bestRun: runState?.bestRun ?? null,
    currentRun: runState?.currentRun ?? null,
  };
  return NextResponse.json({ player });
}
