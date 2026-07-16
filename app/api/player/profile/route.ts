import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleGetPlayerProfileRequest, handlePutPlayerProfileRequest } from "@/lib/playerProfile/playerProfileRequestHandlers";

/**
 * Obecný, mode-agnostic profil Objektu 13 (krok 1B, navazuje na VPS krok
 * 1A — `Object13PlayerProfile`) — na rozdíl od `hardcore-profile/route.ts`
 * BEZ query parametru: `discordUserId` jde VÝHRADNĚ ze server-side session
 * (`getSession()`), browser ho nikdy neposílá a nemůže si tak přečíst cizí
 * profil přidáním `?discordUserId=` do URL (viz zadání "Bezpečnost").
 * Nepřihlášený hráč dostane 401 — žádný redirect, žádný pád, volající
 * (viz components/playerProfile/Object13PlayerProfileProvider.tsx) na tom
 * pozná "neregistruj se ani nezkoušej znovu, hráč prostě není přihlášený".
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  const { status, body } = await handleGetPlayerProfileRequest(session);
  return NextResponse.json(body, { status });
}

/**
 * Tělo requestu je `{ expectedRevision, profileVersion, profileData }` —
 * ŽÁDNÉ `discordUserId` (viz zadání "Browser NESMÍ posílat discordUserId
 * jako autoritativní hodnotu") — i kdyby ho klient poslal, validátor
 * (`validateIncomingObject13PlayerProfilePutBody`) ho vůbec nečte, identita
 * jde vždy ze session. Neplatné tělo se odmítne (400) PŘED jakýmkoliv
 * voláním VPS.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  let rawBody: unknown = null;
  try {
    rawBody = await request.json();
  } catch {
    rawBody = null;
  }
  const { status, body } = await handlePutPlayerProfileRequest(session, rawBody);
  return NextResponse.json(body, { status });
}
