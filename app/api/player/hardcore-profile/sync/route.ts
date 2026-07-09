import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleSyncHardcoreProfileRequest } from "@/lib/hardcoreProfile/hardcoreProfileRequestHandlers";

/**
 * Voláno best-effort z app/play/page.tsx#handleMonsterDefeatedCinematicComplete
 * — ale VÝHRADNĚ když `state.gameMode === "hardcore"` (viz zadání "Napojení
 * true-ending reward"; Normal true ending tenhle endpoint nikdy nezavolá).
 * Tělo requestu je lokální Hardcore snapshot (viz
 * game/core/hardcorePlayerProfileSnapshot.ts#HardcoreProfileSnapshot) —
 * whitelistuje/validuje/clampuje se až tady na serveru
 * (handleSyncHardcoreProfileRequest), nikdy se neukládá naslepo. Identita
 * (`discordUserId`) jde VÝHRADNĚ ze server-side session, nikdy z těla
 * requestu — klient nemůže synchronizovat cizí profil.
 *
 * Nepřihlášený hráč dostane 401. Chybějící/nedostupné VPS API vrátí 502 —
 * ProfileScreen.tsx na tom pozná, že sync selhal, a zůstane u lokálních dat.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = null;
  }
  const { status, body } = await handleSyncHardcoreProfileRequest(session, rawBody);
  return NextResponse.json(body, { status });
}
