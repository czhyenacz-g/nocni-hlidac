import { EnemyStage } from "../core/types";
import { RADIO_TRIGGER_STAGE } from "./radioTypes";

/**
 * Stav sledování přechodu monstra do venkovní lokace — čistý, testovatelný
 * mimo React (viz zadání "Preferuj testování čisté logiky mimo hlavní React
 * komponentu"). `useRadioMessage.ts` ho drží v `useRef` (ne `useState`,
 * ať jeho aktualizace sama nezpůsobí re-render) a při každé změně
 * `monsterStage`/`nightNumber` zavolá `advanceRadioTriggerTracker`.
 */
export interface RadioTriggerTrackerState {
  night: number;
  /** `null` = ještě nebyl zaznamenaný žádný stav (čerstvý tracker/nová noc) — viz "stabilní detekce přechodu" v zadání, nikdy netriggeruje samo o sobě. */
  previousStage: EnemyStage | null;
  triggeredThisNight: boolean;
}

export function createInitialRadioTriggerTracker(night: number): RadioTriggerTrackerState {
  return { night, previousStage: null, triggeredThisNight: false };
}

export interface AdvanceRadioTriggerResult {
  next: RadioTriggerTrackerState;
  /** `true` právě jednou za noc — přesně při přechodu Z jiné lokace DO `RADIO_TRIGGER_STAGE`. */
  shouldTrigger: boolean;
}

/**
 * Jeden krok stavového automatu, volaný při KAŽDÉ změně `monsterStage`/`night`
 * (ne jen když je aktuální stage `outer_yard`) — viz zadání "sleduj změnu
 * z jiné lokace do venkovní lokace, ne pouze `if (stage === 'outer_yard')`".
 *
 * Nová noc (`night !== state.night`) vždy resetuje `previousStage`/
 * `triggeredThisNight` — noc se nikdy nenese do další (viz zadání "po
 * spuštění nové noci se stav resetuje").
 *
 * `shouldTrigger` je `true` jen když zároveň platí:
 * - tuhle noc ještě nebylo spuštěno (`!triggeredThisNight`),
 * - aktuální stage JE `RADIO_TRIGGER_STAGE`,
 * - PŘEDCHOZÍ stage byla známá (ne `null` — první vůbec zaznamenaný stav se
 *   nikdy nebere jako "přechod", i kdyby monstrum už bylo v `outer_yard`) A
 *   byla JINÁ než `RADIO_TRIGGER_STAGE` (skutečný přechod, ne setrvání).
 *
 * Idempotentní vůči opakovanému volání se stejným (`night`, `currentStage`)
 * párem — druhé volání za sebou už žádnou změnu `previousStage` neuvidí (je
 * roven `currentStage` z prvního volání), takže `shouldTrigger` vyjde znovu
 * `false`. Díky tomu React Strict Mode (dvojité spuštění efektu v devu)
 * nikdy nezpůsobí dvojí spuštění zprávy.
 */
export function advanceRadioTriggerTracker(
  state: RadioTriggerTrackerState,
  night: number,
  currentStage: EnemyStage,
): AdvanceRadioTriggerResult {
  const base: RadioTriggerTrackerState = night !== state.night ? createInitialRadioTriggerTracker(night) : state;

  const shouldTrigger =
    !base.triggeredThisNight &&
    currentStage === RADIO_TRIGGER_STAGE &&
    base.previousStage !== null &&
    base.previousStage !== RADIO_TRIGGER_STAGE;

  const next: RadioTriggerTrackerState = {
    night,
    previousStage: currentStage,
    triggeredThisNight: base.triggeredThisNight || shouldTrigger,
  };

  return { next, shouldTrigger };
}
