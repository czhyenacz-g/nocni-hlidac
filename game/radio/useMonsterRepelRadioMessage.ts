"use client";

import { useEffect, useRef, useState } from "react";
import { MonsterRepelRadioResult } from "../core/types";
import { audioManager } from "../audio/audioManager";
import { pickRandomMonsterRepelMessage, resolveMonsterRepelOverlayDurationMs, TITAN_NO_EFFECT_DISPLAY_MS } from "./monsterRepelRadioMessages";
import { RadioMessageState } from "./radioTypes";

/**
 * Text pod "ZACHYCENÝ PŘENOS" hlavičkou pro sonic-cannon reakci (viz zadání
 * "Text pro výsledek má být pouze: success `...!`, stay `...?`, fail
 * `...!!!`" — žádné "Úspěch"/"Selhání"/procenta). `no_effect` (Titan, viz
 * resolveTitanAdvance.ts) je jediná výjimka — zadání vyžaduje doslovný text
 * "Bez efektu", ne symbol.
 */
function resolveResultLabel(result: MonsterRepelRadioResult): string {
  switch (result) {
    case "success":
      return "...!";
    case "stay":
      return "...?";
    case "fail":
      return "...!!!";
    case "no_effect":
      return "Bez efektu";
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

    // `no_effect` (Titan) nemá žádnou nahranou variantu (viz
    // monsterRepelRadioMessages.ts#MONSTER_REPEL_RADIO_MESSAGES.no_effect —
    // prázdné pole) — `message` je pak `null`, ale text se PŘESTO má
    // zobrazit (jen bez audia), na rozdíl od dřívějšího chování, kde `null`
    // znamenalo "žádná zpráva vůbec".
    const message = pickRandomMonsterRepelMessage(lastResult);
    if (message) {
      audioManager.play(message.id);
    }
    setState({ visible: true, text: resolveResultLabel(lastResult) });

    const durationMs = message ? resolveMonsterRepelOverlayDurationMs(message.id) : TITAN_NO_EFFECT_DISPLAY_MS;
    const timeout = setTimeout(() => setState({ visible: false, text: null }), durationMs);
    return () => clearTimeout(timeout);
  }, [resultSeq, lastResult]);

  return state;
}
