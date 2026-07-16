import { AUDIO_EVENTS, AudioEventId } from "../audio/audioEvents";

/**
 * Text varování PŘED útokem Ghoula na kameru (viz zadání "než zaútočí a
 * zničí kameru, ať se předtím zobrazí zpráva") — přesně jeden, pevný text
 * (na rozdíl od zvukových variant níže tu není potřeba textový pool, jen
 * krátký varovný nápis, který sedí ke kterékoliv z nich).
 * Zobrazuje se PŘESNĚ v okamžiku, kdy útok začíná (viz
 * GameState.cameraAttackStartedSeq, gameReducer.ts#attemptGhoulCameraAttack)
 * — tedy ještě PŘED pětisekundovým přechodem a samotným vyřazením obrazu
 * (viz GameState.cameraOfflineSeq, useCameraDisabledRadioMessage.ts), ne po
 * něm.
 */
export const GHOUL_CAMERA_ATTACK_WARNING_TEXT = "To ne! Sonické dělo přilákalo ghoula!";

/**
 * Jak dlouho (ms) zůstane varování vidět — stejný řád velikosti jako
 * ostatní krátké rádiové texty (viz monsterRepelRadioMessages.ts
 * OVERLAY_TAIL_MS/resolveMonsterRepelOverlayDurationMs), tady bez vázané
 * audio stopy (žádný namluvený soubor), takže pevná konstanta místo
 * odvození z délky nahrávky.
 */
export const GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS = 2500;

/**
 * Dvě varianty řevu Ghoula PŘESNĚ v okamžiku útoku (dodané zdrojové soubory
 * ghoul_appear_0/1.wav, zpracováno `ffmpeg -af "volume=6dB" -codec:a
 * libmp3lame -b:a 128k`, viz audioConfig.ts) — hraje SOUČASNĚ s
 * `AUDIO_EVENTS.cameraDamageStart` (elektronický "začátek poškození" zvuk,
 * viz app/play/page.tsx), ne místo něj. Stejný "náhodný výběr jedné
 * varianty" vzor jako cameraDisabledRadioMessage.ts/monsterRepelRadioMessages.ts.
 */
export const GHOUL_CAMERA_ATTACK_WARNING_SOUNDS: AudioEventId[] = [
  AUDIO_EVENTS.ghoulCameraAttackWarning0,
  AUDIO_EVENTS.ghoulCameraAttackWarning1,
];

/**
 * Náhodný výběr jedné ze dvou variant (viz zadání "výběr v místě audio
 * side-effectu" — volá se z useGhoulCameraAttackWarningMessage.ts). Čistá
 * funkce nad explicitním `sounds` parametrem (default = skutečný pool),
 * ať jde testovat i s uměle krátkým/prázdným seznamem — `null` pro
 * prázdný pool, nikdy pád.
 */
export function pickRandomGhoulCameraAttackWarningSound(
  sounds: AudioEventId[] = GHOUL_CAMERA_ATTACK_WARNING_SOUNDS,
): AudioEventId | null {
  if (sounds.length === 0) return null;
  const index = Math.floor(Math.random() * sounds.length);
  return sounds[index];
}
