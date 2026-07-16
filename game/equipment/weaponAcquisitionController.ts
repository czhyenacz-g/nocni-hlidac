// Čistá rozhodovací/mapovací vrstva pro trvalé odemykání zbraní (viz zadání
// "profilový kontrakt V2 + equipment" — stejný princip jako
// game/inventory/bulbInventoryController.ts, jen pro `unlockWeapon` místo
// consumeBulbs/addBulbs). Žádné React, žádný fetch, žádný dispatch tady —
// jen (1) rozhodnutí "lokálně, nebo přes server?" a (2) mapování syrového
// výsledku serverové operace na jednoduchý výsledek, který volající
// (app/play/page.tsx) použije k rozhodnutí o následném dispatchi/lokálním
// zápisu.

import { GameMode, GAME_MODE_CONFIG } from "../core/gameMode";
import { getEquippedWeaponId, Object13PlayerProfileLoadState, Object13PlayerProfileWeaponUnlockResult } from "../core/object13PlayerProfile";
import {
  createFreshRunShotgunEquipment,
  createFreshRunShotgunEquipmentFromWeaponId,
  FreshRunShotgunEquipment,
} from "../core/shotgunEquipment";

export type WeaponAcquisitionPersistenceMode = "local" | "server";

/**
 * "local" = Training nebo anonymní hráč (i Hardcore bez `ready` profilu,
 * což MainMenuScreen.tsx normálně vůbec nepustí spustit) — zbraň se rovnou
 * projeví v runtime GameState, nic se neposílá na VPS. "server" = Hardcore s
 * `ready` profilem — vlastnictví zbraně musí nejdřív potvrdit server (viz
 * zadání "13./14. server-confirmed acquisition"), teprve pak smí volající
 * zbraň promítnout do GameState. Stejná `persistInventory` konfigurace jako
 * u žárovek (viz game/core/gameMode.ts) — vlastnictví zbraně je stejně
 * "trvalý profilový stav", ne runtime-only jako munice.
 */
export function resolveWeaponAcquisitionPersistenceMode(
  gameMode: GameMode,
  loadState: Object13PlayerProfileLoadState,
): WeaponAcquisitionPersistenceMode {
  if (GAME_MODE_CONFIG[gameMode].persistInventory && loadState.status === "ready") return "server";
  return "local";
}

/**
 * Výchozí výbava brokovnice na začátku nového runu (viz zadání "15.
 * Inicializace nové mise") — Hardcore s `ready` profilem čte VÝHRADNĚ
 * `equippedWeaponId` z profilu (jediná autorita, viz zadání "9. Odstranění
 * paralelní autority"), Training/anonymní/Hardcore bez `ready` profilu
 * (MainMenuScreen.tsx takový run normálně vůbec nepustí) zůstává u
 * dosavadního lokálního `MonsterDefeatReward.doubleBarrelUnlocked`
 * fallbacku (`localDoubleBarrelUnlocked` — volající si ho přečte sám, viz
 * game/core/monsterDefeatReward.ts#getMonsterDefeatReward, ať tenhle modul
 * nezávisí na localStorage).
 */
export function resolveFreshRunShotgunEquipment(
  gameMode: GameMode,
  loadState: Object13PlayerProfileLoadState,
  localDoubleBarrelUnlocked: boolean,
): FreshRunShotgunEquipment {
  if (resolveWeaponAcquisitionPersistenceMode(gameMode, loadState) === "server" && loadState.status === "ready") {
    return createFreshRunShotgunEquipmentFromWeaponId(getEquippedWeaponId(loadState.profile));
  }
  return createFreshRunShotgunEquipment(localDoubleBarrelUnlocked);
}

export type WeaponAcquisitionConfirmOutcome = { outcome: "confirmed" } | { outcome: "conflict" } | { outcome: "unavailable" };

/**
 * Mapuje syrový výsledek `Object13PlayerProfileProvider#unlockWeapon` na
 * jednoduchý výsledek, podle kterého volající rozhodne, jestli lokální
 * herní efekt (přiznání brokovnice v GameState) dokončit, nebo ne.
 * `"updated"`/`"unchanged"` OBOJE znamenají potvrzené vlastnictví (viz
 * server playerProfileEquipmentService.ts — `"unchanged"` je idempotentní
 * no-op, ale pořád úspěch). `"error"` (network/jiná neočekávaná chyba) se
 * mapuje na `"unavailable"` — volajícímu na přesném důvodu nezáleží.
 */
export function deriveWeaponAcquisitionConfirmOutcome(
  result: Object13PlayerProfileWeaponUnlockResult,
): WeaponAcquisitionConfirmOutcome {
  switch (result.status) {
    case "updated":
    case "unchanged":
      return { outcome: "confirmed" };
    case "conflict":
      return { outcome: "conflict" };
    default:
      return { outcome: "unavailable" };
  }
}
