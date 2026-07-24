import { NextRequest } from "next/server";
import { GameMode, resolveGameMode } from "../../game/core/gameMode";

/**
 * Sdílené mezi app/api/player/death/route.ts a .../survive-night/route.ts —
 * tělo requestu je `{ gameMode?: "normal" | "hardcore", nightNumber?: number }`
 * (oboje volitelné). `gameMode` posílá klient jen pro Hardcore (viz
 * app/play/page.tsx). Chybějící/prázdné/neplatné tělo vrací `{}` (handlery
 * to berou jako "eligible", stejné chování jako předtím, než gameMode vůbec
 * existoval). Přítomná, ale neplatná `gameMode` hodnota (ne přesně
 * "hardcore") se přes `resolveGameMode` bezpečně vyhodnotí jako "normal" —
 * tedy leaderboard zápis server odmítne, nikdy neprojde jen proto, že
 * request přišel odjinud než z naší appky (viz zadání "nestačí to schovat
 * ve frontendu").
 *
 * `nightNumber` (viz zadání "7. Události... night_survived/player_died —
 * ulož night_number") — jen pro `player_activity_events` log na VPS straně,
 * NEOVLIVŇUJE leaderboard zápis. Neplatná hodnota (ne kladné celé číslo)
 * padá na `undefined` (log eventu pak `night_number` prostě nemá, nullable
 * pole), nikdy request neodmítá.
 *
 * Obojí se čte z JEDNOHO parsování těla (`request.json()` lze zavolat jen
 * jednou) — proto jedna funkce, ne dvě samostatné.
 */
export interface GuardRunRequestBody {
  gameMode?: GameMode;
  nightNumber?: number;
}

function parseNightNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) return undefined;
  return value;
}

export async function readGuardRunRequestBody(request: NextRequest): Promise<GuardRunRequestBody> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") return {};
    const record = parsed as Record<string, unknown>;
    return {
      gameMode: "gameMode" in record ? resolveGameMode(record.gameMode) : undefined,
      nightNumber: "nightNumber" in record ? parseNightNumber(record.nightNumber) : undefined,
    };
  } catch {
    return {};
  }
}
