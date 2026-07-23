"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "../audio/audioManager";
import { pickRandomTitanEscapeMessage, resolveTitanEscapeOverlayDurationMs } from "./titanEscapeMessages";
import { RadioMessageState } from "./radioTypes";
import { useCopy } from "@/game/i18n/useTranslation";

/**
 * Titanovo zahájení útěku (viz zadání "nová nahrávka... pět hlášek...
 * náhodně vyber právě jednu... přehraje se při zahájení útěku / encounteru,
 * ne až při příchodu ke dveřím") — NAHRAZUJE dřívější
 * useTitanEncounterMessage.ts (odstraněný, viz git historie — dlouhá
 * vícekroková tutorialová/kontextová vrstva byla na výslovnou žádost
 * zrušena a nahrazena tímhle jednoduchým jednorázovým hookem).
 *
 * `active` je `isTitanEncounterActive(state, night)` (game/core/titanEncounter.ts)
 * — na Titanově noci je `true` UŽ OD VŮBEC PRVNÍHO renderu (žádná
 * "false -> true" hrana ke sledování, na rozdíl od ostatních rádiových
 * hooků), takže stačí prostý `startedRef` flag: "první renderovaný tik
 * tuhle noc, kdy je Titan aktivní, spustí PRÁVĚ JEDNU náhodnou variantu,
 * cokoliv potom (změna stage, rerender, i React Strict Mode dvojité
 * spuštění efektu se STEJNÝM ref objektem) už žádnou další nespustí." Nová
 * noc (retry) = nový mount `GameScreen`/`RadioMessageOverlay` (mountuje se
 * jen na `state.screen === "playing"`, viz useRadioMessage.ts komentář) =
 * čerstvý `startedRef`, takže smí padnout jiná náhodná varianta (viz
 * zadání "při restartu celé noci se může vybrat nová náhodná varianta").
 */
export function useTitanEscapeMessage(active: boolean): RadioMessageState {
  const copy = useCopy();
  const startedRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    // Prázdný pool (teoreticky) — tiše nic nepřehraj/nezobraz, ne pád (viz
    // zadání "6. Chybové stavy... hra nesmí spadnout, encounter musí
    // pokračovat").
    const message = pickRandomTitanEscapeMessage();
    if (!message) return;

    audioManager.play(message.id);
    const text = copy.radio.titanEscapeMessages[message.id as keyof typeof copy.radio.titanEscapeMessages];
    setState({ visible: true, text });

    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;
      setState({ visible: false, text: null });
    }, resolveTitanEscapeOverlayDurationMs(message.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Úklid při unmountu (viz zadání "Zruš všechny Titanovy timeouty a
  // intervaly při... unmountu komponenty") — samostatný efekt, ať se spustí
  // přesně jednou při unmountu, ne po každé změně `active`.
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== null) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return state;
}
