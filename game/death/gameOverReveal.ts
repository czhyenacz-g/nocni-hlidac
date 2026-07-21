import { BACKGROUND_SCENES } from "../visuals/backgroundImages";
import { TITAN_ATTACK_SRC } from "../visuals/titanDoorAssets";
import { DeathReason } from "../core/types";

// Impovo současné finální death reveal obrázek (viz DoorView.tsx#deathRevealIndex
// — `doorScene.frames.length - 1`, `door_open_death_0.webp`) — JEDINÝ zdroj
// pravdy, žádná duplicitní cesta natvrdo. Slouží jako fallback pro SKUTEČNÝ
// útok monstra, které nemá vlastní GAME OVER asset (dnes Imp — Titan má
// vlastní `TITAN_ATTACK_SRC` níže).
const IMP_GAME_OVER_IMAGE_SRC = BACKGROUND_SCENES.door.frames[BACKGROUND_SCENES.door.frames.length - 1].src;

// Smrt, která NENÍ přímým útokem konkrétního monstra (viz zadání "Death flow
// pro minihru a vybitou energii") — sdílí stejný soubor jako
// BACKGROUND_SCENES.genericDeath (druhá fáze DeathScreen.tsx), ať nedojde k
// probliknutí mezi reveal a druhou fází.
const GENERIC_DEATH_IMAGE_SRC = BACKGROUND_SCENES.genericDeath.frames[0].src;

// Death reasony, které nejsou útokem žádného konkrétního monstra (minihra,
// vybitá energie) — viz zadání "Nepoužívej fallback typu activeMonsterId
// === ..." — mají PŘEDNOST před jakoukoliv monsterId úvahou.
const GENERIC_DEATH_REASONS: ReadonlySet<DeathReason> = new Set(["emergency_run", "blackout_timeout"]);

/**
 * Čistá, deterministická funkce (viz zadání "reveal musí být deterministický",
 * "Obrázek musí být určen primárně podle autoritativního deathReason") —
 * `deathReason` rozhoduje JAKO PRVNÍ (minihra/vybitá energie -> generický
 * `death_bg_0.webp`, Titanovo prolomení dveří -> jeho vlastní asset), teprve
 * pak (jen pro skutečný útok monstra, kde `deathReason` sám o sobě
 * nerozlišuje mezi monstry — dnes `door_open_at_attack`/
 * `bulb_replacement_attack`, sdílené libovolným non-Titan monstrem) padá
 * volba na `monsterId` (`night.enemy.id`, stejná identifikace jako všude
 * jinde v projektu). Nikdy nevrátí prázdný/neplatný src.
 */
export function resolveGameOverImageSrc(deathReason: DeathReason | null, monsterId: string): string {
  if (deathReason !== null && GENERIC_DEATH_REASONS.has(deathReason)) return GENERIC_DEATH_IMAGE_SRC;
  if (deathReason === "titan_door_breach") return TITAN_ATTACK_SRC;
  if (monsterId === "titan") return TITAN_ATTACK_SRC;
  return IMP_GAME_OVER_IMAGE_SRC;
}
