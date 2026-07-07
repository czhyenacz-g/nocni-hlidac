// Obecný datový model pro krátké story/cinematic scény (viz
// components/screens/CinematicScreen.tsx). Připraveno na to, aby později
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

// Selhání v první noci ještě není skutečná smrt — za monstrum se dostal
// místní technik, sprdne nováčka a na rozloučenou (dneska se stěhuje z
// města) mu vysvětlí základní pravidla přežití. Tón: přísný, protivný,
// trochu buranský, sarkastický — člověk z provozu, ne poetický vypravěč.
// audioSrc zatím záměrně chybí u všech segmentů — žádné MP3 soubory zatím
// neexistují (viz zadání), doplní se later jako samostatné namluvené věty.
export const CINEMATIC_SCENES: Record<CinematicSceneId, CinematicScene> = {
  old_guard_first_death_warning: {
    id: "old_guard_first_death_warning",
    imageSrc: "/object_13/story/story_1.webp",
    segments: [
      { id: "baf", text: "Baf.", responseLabel: "..." },
      { id: "another_one", text: "No výborně. Další, co čumí do monitorů a nehlídá si záda.", responseLabel: "Polknu." },
      { id: "im_the_tech", text: "Jsem místní technik. Máš kliku, že jsem to já.", responseLabel: "Mlčím." },
      { id: "last_day", text: "Dneska jsem tu naposledy. Stěhuju se z města.", responseLabel: "Poslouchám." },
      { id: "advice_intro", text: "Tak ti na rozloučenou dám pár rad, nový ucho.", responseLabel: "..." },
      { id: "creatures", text: "Po okolí se tu potulujou divný potvory. Hodně divný.", responseLabel: "Polknu." },
      { id: "cameras", text: "Ty kamery tam máš k čemu, blbečku?", responseLabel: "Mlčím." },
      { id: "door_power", text: "Ty dveře jsou pod proudem. Proud žere energii. To snad chápeš.", responseLabel: "Chápu." },
      { id: "dont_panic_close", text: "Nevidíš na kamerách nebezpečí? Tak nezavírej dveře jak vystrašenej králík.", responseLabel: "Dochází mi to." },
      { id: "watch_hallway", text: "Vidíš něco v chodbě? Sleduj, kam to jde.", responseLabel: "Dobře." },
      { id: "close_the_door", text: "Je to u dveří? Tak je zavři. To by pochopilo i malý dítě.", responseLabel: "Rozumím." },
      { id: "light_tip", text: "A občas ti pomůže rozsvítit za dveřmi. Děti se taky bojí tmy... hahaha.", responseLabel: "Polknu." },
      { id: "farewell", text: "Tak přeju pěknou noc.", responseLabel: "Zpět do směny." },
    ],
  },
};

/** Bezpečný přístup ke scéně — `null`, pokud by `id` neodpovídalo žádnému záznamu (dnes se to nemůže stát, `CinematicSceneId` je uzavřený union, ale CinematicScreen.tsx na tenhle fallback spoléhá). */
export function getCinematicScene(id: CinematicSceneId): CinematicScene | null {
  return CINEMATIC_SCENES[id] ?? null;
}
