import { NextRequest } from "next/server";
import { GameMode, resolveGameMode } from "../../game/core/gameMode";

/**
 * Sdílené mezi app/api/player/death/route.ts a .../survive-night/route.ts —
 * tělo requestu je VOLITELNÉ `{ gameMode?: "normal" | "hardcore" }` (klient
 * ho posílá jen pro Hardcore, viz app/play/page.tsx). Chybějící/prázdné/
 * neplatné tělo vrací `undefined` (handleDeathRequest/handleSurviveNightRequest
 * to bere jako "eligible", stejné chování jako předtím, než gameMode vůbec
 * existoval). Přítomná, ale neplatná hodnota (ne přesně "hardcore") se přes
 * `resolveGameMode` bezpečně vyhodnotí jako "normal" — tedy leaderboard
 * zápis server odmítne, nikdy neprojde jen proto, že request přišel odjinud
 * než z naší appky (viz zadání "nestačí to schovat ve frontendu").
 */
export async function readGameModeFromRequest(request: NextRequest): Promise<GameMode | undefined> {
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object" && "gameMode" in parsed) {
      return resolveGameMode((parsed as { gameMode?: unknown }).gameMode);
    }
    return undefined;
  } catch {
    return undefined;
  }
}
