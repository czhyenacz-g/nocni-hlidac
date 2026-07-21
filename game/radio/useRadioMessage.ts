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
 *
 * `hideTimeoutRef` (NE `useEffect`-return cleanup) drží schovávací timeout
 * — `monsterStage` se mění mnohem častěji než trigger samotný (monstrum
 * postupuje po trase každých pár sekund, viz `night.enemyTickMs`), takže
 * efekt níže běží znovu i dávno po spuštění zprávy. Kdyby timeout žil jen v
 * `useEffect`-return cleanup, KAŽDÝ další běh efektu (i ten, co skončí hned
 * na `!shouldTrigger`) by ho zrušil, aniž by ho něco nahradilo — zpráva by
 * zůstala "Přenos probíhá…" navždy zaseknutá (reprodukovaný bug, viz git
 * historie). Ref přežívá mezi jednotlivými voláními efektu beze změny, takže
 * se timeout zruší/přenastaví JEN když se skutečně přehrává NOVÁ zpráva, ne
 * při každé nesouvisející změně stage. Stejný vzor je nutný pro JAKOUKOLIV
 * budoucí rádiovou zprávu, jejíž trigger bude přímo záviset na `monsterStage`
 * (na rozdíl od `useMonsterRepelRadioMessage.ts`/`useCameraDisabledRadioMessage.ts`/
 * `useGhoulCameraAttackWarningMessage.ts`, které místo toho sledují
 * nízkofrekvenční `...Seq` čítač měnící se jen při skutečné události, takže
 * tenhle konkrétní bug samy o sobě nemají).
 *
 * `enabled` (výchozí `true`, beze změny pro Impa) — `false` na Titanově noci
 * A na nocích 1-4 (viz RadioMessageOverlay.tsx#RELEASE_MONSTER_MESSAGE_MIN_NIGHT,
 * game/core/titanEncounter.ts) — Impovo "vypuštění monstra" hlášení je
 * monstrum-agnostické (triggeruje se na KTEROUKOLIV `enemyStage ===
 * "outer_yard"`, ne jen Impovo), takže by se bez tohohle guardu přehrálo
 * špatné (Impovo) rádiové hlášení i na Titanovu noc, přes/místo Titanovy
 * vlastní jednorázové "escape" hlášky (viz game/radio/useTitanEscapeMessage.ts),
 * a taky příliš brzy (noci 1-4, viz zadání "nepřehrávej je noci 1-4").
 * Tracker se pořád aktualizuje i když `enabled` je `false` (ať
 * `previousStage` zůstane v souladu), jen se nikdy nespustí samotné
 * přehrání/zobrazení.
 */
export function useRadioMessage(monsterStage: EnemyStage, nightNumber: number, enabled: boolean = true): RadioMessageState {
  const trackerRef = useRef<RadioTriggerTrackerState>(createInitialRadioTriggerTracker(nightNumber));
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    const { next, shouldTrigger } = advanceRadioTriggerTracker(trackerRef.current, nightNumber, monsterStage);
    trackerRef.current = next;
    if (!shouldTrigger || !enabled) return;

    // Prázdný pool (teoreticky, viz pickRandomReleaseMonsterMessage) —
    // tiše nic nepřehraj/nezobraz, ne pád. Netriggeruje se tak `next`
    // znovu (triggeredThisNight je už `true`), takže se to nezkusí znovu
    // dokola tuhle noc.
    const message = pickRandomReleaseMonsterMessage();
    if (!message) return;

    audioManager.play(message.id);
    setState({ visible: true, text: TRANSMISSION_STATUS_LABEL });

    // Zvuk samotný se nezastavuje (audioManager.play je fire-and-forget,
    // krátký jednorázový klip — na rozdíl od dřívějšího speechSynthesis
    // tady není co "rušit uprostřed věty"), jen vizuální overlay.
    if (hideTimeoutRef.current !== null) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;
      setState({ visible: false, text: null });
    }, resolveReleaseMonsterOverlayDurationMs(message.id));
  }, [monsterStage, nightNumber, enabled]);

  // Úklid při unmountu (viz zadání "při unmountu zrušit aktivní timery") —
  // samostatný efekt s prázdným dependency polem, ať se spustí přesně
  // jednou při unmountu, ne po každé změně monsterStage/nightNumber.
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== null) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return state;
}
