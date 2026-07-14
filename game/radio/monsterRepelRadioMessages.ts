import { AUDIO_CONFIG } from "../audio/audioConfig";
import { AUDIO_EVENTS, AudioEventId } from "../audio/audioEvents";
import { MonsterRepelRadioResult } from "../core/types";

/**
 * Jedna namluvená varianta reakce na sonické dělo (viz zadání) — `id` je
 * zároveň `AudioEventId` (viz game/audio/audioEvents.ts), `audioSrc` se
 * odvozuje přímo z `AUDIO_CONFIG[id].src`, stejný vzor jako
 * game/radio/releaseMonsterMessages.ts.
 */
export interface MonsterRepelRadioMessage {
  id: AudioEventId;
  audioSrc: string;
}

/**
 * Zdrojové dlouhé nahrávky (`public/object_13/sound/repel_monster/repel_{success,stay,failed}.wav`)
 * záměrně NEJSOU v žádné z těchhle kategorií — viz zadání "Nevkládej ho do
 * random poolu", stejný důvod jako u release_monster.
 */
export const MONSTER_REPEL_RADIO_MESSAGES: Record<MonsterRepelRadioResult, MonsterRepelRadioMessage[]> = {
  success: [
    { id: AUDIO_EVENTS.radioMonsterRepelSuccess0, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelSuccess0].src },
    { id: AUDIO_EVENTS.radioMonsterRepelSuccess1, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelSuccess1].src },
    { id: AUDIO_EVENTS.radioMonsterRepelSuccess2, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelSuccess2].src },
    { id: AUDIO_EVENTS.radioMonsterRepelSuccess3, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelSuccess3].src },
  ],
  stay: [
    { id: AUDIO_EVENTS.radioMonsterRepelStay0, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelStay0].src },
    { id: AUDIO_EVENTS.radioMonsterRepelStay1, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelStay1].src },
    { id: AUDIO_EVENTS.radioMonsterRepelStay2, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelStay2].src },
  ],
  fail: [
    { id: AUDIO_EVENTS.radioMonsterRepelFail0, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelFail0].src },
    { id: AUDIO_EVENTS.radioMonsterRepelFail1, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelFail1].src },
    { id: AUDIO_EVENTS.radioMonsterRepelFail2, audioSrc: AUDIO_CONFIG[AUDIO_EVENTS.radioMonsterRepelFail2].src },
  ],
};

/** Přesná délka (ms) každého souboru (viz report — `ffprobe` po zpracování) — stejný účel jako releaseMonsterMessages.ts#resolveReleaseMonsterOverlayDurationMs. */
const MESSAGE_DURATIONS_MS: Partial<Record<AudioEventId, number>> = {
  [AUDIO_EVENTS.radioMonsterRepelSuccess0]: 1024,
  [AUDIO_EVENTS.radioMonsterRepelSuccess1]: 1024,
  [AUDIO_EVENTS.radioMonsterRepelSuccess2]: 1024,
  [AUDIO_EVENTS.radioMonsterRepelSuccess3]: 1109,
  [AUDIO_EVENTS.radioMonsterRepelStay0]: 1365,
  [AUDIO_EVENTS.radioMonsterRepelStay1]: 1195,
  [AUDIO_EVENTS.radioMonsterRepelStay2]: 1024,
  [AUDIO_EVENTS.radioMonsterRepelFail0]: 1195,
  [AUDIO_EVENTS.radioMonsterRepelFail1]: 1451,
  [AUDIO_EVENTS.radioMonsterRepelFail2]: 1195,
};

const OVERLAY_TAIL_MS = 150;

/** `0` (jen tail rezerva) pro neznámé/budoucí id, ne pád — bezpečný fallback, stejná konvence jako releaseMonsterMessages.ts. */
export function resolveMonsterRepelOverlayDurationMs(id: AudioEventId): number {
  return (MESSAGE_DURATIONS_MS[id] ?? 0) + OVERLAY_TAIL_MS;
}

/**
 * Náhodný výběr jedné varianty Z KONKRÉTNÍ KATEGORIE (viz zadání "výběr v
 * místě audio side-effectu, ne v čistém reduceru" — volá se z
 * useMonsterRepelRadioMessage.ts, ne odsud automaticky ani z reduceru).
 * Čistá funkce nad explicitním `messages` parametrem (default = skutečná
 * kategorie z manifestu), ať jde testovat i s uměle krátkým/prázdným
 * seznamem. `null` pro prázdnou kategorii, nikdy pád.
 */
export function pickRandomMonsterRepelMessage(
  category: MonsterRepelRadioResult,
  messages: MonsterRepelRadioMessage[] = MONSTER_REPEL_RADIO_MESSAGES[category],
): MonsterRepelRadioMessage | null {
  if (messages.length === 0) return null;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}
