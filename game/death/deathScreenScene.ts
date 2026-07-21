import { BackgroundSceneId } from "../visuals/backgroundImages";
import { DeathReason } from "../core/types";

// Čistá, deterministická volba pozadí DRUHÉ fáze DeathScreen.tsx (za
// SceneBackground po/během reveal fáze — viz zadání "Death flow pro minihru
// a vybitou energii", "Obrázek musí být určen primárně podle autoritativního
// deathReason", "Nepoužívej fallback typu activeMonsterId === ..."). Vyňato
// z DeathScreen.tsx, ať jde nezávisle otestovat (stejný "žádná komponenta
// nepočítá odvozený stav sama" vzor jako doorMonsterOverlay.ts).
//
// Priorita (viz DeathScreen.tsx komentáře k jednotlivým větvím):
// 1. titan_door_breach -> vlastní statické Titan pozadí (STEJNÝ obrázek jako
//    4s GAME OVER reveal, viz gameOverReveal.ts).
// 2. emergency_run / blackout_timeout -> generické pozadí (STEJNÝ obrázek
//    jako reveal) — tyhle smrti NEJSOU útokem konkrétního monstra.
// 3. door_open_at_attack / bulb_replacement_attack -> Ghoulova
//    deathDoorAttack animace (skutečný útok monstra u dveří).
// 4. cokoliv jiné (titan_ambush_emergency_run, null) -> generická Ghoulova
//    death animace, beze změny dosavadního chování.
export function resolveDeathScreenScene(reason: DeathReason | null): BackgroundSceneId {
  if (reason === "titan_door_breach") return "titanDeath";
  if (reason === "emergency_run" || reason === "blackout_timeout") return "genericDeath";
  if (reason === "door_open_at_attack" || reason === "bulb_replacement_attack") return "deathDoorAttack";
  return "death";
}
