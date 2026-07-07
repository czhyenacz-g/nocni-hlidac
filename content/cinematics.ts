// Obecný datový model pro krátké story/cinematic scény (viz
// components/screens/CinematicScreen.tsx) — zatím jen technický základ,
// první scéna má jediný segment ("Baf!"). Připraveno na to, aby později
// přibyly další scény/segmenty/audio, beze změny CinematicScreen.tsx.

export type CinematicSceneId = "old_guard_first_death_warning";

export interface CinematicSegment {
  id: string;
  text: string;
  /** Volitelný doprovodný zvuk — chybějící soubor/zakázané přehrání nikdy nesmí zaseknout scénu, viz CinematicScreen.tsx. */
  audioSrc?: string;
  /** Zatím nevyužité (žádná automatická synchronizace) — připraveno pro budoucí auto-advance. */
  durationMs?: number;
  /** Text tlačítka pro posun na další segment (nebo dokončení scény u posledního). Bez něj segment nejde odkliknout. */
  responseLabel?: string;
}

export interface CinematicScene {
  id: CinematicSceneId;
  imageSrc: string;
  title?: string;
  segments: CinematicSegment[];
}

export const CINEMATIC_SCENES: Record<CinematicSceneId, CinematicScene> = {
  old_guard_first_death_warning: {
    id: "old_guard_first_death_warning",
    imageSrc: "/object_13/story/story_1.webp",
    segments: [
      {
        id: "baf",
        text: "Baf!",
        responseLabel: "...",
      },
    ],
  },
};

/** Bezpečný přístup ke scéně — `null`, pokud by `id` neodpovídalo žádnému záznamu (dnes se to nemůže stát, `CinematicSceneId` je uzavřený union, ale CinematicScreen.tsx na tenhle fallback spoléhá). */
export function getCinematicScene(id: CinematicSceneId): CinematicScene | null {
  return CINEMATIC_SCENES[id] ?? null;
}
