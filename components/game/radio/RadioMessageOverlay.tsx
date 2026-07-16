"use client";

import { EnemyStage, MonsterRepelRadioResult } from "@/game/core/types";
import { useRadioMessage } from "@/game/radio/useRadioMessage";
import { useMonsterRepelRadioMessage } from "@/game/radio/useMonsterRepelRadioMessage";
import { useCameraDisabledRadioMessage } from "@/game/radio/useCameraDisabledRadioMessage";
import { useGhoulCameraAttackWarningMessage } from "@/game/radio/useGhoulCameraAttackWarningMessage";
import RadioWaveform from "./RadioWaveform";

interface RadioMessageOverlayProps {
  /** Aktuální stage monstra (viz GameState.enemyStage) — jediné, co komponenta o herním stavu potřebuje ví, zbytek (detekce přechodu/text/přehrání) řeší useRadioMessage.ts. */
  monsterStage: EnemyStage;
  nightNumber: number;
  /** Viz GameState.sonicCannonResultSeq/lastSonicCannonResult — druhý, nezávislý zdroj rádiové zprávy (viz useMonsterRepelRadioMessage.ts). */
  sonicCannonResultSeq: number;
  lastSonicCannonResult: MonsterRepelRadioResult | null;
  /** Viz GameState.cameraOfflineSeq — třetí, nezávislý zdroj rádiové zprávy (viz useCameraDisabledRadioMessage.ts). */
  cameraOfflineSeq: number;
  /** Viz GameState.cameraAttackStartedSeq — čtvrtý, nezávislý zdroj rádiové zprávy, VAROVÁNÍ před samotným útokem (viz useGhoulCameraAttackWarningMessage.ts). */
  cameraAttackStartedSeq: number;
}

/**
 * Pasivní informační vrstva (viz zadání "rádio je pouze pasivní informační
 * vrstva") — vlevo nahoře, `absolute` (NE `fixed`: `app/play/page.tsx` obaluje
 * hru do `.atmosphere-root` s CSS `filter`, což by fixed potomka odtrhlo od
 * viewportu, stejný důvod jako u CinematicScreen.tsx/LeftWallView.tsx).
 * Vyžaduje `position: relative` na rodiči — GameScreen.tsx `<main>` už ho má.
 * `pointer-events-none` na celém bloku (viz zadání), ať nikdy neblokuje
 * klikání na herní prvky pod/kolem sebe.
 *
 * Kombinuje ČTYŘI nezávislé zdroje zprávy (viz zadání "použij existující
 * rádiový informační blok, pokud už existuje... rozšiř ho minimálně") —
 * "vypuštění monstra" (useRadioMessage, trigger = první vstup do outer_yard),
 * "reakce na sonické dělo" (useMonsterRepelRadioMessage, trigger =
 * sonicCannonResultSeq), "Ghoul vyřadil kameru" (useCameraDisabledRadioMessage,
 * trigger = cameraOfflineSeq) a "Ghoul útočí na kameru" — VAROVÁNÍ PŘED
 * útokem (useGhoulCameraAttackWarningMessage, trigger = cameraAttackStartedSeq)
 * — a vykresluje, který je zrovna `visible`. Útočné varování má nejvyšší
 * prioritu (může nastat PŘESNĚ ve stejném tiku jako sonic-cannon reakce,
 * viz gameReducer.ts#attemptGhoulCameraAttack, a je narativně
 * naléhavější), pak kamera-offline (nejvzácnější/narativně nejvýznamnější
 * z klidových zpráv), pak sonic-cannon reakce, pak vypuštění monstra. V
 * praxi ke skutečnému souběhu kamera-offline a sonic-cannon/útočné zprávy
 * nedochází — obě zmizí do ~2.5s, zatímco cameraOfflineSeq se zvýší až PO
 * celém pětisekundovém přechodu (viz zadání), takže první už dávno skončila.
 */
export default function RadioMessageOverlay({
  monsterStage,
  nightNumber,
  sonicCannonResultSeq,
  lastSonicCannonResult,
  cameraOfflineSeq,
  cameraAttackStartedSeq,
}: RadioMessageOverlayProps) {
  const releaseMessage = useRadioMessage(monsterStage, nightNumber);
  const repelMessage = useMonsterRepelRadioMessage(sonicCannonResultSeq, lastSonicCannonResult);
  const cameraDisabledMessage = useCameraDisabledRadioMessage(cameraOfflineSeq);
  const attackWarningMessage = useGhoulCameraAttackWarningMessage(cameraAttackStartedSeq);
  const { visible, text } = attackWarningMessage.visible
    ? attackWarningMessage
    : cameraDisabledMessage.visible
      ? cameraDisabledMessage
      : repelMessage.visible
        ? repelMessage
        : releaseMessage;

  if (!visible || !text) return null;

  return (
    <div
      className="absolute top-4 left-4 z-40 pixel-panel pixel-screen-static px-3 py-2 max-w-[16rem] pointer-events-none"
      aria-hidden="true"
    >
      <div className="text-[10px] font-bold tracking-wide text-amber-400 animate-pulse mb-1">ZACHYCENÝ PŘENOS</div>
      <RadioWaveform />
      <div className="text-xs text-gray-200 mt-1">{text}</div>
    </div>
  );
}
