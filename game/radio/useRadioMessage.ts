"use client";

import { useEffect, useRef, useState } from "react";
import { EnemyStage } from "../core/types";
import { audioManager } from "../audio/audioManager";
import { advanceRadioTriggerTracker, createInitialRadioTriggerTracker, RadioTriggerTrackerState } from "./radioTrigger";
import { pickRandomReleaseMonsterMessage, resolveReleaseMonsterOverlayDurationMs } from "./releaseMonsterMessages";
import { RadioMessageState } from "./radioTypes";

/**
 * Krátký stavový text pod "ZACHYCENÝ PŘENOS" hlavičkou (viz
 * RadioMessageOverlay.tsx) — NE doslovný přepis namluvené hlášky. Namluvené
 * varianty (viz releaseMonsterMessages.ts) nemají spolehlivě ověřený
 * přesný text (viz zadání "nepřepisuj obsah hlášek podle domněnky"), takže
 * overlay ukazuje jen obecný status po dobu přehrávání, ne konkrétní větu.
 */
const TRANSMISSION_STATUS_LABEL = "Přenos probíhá…";

/**
 * Jediné místo, kde se rádiová zpráva "vypuštění monstra" skládá dohromady —
 * detekce přechodu (radioTrigger.ts, BEZE ZMĚNY, znovupoužitá) + náhodný
 * výběr namluvené varianty a její přehrání (releaseMonsterMessages.ts,
 * audioManager.ts). Hlavní herní komponenta (RadioMessageOverlay.tsx →
 * GameScreen.tsx) o žádném z těchhle detailů neví, jen předá `monsterStage`/
 * `nightNumber` a dostane zpátky `{ visible, text }`.
 *
 * Dřívější verze (viz git historie) hrála zprávu přes browser
 * `speechSynthesis` (buildNightReleaseMessage.ts/speakRadioMessage.ts) —
 * ZÁMĚRNĚ ponechané nedotčené a nepoužívané (ne smazané), ne přepojené sem.
 * Tahle verze přehrává skutečné namluvené soubory (viz zadání "první
 * jednoduchá verze rádia"), TTS cesta zůstává jako budoucí referenční kód.
 *
 * `trackerRef` je `useRef`, ne `useState` — jeho aktualizace sama o sobě
 * nesmí vyvolat re-render (jen `setState` níže, když se má overlay skutečně
 * zobrazit/schovat). Díky ref-based trackeru je i opakované volání efektu se
 * stejným (`monsterStage`, `nightNumber`) párem neškodné/idempotentní (viz
 * radioTrigger.ts komentář) — proto React Strict Mode dvojité spuštění
 * efektu nezpůsobí dvojí přehrání. `GameScreen`/`RadioMessageOverlay` se
 * navíc mountuje AŽ na `state.screen === "playing"` (viz app/play/page.tsx)
 * a unmountuje na smrt/výhru, takže `trackerRef` dostane čerstvý start i po
 * restartu STEJNÉ noci (nový pokus), ne jen při změně čísla noci.
 */
export function useRadioMessage(monsterStage: EnemyStage, nightNumber: number): RadioMessageState {
  const trackerRef = useRef<RadioTriggerTrackerState>(createInitialRadioTriggerTracker(nightNumber));
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    const { next, shouldTrigger } = advanceRadioTriggerTracker(trackerRef.current, nightNumber, monsterStage);
    trackerRef.current = next;
    if (!shouldTrigger) return;

    // Prázdný pool (teoreticky, viz pickRandomReleaseMonsterMessage) —
    // tiše nic nepřehraj/nezobraz, ne pád. Netriggeruje se tak `next`
    // znovu (triggeredThisNight je už `true`), takže se to nezkusí znovu
    // dokola tuhle noc.
    const message = pickRandomReleaseMonsterMessage();
    if (!message) return;

    audioManager.play(message.id);
    setState({ visible: true, text: TRANSMISSION_STATUS_LABEL });

    const timeout = setTimeout(() => setState({ visible: false, text: null }), resolveReleaseMonsterOverlayDurationMs(message.id));

    // Úklid (viz zadání "při unmountu zrušit aktivní timery") — volá se i
    // PŘED spuštěním efektu pro další změnu monsterStage/nightNumber.
    // Zvuk samotný se nezastavuje (audioManager.play je fire-and-forget,
    // krátký jednorázový klip — na rozdíl od dřívějšího speechSynthesis
    // tady není co "rušit uprostřed věty").
    return () => clearTimeout(timeout);
  }, [monsterStage, nightNumber]);

  return state;
}
