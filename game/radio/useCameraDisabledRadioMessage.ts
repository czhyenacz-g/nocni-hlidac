"use client";

import { useEffect, useRef, useState } from "react";
import { CAMERA_DISABLED_OVERLAY_DURATION_MS, GHOUL_CAMERA_DISABLED_MESSAGE } from "./cameraDisabledRadioMessage";
import { RadioMessageState } from "./radioTypes";

/**
 * Třetí, NEZÁVISLÉ "assembly místo" rádiové zprávy (viz useRadioMessage.ts
 * pro "vypuštění monstra", useMonsterRepelRadioMessage.ts pro reakci na
 * sonické dělo) — sleduje `GameState.cameraOfflineSeq`, který se zvyšuje
 * PŘESNĚ jednou, když se pětisekundový přechod poškození kamery dokončí
 * (viz gameReducer.ts#updateCameraDamagePhase) — NIKDY při začátku
 * ztmavování (viz zadání "zpráva se nesmí spustit už při začátku").
 *
 * Zatím čistě textová (viz zadání "žádný browser speechSynthesis, žádné
 * externí TTS, žádný zvuk") — `GHOUL_CAMERA_DISABLED_MESSAGE.audioSrc` je
 * `null`, takže se nic nepřehrává; jakmile přibude reálný soubor (viz
 * cameraDisabledRadioMessage.ts komentář), přehrávání se doplní přes
 * `audioManager`, ne přímo tady náhradou za `new Audio()`.
 */
export function useCameraDisabledRadioMessage(cameraOfflineSeq: number): RadioMessageState {
  const prevSeqRef = useRef(cameraOfflineSeq);
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    if (prevSeqRef.current === cameraOfflineSeq) return;
    prevSeqRef.current = cameraOfflineSeq;

    setState({ visible: true, text: GHOUL_CAMERA_DISABLED_MESSAGE.text });

    const timeout = setTimeout(() => setState({ visible: false, text: null }), CAMERA_DISABLED_OVERLAY_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [cameraOfflineSeq]);

  return state;
}
