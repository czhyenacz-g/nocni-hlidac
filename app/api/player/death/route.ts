import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleDeathRequest } from "@/lib/leaderboard/guardRunRequestHandlers";

/**
 * Voláno best-effort z app/play/page.tsx při přechodu na screen "death".
 * Stejná pravidla jako survive-night/route.ts — identita jen ze session,
 * self-healing `ensureHubPlayer` před samotným death voláním, 401 pro
 * nepřihlášeného, 202 `{ ok: false, stored: false }` při nedostupném/
 * nenakonfigurovaném VPS API, 200 `{ ok: true, stored: true, player: ... }`
 * na úspěch.
 */
export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  const { status, body } = await handleDeathRequest(session);
  return NextResponse.json(body, { status });
}
