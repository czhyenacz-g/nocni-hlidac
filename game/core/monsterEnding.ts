// Skrytý true ending (viz zadání) — hráč musí BĚHEM JEDNÉ NOCI 10× trefit
// monstrum brokovnicí a pokaždé se s tím bezpečně vrátit do kanceláře (viz
// EmergencyMiniGameResult.monsterHit, game/minigame/logic.ts#createReturnedResult).
// Samotný zásah v minihře nic nepotvrzuje — potvrzení (a tedy i případné
// spuštění endingu) žije výhradně tady, volané z gameReducer.ts#CONFIRM_MONSTER_HIT.

/** Kolik potvrzených zásahů za JEDNU noc je potřeba pro true ending — jediné místo, které tohle číslo definuje. */
export const MONSTER_TRUE_ENDING_REQUIRED_HITS = 10;

export interface ConfirmMonsterHitResult {
  monsterHitsToday: number;
  monsterDefeated: boolean;
}

/**
 * Potvrdí jeden zásah — čistá funkce, žádná mutace. Volá se jen po
 * bezpečném návratu do kanceláře (viz gameReducer.ts CONFIRM_MONSTER_HIT),
 * nikdy při samotném výstřelu/zásahu v minihře. `monsterDefeated` se stane
 * `true` přesně na 10. potvrzeném zásahu, ne dřív.
 */
export function confirmMonsterHit(monsterHitsToday: number): ConfirmMonsterHitResult {
  const nextHits = monsterHitsToday + 1;
  return { monsterHitsToday: nextHits, monsterDefeated: nextHits >= MONSTER_TRUE_ENDING_REQUIRED_HITS };
}
