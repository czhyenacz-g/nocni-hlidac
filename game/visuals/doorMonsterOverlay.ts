// Čistá rozhodovací funkce pro "obrázek monstra u OTEVŘENÝCH dveří" (viz
// zadání "Nové obrázky pro stav at_door") — vyňato z DoorView.tsx, ať jde
// nezávisle otestovat bez potřeby React Testing Library (stejný "žádná
// komponenta nepočítá odvozený stav sama" vzor jako game/core/cameraFocus.ts,
// game/visuals/blackoutPhase.ts, viz CLAUDE.md). Volající (DoorView.tsx) tenhle
// výsledek konzultuje AŽ POTÉ, co vyloučil vyšší prioritu (doorDeathReveal,
// titanOverloadDeathReveal, doorDestroyed, probíhající generátorové
// přetížení) — tahle funkce proto o těch stavech vůbec neví, jen o čtyřech
// vstupech níže.

export type DoorMonsterOverlay = "imp_at_door" | "titan_at_door" | "titan_breach" | null;

export interface ResolveDoorMonsterOverlayInput {
  /** `state.doorClosed` — at_door obrázky (Imp i Titan) platí VÝHRADNĚ při otevřených dveřích, viz zadání. */
  doorClosed: boolean;
  /** Non-Titan monstrum (dnes Imp) je fyzicky u dveří (`enemyStage === "at_door"`). */
  isImpAtDoor: boolean;
  /** Titan je fyzicky u dveří (`enemyStage === "at_door"`). */
  isTitanAtDoor: boolean;
  /** Titan prorazil dveře (`enemyStage === "breach"`) — BEZ podmínky na `doorClosed` (viz zadání "breach obrázky zůstávají beze změny"). */
  isTitanBreach: boolean;
}

/**
 * Priorita: `isTitanBreach` (beze změny, nezávisí na dveřích) > Titan
 * `at_door` s otevřenými dveřmi > Imp (nebo jiné non-Titan monstrum)
 * `at_door` s otevřenými dveřmi > `null` (žádný overlay — zavřené dveře,
 * jiná stage, nebo mimo `at_door`/`breach`). `isImpAtDoor`/`isTitanAtDoor`
 * se vzájemně vylučují už na volajícím (GameScreen.tsx počítá podle
 * `night.enemy.id`), ale pořadí tady je bezpečné i kdyby se to změnilo.
 */
export function resolveDoorMonsterOverlay(input: ResolveDoorMonsterOverlayInput): DoorMonsterOverlay {
  if (input.isTitanBreach) return "titan_breach";
  if (input.isTitanAtDoor && !input.doorClosed) return "titan_at_door";
  if (input.isImpAtDoor && !input.doorClosed) return "imp_at_door";
  return null;
}
