import { AUDIO_CONFIG } from "../audio/audioConfig";
import { AUDIO_EVENTS, AudioEventId } from "../audio/audioEvents";

/**
 * Jedna namluvená varianta hlášky "vypuštění monstra" (viz zadání "první
 * jednoduchá verze rádia") — `id` je zároveň `AudioEventId` (viz
 * game/audio/audioEvents.ts), ne libovolný string. `audioSrc` se odvozuje
 * přímo z `AUDIO_CONFIG[id].src`, ne z vlastní kopie cesty — jediný zdroj
 * pravdy pro cestu k souboru je `audioConfig.ts`, tenhle manifest jen
 * vybírá, KTERÉ eventy do "release monster" poolu patří a v jakém pořadí
 * (odpovídá pořadí ve zdrojové nahrávce, viz report).
 */
export interface ReleaseMonsterMessage {
  id: AudioEventId;
  audioSrc: string;
}

/**
 * Od jaké noci se "vypuštění monstra" hlášení vůbec smí přehrát (viz zadání
 * "nepřehrávej je noci 1-4") — noci 1-4 jsou záměrně tiché, hráč se s rádiem
 * ještě neseznámil. RadioMessageOverlay.tsx tímhle prahem podmiňuje
 * `useRadioMessage`'s `enabled` (spolu s existující `monsterId !== "titan"`
 * podmínkou — noc 5 je navíc VŽDY Titanova, viz
 * game/core/titanEncounterNights.ts#TITAN_FIRST_ENCOUNTER_NIGHT, takže by ji
 * tahle podmínka stejně vyloučila).
 */
export const RELEASE_MONSTER_MESSAGE_MIN_NIGHT = 5;

/**
 * Zdrojový dlouhý záznam (`public/object_13/sound/release_monster/source/
 * release_monster_raw.wav`) záměrně NENÍ v tomhle poli — hráč by jinak mohl
 * dostat celou 64s nahrávku všech hlášek za sebou místo jedné krátké (viz
 * zadání "Nevkládej ho do herního random poolu").
 */
export const RELEASE_MONSTER_MESSAGES: ReleaseMonsterMessage[] = [
  { id: AUDIO_EVENTS.radioReleaseMonster01, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster01].src },
  { id: AUDIO_EVENTS.radioReleaseMonster02, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster02].src },
  { id: AUDIO_EVENTS.radioReleaseMonster03, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster03].src },
  { id: AUDIO_EVENTS.radioReleaseMonster04, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster04].src },
  { id: AUDIO_EVENTS.radioReleaseMonster05, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster05].src },
  { id: AUDIO_EVENTS.radioReleaseMonster06, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster06].src },
  { id: AUDIO_EVENTS.radioReleaseMonster07, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster07].src },
  { id: AUDIO_EVENTS.radioReleaseMonster08, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster08].src },
  { id: AUDIO_EVENTS.radioReleaseMonster09, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster09].src },
  { id: AUDIO_EVENTS.radioReleaseMonster10, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster10].src },
  { id: AUDIO_EVENTS.radioReleaseMonster11, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioReleaseMonster11].src },
];

/**
 * Přesná délka (ms) každého zpracovaného souboru (viz report — `ffprobe`
 * po ořezání/normalizaci) — `useRadioMessage.ts` podle ní schová
 * `RadioMessageOverlay` po dohrání, stejný princip jako dřívější
 * `resolveRadioFallbackDurationMs` u speechSynthesis, jen s PŘESNOU
 * hodnotou místo odhadu z délky textu (žádný text tu není). +150ms rezerva,
 * ať se overlay nezavře těsně před doznněním poslední slabiky.
 */
const MESSAGE_DURATIONS_MS: Record<AudioEventId, number | undefined> = {
  [AUDIO_EVENTS.radioReleaseMonster01]: 2560,
  [AUDIO_EVENTS.radioReleaseMonster02]: 2304,
  [AUDIO_EVENTS.radioReleaseMonster03]: 1963,
  [AUDIO_EVENTS.radioReleaseMonster04]: 2133,
  [AUDIO_EVENTS.radioReleaseMonster05]: 2219,
  [AUDIO_EVENTS.radioReleaseMonster06]: 3072,
  [AUDIO_EVENTS.radioReleaseMonster07]: 1877,
  [AUDIO_EVENTS.radioReleaseMonster08]: 2560,
  [AUDIO_EVENTS.radioReleaseMonster09]: 2731,
  [AUDIO_EVENTS.radioReleaseMonster10]: 2987,
  [AUDIO_EVENTS.radioReleaseMonster11]: 2987,
} as Record<AudioEventId, number | undefined>;

const OVERLAY_TAIL_MS = 150;

/** `0` (jen tail rezerva) pro neznámé/budoucí id, ne pád — bezpečný fallback, ne throw. */
export function resolveReleaseMonsterOverlayDurationMs(id: AudioEventId): number {
  return (MESSAGE_DURATIONS_MS[id] ?? 0) + OVERLAY_TAIL_MS;
}

/**
 * Náhodný výběr jedné varianty (viz zadání "výběr v místě audio
 * side-effectu, ne v čistém reduceru" — volá se z useRadioMessage.ts, ne
 * odsud automaticky). Čistá funkce nad explicitním `messages` parametrem
 * (default = skutečný manifest), ať jde testovat i s uměle krátkým/prázdným
 * seznamem bez zásahu do modulového stavu. `null` pro prázdný seznam,
 * nikdy pád.
 */
export function pickRandomReleaseMonsterMessage(
  messages: ReleaseMonsterMessage[] = RELEASE_MONSTER_MESSAGES,
): ReleaseMonsterMessage | null {
  if (messages.length === 0) return null;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}
