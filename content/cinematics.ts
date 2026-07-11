// Obecný datový model pro krátké story/cinematic scény (viz
// components/screens/CinematicScreen.tsx). Připraveno na to, aby později
// přibyly další scény/segmenty/audio, beze změny CinematicScreen.tsx.

export type CinematicSceneId = "old_guard_first_death_warning" | "think_it_over_warning";

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
// audioSrc: namluvená nahrávka (public/object_13/story/story_1.m4a) rozdělená
// podle pauz mezi větami (viz public/object_13/story/segments/) na 13 klipů,
// jeden na segment — hranice střihu ověřené přepisem (Whisper), ne jen slepě
// podle ticha, ať žádný klip neusekne slovo.
export const CINEMATIC_SCENES: Record<CinematicSceneId, CinematicScene> = {
  old_guard_first_death_warning: {
    id: "old_guard_first_death_warning",
    imageSrc: "/object_13/story/story_1.webp",
    segments: [
      { id: "baf", text: "Baf.", audioSrc: "/object_13/story/segments/story_1_baf.m4a", responseLabel: "..." },
      {
        id: "another_one",
        text: "No výborně. Další, co čumí do monitorů a nehlídá si záda.",
        audioSrc: "/object_13/story/segments/story_1_another_one.m4a",
        responseLabel: "Polknu.",
      },
      {
        id: "im_the_tech",
        text: "Jsem místní technik. Máš kliku, že jsem to já.",
        audioSrc: "/object_13/story/segments/story_1_im_the_tech.m4a",
        responseLabel: "Mlčím.",
      },
      {
        id: "last_day",
        text: "Dneska jsem tu naposledy. Stěhuju se z města.",
        audioSrc: "/object_13/story/segments/story_1_last_day.m4a",
        responseLabel: "Poslouchám.",
      },
      {
        id: "advice_intro",
        text: "Tak ti na rozloučenou dám pár rad, nový ucho.",
        audioSrc: "/object_13/story/segments/story_1_advice_intro.m4a",
        responseLabel: "...",
      },
      {
        id: "creatures",
        text: "Po okolí se tu potulujou divný potvory. Hodně divný.",
        audioSrc: "/object_13/story/segments/story_1_creatures.m4a",
        responseLabel: "Polknu.",
      },
      {
        id: "cameras",
        text: "Ty kamery tam máš k čemu, blbečku?",
        audioSrc: "/object_13/story/segments/story_1_cameras.m4a",
        responseLabel: "Mlčím.",
      },
      {
        id: "door_power",
        text: "Ty dveře jsou pod proudem. Proud žere energii. To snad chápeš.",
        audioSrc: "/object_13/story/segments/story_1_door_power.m4a",
        responseLabel: "Chápu.",
      },
      {
        id: "dont_panic_close",
        text: "Nevidíš na kamerách nebezpečí? Tak nezavírej dveře jak vystrašenej králík.",
        audioSrc: "/object_13/story/segments/story_1_dont_panic_close.m4a",
        responseLabel: "Dochází mi to.",
      },
      {
        id: "watch_hallway",
        text: "Vidíš něco v chodbě? Sleduj, kam to jde.",
        audioSrc: "/object_13/story/segments/story_1_watch_hallway.m4a",
        responseLabel: "Dobře.",
      },
      {
        id: "close_the_door",
        text: "Je to u dveří? Tak je zavři. To by pochopilo i malý dítě.",
        audioSrc: "/object_13/story/segments/story_1_close_the_door.m4a",
        responseLabel: "Rozumím.",
      },
      {
        id: "light_tip",
        text: "A občas ti pomůže rozsvítit za dveřmi. Děti se taky bojí tmy... hahaha.",
        audioSrc: "/object_13/story/segments/story_1_light_tip.m4a",
        responseLabel: "Polknu.",
      },
      {
        id: "farewell",
        text: "Tak přeju pěknou noc.",
        audioSrc: "/object_13/story/segments/story_1_farewell.m4a",
        responseLabel: "Zpátky ke stolu.",
      },
    ],
  },
  // "Nechat si to projít hlavou" (viz zadání, LeftWallView.tsx#thinkItOver
  // tlačítko, app/play/page.tsx#thinkItOverReadySeq efekt) — dřív jen
  // jednořádkový toast (COPY.game.thinkItOverResultLabel), teď plnohodnotná
  // klikací scéna jako old_guard_first_death_warning výše, jen bez audia
  // (žádné namluvené klipy nejsou k dispozici, CinematicScreen.tsx to
  // zvládá beze změny — segmentAudioSrc je volitelný). Text rozdělený na
  // kratší klikací kousky, ne jeden dlouhý odstavec, ať to působí jako
  // rozhovor se sebou samým/hlasem v hlavě, ne jako čtení nástěnky.
  think_it_over_warning: {
    id: "think_it_over_warning",
    imageSrc: "/object_13/story/think_it_over_warning.webp",
    segments: [
      { id: "dont", text: "Nedělej to!", responseLabel: "..." },
      {
        id: "not_a_coward",
        text: "Myslel jsem, že nejsi slaboch, co se tak snadno vzdá.",
        responseLabel: "Nejsem.",
      },
      { id: "find_warrior", text: "Najdi v sobě válečníka.", responseLabel: "Zkusím." },
      {
        id: "not_invincible",
        text: "Monstrum není nezranitelné — jen je tvrdší, než vypadá.",
        responseLabel: "Poslouchám.",
      },
      { id: "heals", text: "Ale pamatuj: s ránem se znovu zahojí.", responseLabel: "Chápu." },
      {
        id: "one_night",
        text: "Jestli ji chceš položit, musíš to dokázat během jediné noci.",
        responseLabel: "Dobře.",
      },
      {
        id: "one_two_hits",
        text: "Jedna rána nic neukončí, dvě tě jen uklidní…",
        responseLabel: "A dál?",
      },
      {
        id: "ten_hits",
        text: "…ale desetkrát se postavit strachu a znovu zmáčknout spoušť? To už může být dost na to, aby padla i bestie.",
        responseLabel: "Zpátky ke stolu.",
      },
    ],
  },
};

/** Bezpečný přístup ke scéně — `null`, pokud by `id` neodpovídalo žádnému záznamu (dnes se to nemůže stát, `CinematicSceneId` je uzavřený union, ale CinematicScreen.tsx na tenhle fallback spoléhá). */
export function getCinematicScene(id: CinematicSceneId): CinematicScene | null {
  return CINEMATIC_SCENES[id] ?? null;
}
