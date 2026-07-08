import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleDeathRequest } from "@/lib/leaderboard/guardRunRequestHandlers";
import { readGameModeFromRequest } from "@/lib/leaderboard/requestGameMode";

/**
 * Voláno best-effort z app/play/page.tsx při přechodu na screen "death".
 * Stejná pravidla jako survive-night/route.ts — identita jen ze session,
 * self-healing `ensureHubPlayer` před samotným death voláním, 401 pro
 * nepřihlášeného, 202 `{ ok: false, stored: false }` při nedostupném/
 * nenakonfigurovaném VPS API, 200 `{ ok: true, stored: true, player: ... }`
 * na úspěch.
 *
 * Tělo requestu je VOLITELNÉ `{ gameMode?: "normal" | "hardcore" }` (viz
 * lib/leaderboard/requestGameMode.ts) — klient (app/play/page.tsx) ho
 * posílá jen pro Hardcore (Normal server API vůbec nevolá, viz zadání).
 * Server zápis pro gameMode "normal" odmítne (handleDeathRequest), server-side
 * guard tedy NENÍ jen schovaný ve frontendu.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  const gameMode = await readGameModeFromRequest(request);
  const { status, body } = await handleDeathRequest(session, gameMode);
  return NextResponse.json(body, { status });
}
