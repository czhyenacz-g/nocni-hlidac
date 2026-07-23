import { AUDIO_CONFIG } from "../audio/audioConfig";
import { AUDIO_EVENTS, AudioEventId } from "../audio/audioEvents";

/**
 * Titanův útěk (viz zadání "nová nahrávka sound/titan_escape.wav... pět
 * hlášek namluvených v tomto pořadí") — NAHRAZUJE dřívější dlouhou
 * vícekrokovou tutorialovou/kontextovou rádiovou vrstvu (escape/stage
 * beaty, obranné reakce, generátorové reakce, viz git historie) jednou
 * krátkou náhodně vybranou hláškou při ZAHÁJENÍ Titanova setkání. `text` je
 * PŘESNÝ přepis (dodaný v zadání, ne odhad) — stejný "1:1 sedí s
 * přehrávaným zvukem" vzor jako cameraDisabledRadioMessage.ts, na rozdíl od
 * release_monster/monsterRepel hlášek (tam jde jen o obecný status label).
 *
 * Zobrazený text žije v content/copy.ts#radio.titanEscapeMessages (klíč =
 * `id`, viz i18n) — tenhle manifest nese jen audio/timing.
 */
export interface TitanEscapeMessage {
  id: AudioEventId;
  audioSrc: string;
}

export const TITAN_ESCAPE_MESSAGES: TitanEscapeMessage[] = [
  { id: AUDIO_EVENTS.titanEscape01, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.titanEscape01].src },
  { id: AUDIO_EVENTS.titanEscape02, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.titanEscape02].src },
  { id: AUDIO_EVENTS.titanEscape03, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.titanEscape03].src },
  { id: AUDIO_EVENTS.titanEscape04, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.titanEscape04].src },
  { id: AUDIO_EVENTS.titanEscape05, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.titanEscape05].src },
];

/** Přesná délka (ms) každého rozřezaného souboru (viz ffprobe, report) + malá rezerva — stejný účel jako cameraDisabledRadioMessage.ts#resolveCameraDisabledOverlayDurationMs. */
const MESSAGE_DURATIONS_MS: Partial<Record<AudioEventId, number>> = {
  [AUDIO_EVENTS.titanEscape01]: 6404,
  [AUDIO_EVENTS.titanEscape02]: 5062,
  [AUDIO_EVENTS.titanEscape03]: 4625,
  [AUDIO_EVENTS.titanEscape04]: 4554,
  [AUDIO_EVENTS.titanEscape05]: 5435,
};

const OVERLAY_TAIL_MS = 400;

/** `0` (jen tail rezerva) pro neznámé/budoucí id, ne pád — bezpečný fallback, stejná konvence jako ostatní rádiové manifesty. */
export function resolveTitanEscapeOverlayDurationMs(id: AudioEventId): number {
  return (MESSAGE_DURATIONS_MS[id] ?? 0) + OVERLAY_TAIL_MS;
}

/**
 * Náhodný výběr JEDNÉ z pěti variant (viz zadání "při jednom Titanově
 * encounteru se přehraje právě jedna hláška") — volá se z
 * useTitanEscapeMessage.ts, ne odsud automaticky. Čistá funkce nad
 * explicitním `messages` parametrem (default = skutečný manifest), ať jde
 * testovat i s uměle krátkým/prázdným seznamem. `null` pro prázdný seznam,
 * nikdy pád (viz zadání "6. Chybové stavy... náhodný výběr jen z reálně
 * dostupných variant").
 */
export function pickRandomTitanEscapeMessage(
  messages: TitanEscapeMessage[] = TITAN_ESCAPE_MESSAGES,
): TitanEscapeMessage | null {
  if (messages.length === 0) return null;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}
