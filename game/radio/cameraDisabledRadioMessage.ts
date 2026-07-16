import { AUDIO_CONFIG } from "../audio/audioConfig";
import { AUDIO_EVENTS, AudioEventId } from "../audio/audioEvents";

/**
 * Definice rádiové zprávy pro vyřazení kamery Ghoulem (viz zadání) — tři
 * SKUTEČNĚ namluvené varianty (`camera_destroid_full_1.wav`, dodaný zdroj),
 * stejný "`id: AudioEventId`, `audioSrc` odvozený z `AUDIO_CONFIG[id].src`"
 * vzor jako `monsterRepelRadioMessages.ts`/`releaseMonsterMessages.ts`.
 * `text` je přesný přepis dané varianty (Whisper, ověřeno opakovanou
 * transkripcí + poslechem — viz TECH_DESIGN.md "Whisper" a report u
 * zadání) — zobrazuje se v overlay PŘESNĚ podle toho, která varianta se
 * náhodně vybere (na rozdíl od repel/release hlášek tady text sedí 1:1 s
 * přehrávaným zvukem, ne obecný stavový label).
 *
 * Čtvrtý segment ve zdrojové nahrávce zůstal nesrozumitelný i po několika
 * nezávislých pokusech o přepis (různé ořezy, denoising, prompt) — na
 * žádost vynechán, pool má proto jen tři varianty, ne čtyři.
 */
export interface CameraDisabledRadioMessage {
  id: AudioEventId;
  text: string;
  audioSrc: string;
}

export const CAMERA_DISABLED_RADIO_MESSAGES: CameraDisabledRadioMessage[] = [
  {
    id: AUDIO_EVENTS.radioCameraDestroyed0,
    text: "No, tak do rána jsme po tmě.",
    audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioCameraDestroyed0].src,
  },
  {
    id: AUDIO_EVENTS.radioCameraDestroyed1,
    text: "Kamera zničena!",
    audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioCameraDestroyed1].src,
  },
  {
    id: AUDIO_EVENTS.radioCameraDestroyed2,
    text: "Zbývá už jenom mikrofon.",
    audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioCameraDestroyed2].src,
  },
];

/** Přesná délka (ms) každého souboru + malá rezerva — stejný účel jako monsterRepelRadioMessages.ts#resolveMonsterRepelOverlayDurationMs. */
const MESSAGE_DURATIONS_MS: Partial<Record<AudioEventId, number>> = {
  [AUDIO_EVENTS.radioCameraDestroyed0]: 3700,
  [AUDIO_EVENTS.radioCameraDestroyed1]: 2100,
  [AUDIO_EVENTS.radioCameraDestroyed2]: 1800,
};

const OVERLAY_TAIL_MS = 400;

/** `0` (jen tail rezerva) pro neznámé/budoucí id, ne pád — bezpečný fallback, stejná konvence jako ostatní rádiové manifesty. */
export function resolveCameraDisabledOverlayDurationMs(id: AudioEventId): number {
  return (MESSAGE_DURATIONS_MS[id] ?? 0) + OVERLAY_TAIL_MS;
}

/**
 * Náhodný výběr jedné varianty (viz zadání "výběr v místě audio
 * side-effectu, ne v čistém reduceru") — volá se z
 * useCameraDisabledRadioMessage.ts. Čistá funkce nad explicitním `messages`
 * parametrem (default = skutečný manifest), ať jde testovat i s uměle
 * krátkým/prázdným seznamem. `null` pro prázdný seznam, nikdy pád.
 */
export function pickRandomCameraDisabledMessage(
  messages: CameraDisabledRadioMessage[] = CAMERA_DISABLED_RADIO_MESSAGES,
): CameraDisabledRadioMessage | null {
  if (messages.length === 0) return null;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}
