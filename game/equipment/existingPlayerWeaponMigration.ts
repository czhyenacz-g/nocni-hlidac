// Jednorázová bezpečná migrace hráče se starou (čistě lokální)
// dvouhlavňovkovou odměnou (game/core/monsterDefeatReward.ts) do equipment
// modelu (viz zadání "10. Migrace existujícího hráče" — musí být
// idempotentní, bezpečná, bez automatického retry, nesmí přijít o už
// získanou brokovnici). Žádné React, žádný fetch tady — jen čisté
// rozhodnutí, co (pokud vůbec) udělat; volání
// `Object13PlayerProfileProvider#unlockWeapon` i "jen jednou za mount"
// ochrana žijí v app/play/page.tsx (stejné dělení jako
// game/inventory/bulbInventoryController.ts / game/equipment/weaponAcquisitionController.ts).

import { MonsterDefeatReward } from "../core/monsterDefeatReward";
import { getOwnedWeapons, Object13PlayerProfileLoadState } from "../core/object13PlayerProfile";

export type ExistingPlayerWeaponMigrationAction = { type: "none" } | { type: "unlock_double_barrel" };

/**
 * Migruje VÝHRADNĚ přes doménový unlock endpoint (nikdy obecný PUT, viz
 * zadání "migrace musí jít přes unlock endpoint") a VÝHRADNĚ
 * `double_barrel_shotgun` — `single_shotgun` nemá spolehlivý lokální signál
 * (`MonsterDefeatReward` nikdy netrackoval "hráč má běžnou brokovnici",
 * jen dvouhlavňovku, viz zadání "pokud nejde spolehlivě odvodit,
 * neodhaduj").
 *
 * Podmínky (VŠECHNY musí platit, jinak `{ type: "none" }`):
 * - profil je `ready` (přihlášený hráč, profil úspěšně načten ze serveru),
 * - profil PRÁVĚ TEĎ nemá VŮBEC žádnou zbraň (`ownedWeapons.length === 0`)
 *   — jakmile má cokoliv (ať už z týhle migrace, nebo normální herní
 *   cesty), migrace se už NIKDY nespustí znovu a existující vlastnictví se
 *   nikdy nepřepíše,
 * - starý lokální reward spolehlivě říká `doubleBarrelUnlocked === true`.
 *
 * Idempotence a "žádný retry": tahle funkce sama je čistá a bezpečná zavolat
 * opakovaně za stejného vstupu (vrátí pořád stejnou odpověď) — o to, že se
 * REÁLNÝ unlock request pokusí nanejvýš jednou za mount (i po
 * conflict/unavailable), se stará volající v app/play/page.tsx vlastním
 * refem. I kdyby se to nějak povedlo zavolat dvakrát, samotný server unlock
 * je idempotentní (viz playerProfileEquipmentService.ts — druhé volání se
 * stejným výsledkem je no-op, revision beze změny).
 */
export function resolveExistingPlayerWeaponMigrationAction(
  loadState: Object13PlayerProfileLoadState,
  localReward: Pick<MonsterDefeatReward, "doubleBarrelUnlocked">,
): ExistingPlayerWeaponMigrationAction {
  if (loadState.status !== "ready") return { type: "none" };
  if (getOwnedWeapons(loadState.profile).length > 0) return { type: "none" };
  if (!localReward.doubleBarrelUnlocked) return { type: "none" };
  return { type: "unlock_double_barrel" };
}
