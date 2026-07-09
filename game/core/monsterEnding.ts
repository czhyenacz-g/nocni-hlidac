// Skrytý true ending (viz zadání) — hráč musí BĚHEM JEDNÉ NOCI 10× trefit
// monstrum brokovnicí a pokaždé se s tím bezpečně vrátit do kanceláře (viz
// EmergencyMiniGameResult.monsterHit, game/minigame/logic.ts#createReturnedResult).
// Samotný zásah v minihře nic nepotvrzuje — potvrzení (a tedy i případné
// spuštění endingu) žije výhradně tady, volané z gameReducer.ts#CONFIRM_MONSTER_HIT.

/** Kolik potvrzených zásahů za JEDNU noc je potřeba pro true ending — jediné místo, které tohle číslo definuje. */
export const MONSTER_TRUE_ENDING_REQUIRED_HITS = 10;

/**
 * Admin zkrácený práh (viz zadání "for admin reduce necessary monster death
 * count to 2", lib/auth/adminUsers.ts) — rychlejší ruční testování true
 * endingu/MonsterDefeatedScreen cinematicu, ať admin nemusí 10× obcházet
 * celou emergency výpravu. Stejný "admin obchází produkční číslo" vzor jako
 * `canSpawnShotgun`/`SHOTGUN_LOOT_MIN_NIGHT` v game/difficulty/nightConfig.ts.
 */
export const MONSTER_TRUE_ENDING_REQUIRED_HITS_ADMIN = 2;

/**
 * `isAdmin` (viz lib/auth/adminUsers.ts#isAdminUsername) je záměrně
 * samostatný parametr, ne nová konstanta/night override — je to vlastnost
 * PŘIHLÁŠENÉHO HRÁČE, ne noci samotné (stejná konvence jako
 * canSpawnShotgun v game/difficulty/nightConfig.ts).
 */
export function resolveMonsterTrueEndingRequiredHits(isAdmin: boolean = false): number {
  return isAdmin ? MONSTER_TRUE_ENDING_REQUIRED_HITS_ADMIN : MONSTER_TRUE_ENDING_REQUIRED_HITS;
}

export interface ConfirmMonsterHitResult {
  monsterHitsToday: number;
  monsterDefeated: boolean;
}

/**
 * Potvrdí `hitCount` zásahů najednou — čistá funkce, žádná mutace. Volá se
 * jen po bezpečném návratu do kanceláře (viz gameReducer.ts
 * CONFIRM_MONSTER_HIT, `state.pendingMonsterHits`), nikdy při samotném
 * výstřelu/zásahu v minihře. `hitCount` > 1 podporuje dvouhlavňovku (až 2
 * zásahy za jednu výpravu, viz GameState.pendingMonsterHits,
 * EmergencyMiniGame.tsx `monsterHitsThisRun`). `monsterDefeated` se stane `true`, jakmile
 * kumulativní počet dosáhne/přesáhne `requiredHits` (výchozí
 * `MONSTER_TRUE_ENDING_REQUIRED_HITS`, ale volající — gameReducer.ts —
 * posílá skutečnou `state.nightFeatures.monsterTrueEndingRequiredHits`, ať
 * admin zkrácený práh funguje) — i kdyby `hitCount` sám o sobě práh
 * překročil (např. 8 + 2 z dvouhlavňovky).
 */
export function confirmMonsterHit(
  monsterHitsToday: number,
  hitCount: number,
  requiredHits: number = MONSTER_TRUE_ENDING_REQUIRED_HITS,
): ConfirmMonsterHitResult {
  const nextHits = monsterHitsToday + hitCount;
  return { monsterHitsToday: nextHits, monsterDefeated: nextHits >= requiredHits };
}
