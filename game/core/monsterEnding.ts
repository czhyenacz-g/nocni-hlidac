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
 * Potvrdí `hitCount` zásahů najednou — čistá funkce, žádná mutace. Volá se
 * jen po bezpečném návratu do kanceláře (viz gameReducer.ts
 * CONFIRM_MONSTER_HIT, `state.pendingMonsterHits`), nikdy při samotném
 * výstřelu/zásahu v minihře. `hitCount` > 1 je připravené pro dvouhlavňovku
 * (až 2 zásahy za jednu výpravu, viz GameState.pendingMonsterHits) — MVP
 * v praxi zatím vždy posílá 0 nebo 1 (viz TODO u EmergencyMiniGame.tsx
 * `monsterHitThisRun`). `monsterDefeated` se stane `true`, jakmile
 * kumulativní počet dosáhne/přesáhne `MONSTER_TRUE_ENDING_REQUIRED_HITS` —
 * i kdyby `hitCount` sám o sobě práh překročil (např. 8 + 2 z dvouhlavňovky).
 */
export function confirmMonsterHit(monsterHitsToday: number, hitCount: number): ConfirmMonsterHitResult {
  const nextHits = monsterHitsToday + hitCount;
  return { monsterHitsToday: nextHits, monsterDefeated: nextHits >= MONSTER_TRUE_ENDING_REQUIRED_HITS };
}
