import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleAddBulbInventoryRequest } from "@/lib/playerProfile/playerProfileRequestHandlers";

/**
 * Doménová operace, NIKDY obecný PUT /api/player/profile pro herní logiku
 * (viz zadání "krok: profilový kontrakt V1 + inventář žárovek", "5. Serverové
 * doménové operace pro žárovky"). Tělo requestu je `{ amount, expectedRevision }`
 * — bez `discordUserId`, stejný princip jako obecný PUT (jde výhradně ze
 * session).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = null;
  }
  const { status, body } = await handleAddBulbInventoryRequest(session, rawBody);
  return NextResponse.json(body, { status });
}
