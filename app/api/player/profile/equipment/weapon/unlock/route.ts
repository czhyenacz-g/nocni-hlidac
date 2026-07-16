import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleUnlockWeaponRequest } from "@/lib/playerProfile/playerProfileRequestHandlers";

/**
 * Doménová operace, NIKDY obecný PUT /api/player/profile pro herní logiku
 * (viz zadání "profilový kontrakt V2 + equipment", "11. Next.js proxy").
 * Tělo requestu je `{ weaponId, expectedRevision }` — bez `discordUserId`,
 * stejný princip jako inventářové operace (jde výhradně ze session).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = null;
  }
  const { status, body } = await handleUnlockWeaponRequest(session, rawBody);
  return NextResponse.json(body, { status });
}
