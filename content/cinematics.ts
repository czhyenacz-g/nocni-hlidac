// Obecný datový model pro krátké story/cinematic scény (viz
// components/screens/CinematicScreen.tsx). Připraveno na to, aby později
// přibyly další scény/segmenty/audio, beze změny CinematicScreen.tsx.
//
// Jazykově nezávislá struktura (id/audio/timing) — samotný text/title/
// responseLabel žije v content/copy.ts#cinematics (stejný `id` jako klíč,
// viz CinematicScreen.tsx, které si text dotáhne přes useCopy()).

export type CinematicSceneId =
  | "intro"
  | "old_guard_first_death_warning"
  | "think_it_over_warning"
  | "valhala_ending"
  | "warrior_ending"
  | "no_kill_ending";

export interface CinematicSegment {
  id: string;
  /** Volitelný doprovodný zvuk — chybějící soubor/zakázané přehrání nikdy nesmí zaseknout scénu, viz CinematicScreen.tsx. */
  audioSrc?: string;
  /** Zatím nevyužité (žádná automatická synchronizace) — připraveno pro budoucí auto-advance. */
  durationMs?: number;
}

export interface CinematicScene {
  id: CinematicSceneId;
  imageSrc: string;
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
  // Volitelné intro před Nocí 1 (viz zadání "Spustit intro" na briefingu i na
  // /terms, components/screens/BriefingScreen.tsx, app/terms/page.tsx) —
  // pracovní pohovor, který hráč nikdy nemusí spustit (Night 1 mechaniky na
  // něm nezávisí).
  intro: {
    id: "intro",
    imageSrc: "/object_13/story/intro_bg.webp",
    segments: [
      { id: "greeting" },
      { id: "profile_match" },
      { id: "no_complaints" },
      { id: "no_dependents" },
      { id: "hired" },
      { id: "special_place" },
      { id: "risk_and_pay" },
      { id: "duties" },
      { id: "welcome" },
      { id: "payday_note" },
    ],
  },
  old_guard_first_death_warning: {
    id: "old_guard_first_death_warning",
    imageSrc: "/object_13/story/story_1.webp",
    segments: [
      { id: "baf", audioSrc: "/object_13/story/segments/story_1_baf.m4a" },
      { id: "another_one", audioSrc: "/object_13/story/segments/story_1_another_one.m4a" },
      { id: "im_the_tech", audioSrc: "/object_13/story/segments/story_1_im_the_tech.m4a" },
      { id: "last_day", audioSrc: "/object_13/story/segments/story_1_last_day.m4a" },
      { id: "advice_intro", audioSrc: "/object_13/story/segments/story_1_advice_intro.m4a" },
      { id: "creatures", audioSrc: "/object_13/story/segments/story_1_creatures.m4a" },
      { id: "cameras", audioSrc: "/object_13/story/segments/story_1_cameras.m4a" },
      { id: "door_power", audioSrc: "/object_13/story/segments/story_1_door_power.m4a" },
      { id: "dont_panic_close", audioSrc: "/object_13/story/segments/story_1_dont_panic_close.m4a" },
      { id: "watch_hallway", audioSrc: "/object_13/story/segments/story_1_watch_hallway.m4a" },
      { id: "close_the_door", audioSrc: "/object_13/story/segments/story_1_close_the_door.m4a" },
      { id: "light_tip", audioSrc: "/object_13/story/segments/story_1_light_tip.m4a" },
      { id: "farewell", audioSrc: "/object_13/story/segments/story_1_farewell.m4a" },
    ],
  },
  // "Nechat si to projít hlavou" (viz zadání, LeftWallView.tsx#thinkItOver
  // tlačítko, app/play/page.tsx#thinkItOverReadySeq efekt) — dřív jen
  // jednořádkový toast (COPY.game.thinkItOverResultLabel), teď plnohodnotná
  // klikací scéna jako old_guard_first_death_warning výše, jen bez audia.
  think_it_over_warning: {
    id: "think_it_over_warning",
    imageSrc: "/object_13/story/think_it_over_warning.webp",
    segments: [
      { id: "dont" },
      { id: "not_a_coward" },
      { id: "find_warrior" },
      { id: "not_invincible" },
      { id: "heals" },
      { id: "one_night" },
      { id: "one_two_hits" },
      { id: "ten_hits" },
    ],
  },
  // Hardcore smrt "uprostřed" dlouhé šňůry (noc 20–30 včetně, viz zadání,
  // game/core/valhalaEnding.ts#shouldShowValhalaEndingCinematic) —
  // meziscéna PŘED normálním DeathScreenem, splácí slib z
  // content/monsterDefeatedCinematic.ts ("Potkáme se až nastane 30. den...
  // nebo ve Valhale."). imageSrc záměrně ukazuje na `wallhala_ending.png`
  // (ne `.webp`, ne přejmenované/opravené na "valhalla") — přesný existující
  // asset dodaný v zadání, beze změny názvu.
  valhala_ending: {
    id: "valhala_ending",
    imageSrc: "/object_13/story/wallhala_ending.png",
    segments: [
      { id: "silence" },
      { id: "wood_creaked" },
      { id: "hynek_raises_mug" },
      { id: "close_call", audioSrc: "/object_13/story/segments/valhala_close_call.m4a" },
      { id: "smiled" },
      { id: "thirty_or_valhalla", audioSrc: "/object_13/story/segments/valhala_thirty_or_valhalla.m4a" },
      { id: "pushed_beer" },
      { id: "not_bad_guard", audioSrc: "/object_13/story/segments/valhala_not_bad_guard.m4a" },
    ],
  },
  // Hardcore Noc 30 s aspoň jedním zabitím bestie v aktuálním runu (viz
  // zadání "Night 30 warrior ending", game/core/night30Ending.ts) — úvodní
  // část "POSLEDNÍ SMĚNA", zobrazená stejně jako Valhala výše.
  // imageSrc přesně `warior_ending.png` (překlep záměrný, beze změny názvu).
  warrior_ending: {
    id: "warrior_ending",
    imageSrc: "/object_13/story/warior_ending.png",
    segments: [
      { id: "thirtieth_day" },
      { id: "hynek_smiling" },
      { id: "not_just_good_watch", audioSrc: "/object_13/story/segments/posledni_smena_not_just_good_watch.m4a" },
      { id: "nodded" },
      { id: "you_became_warrior", audioSrc: "/object_13/story/segments/posledni_smena_you_became_warrior.m4a" },
      { id: "men_in_suits" },
      { id: "thank_you_bait", audioSrc: "/object_13/story/segments/posledni_smena_thank_you_bait.m4a" },
      { id: "points_at_generator" },
      { id: "your_generator", audioSrc: "/object_13/story/segments/posledni_smena_your_generator.m4a" },
      { id: "let_it_sink_in" },
      { id: "not_out_of_town", audioSrc: "/object_13/story/segments/posledni_smena_not_out_of_town.m4a" },
      { id: "you_bought_time", audioSrc: "/object_13/story/segments/posledni_smena_you_bought_time.m4a" },
      { id: "lights_on" },
      { id: "maximum_fireworks", audioSrc: "/object_13/story/segments/posledni_smena_maximum_fireworks.m4a" },
      { id: "opened_briefcase" },
      { id: "your_pay_plus_bonus", audioSrc: "/object_13/story/segments/posledni_smena_your_pay_plus_bonus.m4a" },
      { id: "grew_serious" },
      { id: "thousand_monsters", audioSrc: "/object_13/story/segments/posledni_smena_thousand_monsters.m4a" },
      { id: "step_to_door" },
      { id: "project_ends", audioSrc: "/object_13/story/segments/posledni_smena_project_ends.m4a" },
      { id: "turned_back" },
      { id: "good_luck_warrior", audioSrc: "/object_13/story/segments/posledni_smena_good_luck_warrior.m4a" },
    ],
  },
  // Hardcore Noc 30 BEZ zabití bestie v aktuálním runu (viz zadání "Night 30
  // no-kill ending", game/core/night30Ending.ts) — úvodní část "PRVNÍ
  // VÝPLATA", stejný klikací styl jako warrior_ending/valhala_ending výše.
  no_kill_ending: {
    id: "no_kill_ending",
    imageSrc: "/object_13/story/no_kill_ending.png",
    segments: [
      { id: "thirtieth_day" },
      { id: "hynek_before_dawn" },
      { id: "looked_you_over" },
      { id: "thirty_nights", audioSrc: "/object_13/story/segments/prvni_vyplata_thirty_nights.m4a" },
      { id: "handed_envelope" },
      { id: "good_guard", audioSrc: "/object_13/story/segments/prvni_vyplata_good_guard.m4a" },
      { id: "waited_for_truth" },
      { id: "lit_cigarette" },
      { id: "see_you_in_a_month", audioSrc: "/object_13/story/segments/prvni_vyplata_see_you_in_a_month.m4a" },
    ],
  },
};

/** Bezpečný přístup ke scéně — `null`, pokud by `id` neodpovídalo žádnému záznamu (dnes se to nemůže stát, `CinematicSceneId` je uzavřený union, ale CinematicScreen.tsx na tenhle fallback spoléhá). */
export function getCinematicScene(id: CinematicSceneId): CinematicScene | null {
  return CINEMATIC_SCENES[id] ?? null;
}
