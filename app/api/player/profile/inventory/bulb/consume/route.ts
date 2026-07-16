import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleConsumeBulbInventoryRequest } from "@/lib/playerProfile/playerProfileRequestHandlers";

/** Viz app/api/player/profile/inventory/bulb/add/route.ts — stejný princip, opačný směr. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = null;
  }
  const { status, body } = await handleConsumeBulbInventoryRequest(session, rawBody);
  return NextResponse.json(body, { status });
}
