"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "../audio/audioManager";
import { pickRandomCameraDisabledMessage, resolveCameraDisabledOverlayDurationMs } from "./cameraDisabledRadioMessage";
import { RadioMessageState } from "./radioTypes";
import { useCopy } from "@/game/i18n/useTranslation";

/**
 * Třetí, NEZÁVISLÉ "assembly místo" rádiové zprávy (viz useRadioMessage.ts
 * pro "vypuštění monstra", useMonsterRepelRadioMessage.ts pro reakci na
 * sonické dělo) — sleduje `GameState.cameraOfflineSeq`, který se zvyšuje
 * PŘESNĚ jednou, když se pětisekundový přechod poškození kamery dokončí
 * (viz gameReducer.ts#updateCameraDamagePhase) — NIKDY při začátku
 * ztmavování (viz zadání "zpráva se nesmí spustit už při začátku").
 *
 * Náhodně vybere jednu ze tří skutečně namluvených variant
 * (cameraDisabledRadioMessage.ts) a přehraje ji přes `audioManager` —
 * stejný vzor jako useMonsterRepelRadioMessage.ts/useRadioMessage.ts, žádné
 * `new Audio()` přímo tady. Overlay text odpovídá PŘESNĚ té variantě, která
 * se zrovna přehrává (na rozdíl od repel/release hlášek, kde je text jen
 * obecný status — tady máme ověřený přesný přepis, viz
 * cameraDisabledRadioMessage.ts).
 */
export function useCameraDisabledRadioMessage(cameraOfflineSeq: number): RadioMessageState {
  const copy = useCopy();
  const prevSeqRef = useRef(cameraOfflineSeq);
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    if (prevSeqRef.current === cameraOfflineSeq) return;
    prevSeqRef.current = cameraOfflineSeq;

    const message = pickRandomCameraDisabledMessage();
    if (!message) return;

    audioManager.play(message.id);
    const text = copy.radio.cameraDisabledMessages[message.id as keyof typeof copy.radio.cameraDisabledMessages];
    setState({ visible: true, text });

    const timeout = setTimeout(() => setState({ visible: false, text: null }), resolveCameraDisabledOverlayDurationMs(message.id));
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOfflineSeq]);

  return state;
}
