import { BACKGROUND_SCENES } from "../visuals/backgroundImages";
import { TITAN_ATTACK_SRC } from "../visuals/titanDoorAssets";

// Impovo současné finální death reveal obrázek (viz DoorView.tsx#deathRevealIndex
// — `doorScene.frames.length - 1`, `door_open_death_0.webp`) — JEDINÝ zdroj
// pravdy, žádná duplicitní cesta natvrdo. Slouží i jako generický fallback
// pro budoucí monstra bez vlastního GAME OVER assetu (viz zadání "3. pro
// budoucí monstra obecný fallback podle současné architektury") — bezpečná
// volba, protože je to už dnes jediný "monstrum ve dveřích" obrázek ve hře.
const GENERIC_GAME_OVER_IMAGE_SRC = BACKGROUND_SCENES.door.frames[BACKGROUND_SCENES.door.frames.length - 1].src;

/**
 * Čistá, deterministická funkce (viz zadání "reveal musí být deterministický")
 * — `monsterId` je `night.enemy.id`, stejná identifikace jako všude jinde v
 * projektu (žádné nové `isTitan` pole). Titan má vlastní obrázek
 * (`titan_attacks_broken_door.webp`, viz game/visuals/titanDoorAssets.ts),
 * cokoliv jiného (dnes jen "imp", případně budoucí neznámé monstrum) dostane
 * bezpečný generický fallback — nikdy nevrátí prázdný/neplatný src.
 */
export function resolveGameOverImageSrc(monsterId: string): string {
  if (monsterId === "titan") return TITAN_ATTACK_SRC;
  return GENERIC_GAME_OVER_IMAGE_SRC;
}
