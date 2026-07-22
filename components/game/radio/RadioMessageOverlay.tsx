"use client";

import { EnemyStage, MonsterRepelRadioResult } from "@/game/core/types";
import { useRadioMessage } from "@/game/radio/useRadioMessage";
import { useMonsterRepelRadioMessage } from "@/game/radio/useMonsterRepelRadioMessage";
import { useCameraDisabledRadioMessage } from "@/game/radio/useCameraDisabledRadioMessage";
import { useGhoulCameraAttackWarningMessage } from "@/game/radio/useGhoulCameraAttackWarningMessage";
import { useTitanEscapeMessage } from "@/game/radio/useTitanEscapeMessage";
import { RELEASE_MONSTER_MESSAGE_MIN_NIGHT } from "@/game/radio/releaseMonsterMessages";
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
  /** `night.enemy.id` — jen pro `useRadioMessage`'s `enabled` gate (viz komentář tam, Titanova noc nesmí přehrát Impovo "vypuštění monstra" hlášení, má vlastní escape hlášku). */
  monsterId: string;
  /** Viz game/core/titanEncounter.ts#isTitanEncounterActive — pátý, nezávislý zdroj (Titanova jednorázová "escape" hláška, viz useTitanEscapeMessage.ts). */
  titanEncounterActive: boolean;
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
 * Kombinuje PĚT nezávislých zdrojů zprávy — Titanova jednorázová "escape"
 * hláška (useTitanEscapeMessage, nejvyšší priorita — Titanova noc jinak
 * ostatní čtyři zdroje stejně nikdy nespustí, viz níže), "útok Ghoula na
 * kameru" varování, "kamera vyřazena", "reakce na sonické dělo" a
 * "vypuštění monstra" (poslední čtyři beze změny). Titanova noc (žádné
 * abilities, žádný sonic-cannon branch v resolveTitanAdvance) tyhle čtyři
 * zbylé zdroje nikdy nespustí — Titanova vrstva má přesto formálně
 * nejvyšší prioritu pro případ budoucí změny.
 */
export default function RadioMessageOverlay({
  monsterStage,
  nightNumber,
  sonicCannonResultSeq,
  lastSonicCannonResult,
  cameraOfflineSeq,
  cameraAttackStartedSeq,
  monsterId,
  titanEncounterActive,
}: RadioMessageOverlayProps) {
  const titanMessage = useTitanEscapeMessage(titanEncounterActive);
  const releaseMessage = useRadioMessage(
    monsterStage,
    nightNumber,
    monsterId !== "titan" && nightNumber >= RELEASE_MONSTER_MESSAGE_MIN_NIGHT,
  );
  const repelMessage = useMonsterRepelRadioMessage(sonicCannonResultSeq, lastSonicCannonResult);
  const cameraDisabledMessage = useCameraDisabledRadioMessage(cameraOfflineSeq);
  const attackWarningMessage = useGhoulCameraAttackWarningMessage(cameraAttackStartedSeq);
  const { visible, text } = titanMessage.visible
    ? titanMessage
    : attackWarningMessage.visible
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
      <div className="text-[10px] font-bold tracking-wide text-gray-300 animate-pulse mb-1">ZACHYCENÝ PŘENOS</div>
      <RadioWaveform />
      <div className="text-xs text-gray-200 mt-1">{text}</div>
    </div>
  );
}
