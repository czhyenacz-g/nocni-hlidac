import { GameState, NightDefinition } from "./types";

/**
 * Jestli je sonické dělo FYZICKY zapnuté a běží (spotřebovává energii,
 * modrý filtr je vidět) — bez ohledu na to, jestli zrovna míří na kameru, na
 * které se monstrum skutečně nachází (viz zadání "Pokud hráč zapne dělo na
 * prázdné kameře: energie se spotřebovává... monstrum se nijak neovlivní").
 * Používá `game/core/powerDrain.ts` pro drain a `gameReducer.ts` pro
 * ovládací akci samotnou (TOGGLE_SONIC_CANNON/auto-off).
 */
export function isSonicCannonRunning(state: GameState): boolean {
  return state.sonicCannonActive && state.playerView === "desk" && state.cameraOpen;
}

/**
 * Jestli sonické dělo TENHLE tik skutečně ovlivní monstrum — navíc k
 * `isSonicCannonRunning` musí aktuálně vybraná kamera odpovídat lokaci, ve
 * které se monstrum doopravdy nachází (stejná podmínka jako dřívější
 * `isEnemyBeingWatched` v gameReducer.ts, teď navíc podmíněná
 * `sonicCannonActive`). Používá `gameReducer.ts#ENEMY_ADVANCE`, ať ví, jestli
 * pro tenhle hod nahradit `night.enemy.advanceChance`/`retreatChance` za
 * `SONIC_CANNON_*_CHANCE` (viz balancing/constants.ts) a jestli po hodu emitovat
 * rádiový výsledek (viz GameState.sonicCannonResultSeq).
 */
export function isSonicCannonAffectingEnemy(state: GameState, night: NightDefinition): boolean {
  if (!isSonicCannonRunning(state) || !state.activeCameraId) return false;
  const camera = night.cameras.find((c) => c.id === state.activeCameraId);
  return camera?.enemyVisibleAtStage === state.enemyStage;
}

/**
 * Čisté rozhodnutí "má se tenhle render přehrát mechanické cvaknutí
 * sonického děla" (viz zadání "doladit... jasná zvuková odezva", app/play/page.tsx
 * efekt na `state.sonicCannonToggleSeq`) — vytažené sem, ať jde otestovat bez
 * React efektu. `currentSeq === 0` je vždy `false` (čerstvý/resetovaný stav
 * — nová směna, smrt, menu, viz `createInitialGameState` — NIKDY nemá znít
 * cvaknutí, i kdyby `previousSeq` byl nenulový z předchozí směny). Jinak
 * `true` právě tehdy, když se `currentSeq` od `previousSeq` skutečně liší
 * (ruční zapnutí/vypnutí i automatické vypnutí po výsledku všechny seq
 * zvyšují stejně — volající nemusí/nemá rozlišovat důvod, zvuk je stejný).
 */
export function shouldPlaySonicCannonToggleClick(currentSeq: number, previousSeq: number): boolean {
  if (currentSeq === 0) return false;
  return currentSeq !== previousSeq;
}
