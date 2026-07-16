"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "../audio/audioManager";
import {
  GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS,
  GHOUL_CAMERA_ATTACK_WARNING_TEXT,
  pickRandomGhoulCameraAttackWarningSound,
} from "./ghoulCameraAttackWarningMessage";
import { RadioMessageState } from "./radioTypes";

/**
 * Čtvrté, NEZÁVISLÉ "assembly místo" rádiové zprávy (viz useRadioMessage.ts/
 * useMonsterRepelRadioMessage.ts/useCameraDisabledRadioMessage.ts pro
 * ostatní tři) — sleduje `GameState.cameraAttackStartedSeq`, který se
 * zvyšuje PŘESNĚ jednou při ZAČÁTKU útoku Ghoula na kameru (viz
 * gameReducer.ts#attemptGhoulCameraAttack), tedy dřív, než
 * `cameraOfflineSeq` (dokončení o ~5s později). Text je pevný (viz
 * ghoulCameraAttackWarningMessage.ts), náhodně vybraný řev (ghoul_appear_0/1)
 * hraje SOUČASNĚ s `AUDIO_EVENTS.cameraDamageStart` (elektronický zvuk
 * poškození, viz app/play/page.tsx) — dvě nezávislé vrstvy, stejný "výběr v
 * místě audio side-effectu" vzor jako ostatní radio hooks.
 */
export function useGhoulCameraAttackWarningMessage(cameraAttackStartedSeq: number): RadioMessageState {
  const prevSeqRef = useRef(cameraAttackStartedSeq);
  const [state, setState] = useState<RadioMessageState>({ visible: false, text: null });

  useEffect(() => {
    if (prevSeqRef.current === cameraAttackStartedSeq) return;
    prevSeqRef.current = cameraAttackStartedSeq;

    const sound = pickRandomGhoulCameraAttackWarningSound();
    if (sound) audioManager.play(sound);

    setState({ visible: true, text: GHOUL_CAMERA_ATTACK_WARNING_TEXT });

    const timeout = setTimeout(() => setState({ visible: false, text: null }), GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [cameraAttackStartedSeq]);

  return state;
}
