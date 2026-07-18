import { EnemyStage } from "../core/types";

// První (a zatím jediná) rádiová zpráva ve hře (viz zadání "první jednoduchá
// rádiová zpráva") — spouští se, jakmile monstrum poprvé tuhle noc vstoupí do
// venkovní lokace (`outer_yard`, viz game/core/types.ts#EnemyStage,
// game/enemies/imp.ts routeVariants — druhá stage na obou trasách,
// hned po "outside"). Žádný obecný systém triggerů/fronty/priorit — to je
// záměrně mimo rozsah první verze.
export const RADIO_TRIGGER_STAGE: EnemyStage = "outer_yard";

/** Vrací useRadioMessage.ts — RadioMessageOverlay.tsx podle toho jen vykreslí, nebo nevykreslí přehrávaný text. */
export interface RadioMessageState {
  visible: boolean;
  text: string | null;
}
