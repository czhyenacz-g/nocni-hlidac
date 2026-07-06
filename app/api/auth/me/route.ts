import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * "Kdo je přihlášený" pro klientské komponenty (adaptováno z osmaliga.cz
 * `app/api/auth/me/route.ts`) — AuthStatus.tsx si tohle natáhne přes fetch
 * při mountu, ať menu ukazuje aktuální stav bez potřeby Server Component
 * boundary (MainMenuScreen běží pod "use client" app/play/page.tsx stromem).
 */
export async function GET(): Promise<NextResponse> {
  const player = await getSession();
  return NextResponse.json({ player });
}
