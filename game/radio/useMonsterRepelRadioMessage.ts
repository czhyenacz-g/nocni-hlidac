"use client";

import { useEffect, useRef, useState } from "react";
import { MonsterRepelRadioResult } from "../core/types";
import { audioManager } from "../audio/audioManager";
import { pickRandomMonsterRepelMessage, resolveMonsterRepelOverlayDurationMs } from "./monsterRepelRadioMessages";
import { RadioMessageState } from "./radioTypes";

/**
 * Text pod "ZACHYCENÝ PŘENOS" hlavičkou pro sonic-cannon reakci (viz zadání
 * "Text pro výsledek má být pouze: success `...!`, stay `...?`, fail
 * `...!!!`" — žádné "Úspěch"/"Selhání"/procenta).
 */
function resolveResultLabel(result: MonsterRepelRadioResult): string {
  switch (result) {
    case "success":
      return "...!";
    case "stay":
      return "...?";
    case "fail":
      return "...!!!";
  }
}

/**
 * Druhé, NEZÁVISLÉ "assembly místo" rádiové zprávy (viz useRadioMessage.ts
 * pro tu první, "vypuštění monstra") — sleduje `GameState.sonicCannonResultSeq`
 * (ne `monsterStage`/přechod do lokace jako useRadioMessage.ts), protože jde
 * o jinou událost s jiným triggerem (viz zadání "reducer má pouze emitovat
 * výsledek success/stay/fail"). `RadioMessageOverlay.tsx` obě volá a
 * zobrazuje, cokoliv je zrovna `visible` (viz komentář tam).
 *
 * `resultSeq` se mění PŘESNĚ tehdy, když gameReducer.ts#ENEMY_ADVANCE
 * použil `SONIC_CANNON_*_CHANCE` pro tenhle hod (viz
 * game/core/sonicCannon.ts#isSonicCannonAffectingEnemy) — běžný hod bez
 * sonického děla, hod zablokovaný minimálním pobytem, ani žádný explicitní
 * repel/gave_up/brokovnice tenhle seq nikdy nezvýší.
 */
export function useMonsterRepelRadioMessage(
  resultSeq: number,
  lastResult: MonsterRepelRadioResult | null,
): RadioMessageState {
  const prevSeqRef = useRef(resultSeq);
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    if (prevSeqRef.current === resultSeq) return;
    prevSeqRef.current = resultSeq;
    if (lastResult === null) return;

    const message = pickRandomMonsterRepelMessage(lastResult);
    if (!message) return;

    audioManager.play(message.id);
    setState({ visible: true, text: resolveResultLabel(lastResult) });

    const timeout = setTimeout(() => setState({ visible: false, text: null }), resolveMonsterRepelOverlayDurationMs(message.id));
    return () => clearTimeout(timeout);
  }, [resultSeq, lastResult]);

  return state;
}
