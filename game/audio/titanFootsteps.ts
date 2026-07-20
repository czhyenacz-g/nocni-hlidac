import { EnemyStage } from "../core/types";

// Čisté rozhodovací funkce pro Titanovy kroky/stres (viz zadání "Titan nemá
// během přibližování správné kroky a stres") — žádné React/audioManager
// volání tady (stejný "testuj čistou logiku, ne hook" vzor jako
// game/audio/heartbeatStress.ts). Volající (app/play/page.tsx pro kroky,
// game/audio/useHeartbeatStress.ts pro stres) je zavolá s aktuálním
// `state.enemyStage` a použijí výsledek přes audioManager.

/**
 * Poměr (0..1) vůči cílové/konfigurační hlasitosti `AUDIO_EVENTS.titanFootsteps`
 * (viz zadání "50 % na začátku, plynule až 100 % u dveří"). Klíčováno podle
 * SKUTEČNÉ Titanovy stage, ne podle vzdálenosti v metrech — jednoduchá
 * mapa, žádný nový obecný "proximity" systém (ten dnes nikde jinde
 * neexistuje jako sdílená funkce, viz atmosphereState.ts vlastní nezávislá
 * tabulka pro tension, záměrně beze změny/bez sdílení tady).
 */
const FOOTSTEP_VOLUME_RATIO_BY_STAGE: Partial<Record<EnemyStage, number>> = {
  outside: 0.5,
  outer_yard: 0.6,
  left_hallway: 0.7,
  door_hallway: 0.85,
  at_door: 1,
  breach: 1,
};

/** Fallback pro stage mimo mapu výše (attack/graveyard — encounter už stejně končí/skončil) — nejvyšší hlasitost, ne tichý skok. */
const DEFAULT_FOOTSTEP_VOLUME_RATIO = 1;

export function computeTitanFootstepVolumeRatio(stage: EnemyStage): number {
  return FOOTSTEP_VOLUME_RATIO_BY_STAGE[stage] ?? DEFAULT_FOOTSTEP_VOLUME_RATIO;
}

/** `baseVolume` je `AUDIO_CONFIG[AUDIO_EVENTS.titanFootsteps].volume` (cílová/100% hlasitost) — volající si ho předá, tenhle soubor `audioConfig.ts` neimportuje. */
export function computeTitanFootstepVolume(stage: EnemyStage, baseVolume: number): number {
  return computeTitanFootstepVolumeRatio(stage) * baseVolume;
}

/**
 * Minimální "podlaha" stresu (0-100 bodů, STEJNÁ škála jako
 * game/audio/heartbeatStress.ts#computeHeartbeatTargetStress) po dobu
 * aktivního Titanova encounteru (viz zadání "okamžitě vzrůst tep... alespoň
 * o 30 %... u dveří výrazně vyšší"). Volající (useHeartbeatStress.ts)
 * aplikuje přes `Math.max(existingTargetStress, floor)` — NIKDY sčítáním,
 * ať nedojde k dvojímu započtení, když je zrovna aktivní i kamerou-vázaný
 * "location stress" (viz zadání "Math.max(currentStress, 0.3)" princip,
 * jen na 0-100 škále místo 0-1).
 */
const STRESS_FLOOR_BY_STAGE: Partial<Record<EnemyStage, number>> = {
  outside: 30,
  outer_yard: 38,
  left_hallway: 50,
  door_hallway: 65,
  at_door: 90,
  breach: 90,
};

/** Fallback pro stage mimo mapu výše (attack/graveyard) — nejvyšší podlaha, ne pád na 0. */
const DEFAULT_STRESS_FLOOR = 90;

export function computeTitanStressFloor(stage: EnemyStage): number {
  return STRESS_FLOOR_BY_STAGE[stage] ?? DEFAULT_STRESS_FLOOR;
}
