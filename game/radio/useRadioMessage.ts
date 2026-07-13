"use client";

import { useEffect, useRef, useState } from "react";
import { EnemyStage } from "../core/types";
import { buildNightReleaseMessage } from "./buildNightReleaseMessage";
import { advanceRadioTriggerTracker, createInitialRadioTriggerTracker, RadioTriggerTrackerState } from "./radioTrigger";
import { resolveRadioFallbackDurationMs, speakRadioMessage } from "./speakRadioMessage";
import { RadioMessageState } from "./radioTypes";

/**
 * Jediné místo, kde se rádiová zpráva skládá dohromady — detekce přechodu
 * (radioTrigger.ts), text (buildNightReleaseMessage.ts) a přehrání
 * (speakRadioMessage.ts). Hlavní herní komponenta (RadioMessageOverlay.tsx →
 * GameScreen.tsx) o žádném z těchhle detailů neví, jen předá `monsterStage`/
 * `nightNumber` a dostane zpátky `{ visible, text }` (viz zadání "hlavní
 * soubor nesmí obsahovat text zprávy, timer logiku ani speechSynthesis").
 *
 * `trackerRef` je `useRef`, ne `useState` — jeho aktualizace sama o sobě
 * nesmí vyvolat re-render (jen `setState` níže, když se má overlay skutečně
 * zobrazit/schovat). Díky ref-based trackeru je i opakované volání efektu se
 * stejným (`monsterStage`, `nightNumber`) párem neškodné/idempotentní (viz
 * radioTrigger.ts komentář) — proto React Strict Mode dvojité spuštění
 * efektu nezpůsobí dvojí přehrání.
 */
export function useRadioMessage(monsterStage: EnemyStage, nightNumber: number): RadioMessageState {
  const trackerRef = useRef<RadioTriggerTrackerState>(createInitialRadioTriggerTracker(nightNumber));
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    const { next, shouldTrigger } = advanceRadioTriggerTracker(trackerRef.current, nightNumber, monsterStage);
    trackerRef.current = next;
    if (!shouldTrigger) return;

    const text = buildNightReleaseMessage(nightNumber);
    setState({ visible: true, text });

    let cancelled = false;
    function hide() {
      if (cancelled) return;
      setState({ visible: false, text: null });
    }

    const { supported, cancel } = speakRadioMessage(text, hide);
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (!supported) {
      // Bez speechSynthesis (nedostupné/chyba) se text jen zobrazí a po
      // odhadnuté době sám zmizí (viz zadání "3-4 sekundy").
      fallbackTimer = setTimeout(hide, resolveRadioFallbackDurationMs(text));
    }

    // Úklid (viz zadání "při unmountu zrušit aktivní řeč i timery") — volá
    // se i PŘED spuštěním efektu pro další změnu monsterStage/nightNumber,
    // takže případná ještě běžící předchozí zpráva/timer nikdy nepřežije do
    // dalšího triggeru.
    return () => {
      cancelled = true;
      cancel();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [monsterStage, nightNumber]);

  return state;
}
