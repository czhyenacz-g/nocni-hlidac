// Obecný datový model pro krátké story/cinematic scény (viz
// components/screens/CinematicScreen.tsx). Připraveno na to, aby později
// přibyly další scény/segmenty/audio, beze změny CinematicScreen.tsx.

export type CinematicSceneId =
  | "old_guard_first_death_warning"
  | "think_it_over_warning"
  | "valhala_ending"
  | "warrior_ending"
  | "no_kill_ending";

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
        text: "Jestli ho chceš položit, musíš to dokázat během jediné noci.",
        responseLabel: "Dobře.",
      },
      {
        id: "one_two_hits",
        text: "Jedna rána ji jen rozzuří, dvě ji možná rozhodí…",
        responseLabel: "A dál?",
      },
      {
        id: "ten_hits",
        text: "…ale DESETKRÁT se postavit strachu a znovu zmáčknout spoušť? To už může být dost na to, aby padla i tahle bestie.",
        responseLabel: "Zpátky ke stolu.",
      },
    ],
  },
  // Hardcore smrt "uprostřed" dlouhé šňůry (noc 20–30 včetně, viz zadání,
  // game/core/valhalaEnding.ts#shouldShowValhalaEndingCinematic) —
  // meziscéna PŘED normálním DeathScreenem, splácí slib z
  // content/monsterDefeatedCinematic.ts ("Potkáme se až nastane 30. den...
  // nebo ve Valhale."). imageSrc záměrně ukazuje na `wallhala_ending.png`
  // (ne `.webp`, ne přejmenované/opravené na "valhalla") — přesný existující
  // asset dodaný v zadání, beze změny názvu. Namluvené jen Hynkovy repliky
  // (ne popisné věty) — jeden souvislý diktafonový záznam (valhala.m4a)
  // rozstřižený podle ticha (ffmpeg silencedetect) a ověřený přepisem
  // (Whisper, stejný postup jako u story_1_*.m4a segmentů), jeden klip na
  // segment, stejný vzor jako old_guard_first_death_warning.
  valhala_ending: {
    id: "valhala_ending",
    imageSrc: "/object_13/story/wallhala_ending.png",
    title: "VALHALA",
    segments: [
      { id: "silence", text: "Ticho.", responseLabel: "..." },
      {
        id: "wood_creaked",
        text: "Pak dřevo zavrzalo pod tvýma rukama. Seděl jsi u dlouhého stolu.",
        responseLabel: "Rozhlížím se.",
      },
      { id: "hynek_raises_mug", text: "Naproti tobě Hynek zvedl půllitr.", responseLabel: "..." },
      {
        id: "close_call",
        text: "„Byl jsi blízko.“",
        audioSrc: "/object_13/story/segments/valhala_close_call.m4a",
        responseLabel: "Mlčím.",
      },
      { id: "smiled", text: "Chvíli se usmál.", responseLabel: "..." },
      {
        id: "thirty_or_valhalla",
        text: "„Nakonec jsem měl pravdu. Buď se potkáme třicátou noc… nebo ve Valhale.“",
        audioSrc: "/object_13/story/segments/valhala_thirty_or_valhalla.m4a",
        responseLabel: "Poslouchám.",
      },
      { id: "pushed_beer", text: "Přisunul ti pivo.", responseLabel: "..." },
      {
        id: "not_bad_guard",
        text: "„A víš co? Na hlídače sis nevedl špatně.“",
        audioSrc: "/object_13/story/segments/valhala_not_bad_guard.m4a",
        responseLabel: "Napiju se.",
      },
    ],
  },
  // Hardcore Noc 30 s aspoň jedním zabitím bestie v aktuálním runu (viz
  // zadání "Night 30 warrior ending", game/core/night30Ending.ts) — úvodní
  // část "POSLEDNÍ SMĚNA", zobrazená stejně jako Valhala výše (klikací
  // segmenty v rámovaném okně), na výslovnou žádost "podobně jako Valhala".
  // components/screens/Night30EndingScreen.tsx po dokončení přepne na
  // druhou fázi (ztemnělá obrazovka, epilog + úmrtní záznam), NE do menu
  // (na rozdíl od handleValhalaCinematicComplete) — tahle scéna sama o sobě
  // ending nekončí. imageSrc přesně `warior_ending.png` (překlep záměrný,
  // beze změny názvu). Namluvené jen Hynkovy repliky — jeden souvislý
  // diktafonový záznam (posledni_smena.m4a) rozstřižený a ověřený stejně
  // jako valhala_ending výše.
  warrior_ending: {
    id: "warrior_ending",
    imageSrc: "/object_13/story/warior_ending.png",
    title: "POSLEDNÍ SMĚNA",
    segments: [
      { id: "thirtieth_day", text: "Třicátý den.", responseLabel: "..." },
      {
        id: "hynek_smiling",
        text: "Hynek stál uprostřed místnosti a usmíval se víc než obvykle.",
        responseLabel: "Sleduju ho.",
      },
      {
        id: "not_just_good_watch",
        text: "„Tak jo. Tohle už nebyla jen dobrá hlídka.“",
        audioSrc: "/object_13/story/segments/posledni_smena_not_just_good_watch.m4a",
        responseLabel: "...",
      },
      { id: "nodded", text: "Podíval se na tebe a přikývl.", responseLabel: "..." },
      {
        id: "you_became_warrior",
        text: "„Stal se z tebe válečník.“",
        audioSrc: "/object_13/story/segments/posledni_smena_you_became_warrior.m4a",
        responseLabel: "Mlčím.",
      },
      {
        id: "men_in_suits",
        text: "Za jeho zády se ozýval kov, kroky a tlumené hlasy mužů v ochranných oblecích.",
        responseLabel: "Poslouchám.",
      },
      {
        id: "thank_you_bait",
        text: "„A hlavně — děkuju ti. Pomohl jsi mi otestovat vábničku na monstra.“",
        audioSrc: "/object_13/story/segments/posledni_smena_thank_you_bait.m4a",
        responseLabel: "Cože?",
      },
      { id: "points_at_generator", text: "Ukázal ke generátoru.", responseLabel: "..." },
      {
        id: "your_generator",
        text: "„Jo. Přesně tuhle. Tvůj generátor.“",
        audioSrc: "/object_13/story/segments/posledni_smena_your_generator.m4a",
        responseLabel: "...",
      },
      { id: "let_it_sink_in", text: "Chvíli tě nechal pochopit, co právě řekl.", responseLabel: "..." },
      {
        id: "not_out_of_town",
        text: "„Popravdě… nebyl jsem mimo město.“",
        audioSrc: "/object_13/story/segments/posledni_smena_not_out_of_town.m4a",
        responseLabel: "...",
      },
      {
        id: "you_bought_time",
        text: "„Ty jsi mi jen dal čas. Čas dokončit přípravy.“",
        audioSrc: "/object_13/story/segments/posledni_smena_you_bought_time.m4a",
        responseLabel: "Chápu.",
      },
      { id: "lights_on", text: "Za Hynkem se rozsvítily kontrolky.", responseLabel: "..." },
      {
        id: "maximum_fireworks",
        text: "„Za chvíli to zapneme na maximum. A připravíme opravdu velký ohňostroj.“",
        audioSrc: "/object_13/story/segments/posledni_smena_maximum_fireworks.m4a",
        responseLabel: "...",
      },
      { id: "opened_briefcase", text: "Podal ti otevřený kufřík s penězi.", responseLabel: "..." },
      {
        id: "your_pay_plus_bonus",
        text: "„Tohle je tvoje výplata. A něco navíc za mlčenlivost.“",
        audioSrc: "/object_13/story/segments/posledni_smena_your_pay_plus_bonus.m4a",
        responseLabel: "Beru.",
      },
      { id: "grew_serious", text: "Pak zvážněl.", responseLabel: "..." },
      {
        id: "thousand_monsters",
        text: "„Musíme pryč. Až to spustíme, přiláká to možná tisíc monster.“",
        audioSrc: "/object_13/story/segments/posledni_smena_thousand_monsters.m4a",
        responseLabel: "Utíkám.",
      },
      { id: "step_to_door", text: "Udělá krok ke dveřím.", responseLabel: "..." },
      {
        id: "project_ends",
        text: "„Celý projekt tímhle končí. Ty jsi svoji práci odvedl.“",
        audioSrc: "/object_13/story/segments/posledni_smena_project_ends.m4a",
        responseLabel: "...",
      },
      { id: "turned_back", text: "Ještě se otočil.", responseLabel: "..." },
      {
        id: "good_luck_warrior",
        text: "„Přeju ti všechno nejlepší v nové práci. A díky, válečníku.“",
        audioSrc: "/object_13/story/segments/posledni_smena_good_luck_warrior.m4a",
        responseLabel: "Sbohem.",
      },
    ],
  },
  // Hardcore Noc 30 BEZ zabití bestie v aktuálním runu (viz zadání "Night 30
  // no-kill ending", game/core/night30Ending.ts) — úvodní část "PRVNÍ
  // VÝPLATA", stejný klikací styl jako warrior_ending/valhala_ending výše
  // (na výslovnou žádost "a to druhý závěrečný taky"). Po dokončení
  // Night30EndingScreen.tsx přepne na druhou fázi (ztemnělá obrazovka,
  // úmrtní záznam), NE do menu. Namluvené jen Hynkovy repliky jako JEDEN
  // souvislý klip s mezerami mezi částmi (stejný vzor jako valhala_ending
  // výše — audioSrc jen na prvním segmentu).
  no_kill_ending: {
    id: "no_kill_ending",
    imageSrc: "/object_13/story/no_kill_ending.png",
    title: "PRVNÍ VÝPLATA",
    segments: [
      { id: "thirtieth_day", text: "Třicátý den.", responseLabel: "..." },
      {
        id: "hynek_before_dawn",
        text: "Hynek se objevil ve dveřích dřív, než stačil vyjít úsvit.",
        responseLabel: "...",
      },
      { id: "looked_you_over", text: "Chvíli si tě jen prohlížel.", responseLabel: "Čekám." },
      {
        id: "thirty_nights",
        text: "„Třicet nocí. Bez útěku. Bez hrdinství. Bez zbytečných otázek.“",
        audioSrc: "/object_13/story/segments/prvni_vyplata_thirty_nights.m4a",
        responseLabel: "...",
      },
      { id: "handed_envelope", text: "Podal ti obálku.", responseLabel: "..." },
      {
        id: "good_guard",
        text: "„Byl jsi dobrý hlídač.“",
        audioSrc: "/object_13/story/segments/prvni_vyplata_good_guard.m4a",
        responseLabel: "Díky.",
      },
      {
        id: "waited_for_truth",
        text: "Čekal jsi vysvětlení. Čekal jsi pravdu. Čekal jsi, že po třiceti nocích něco skončí.",
        responseLabel: "...",
      },
      { id: "lit_cigarette", text: "Hynek si jen zapálil cigaretu.", responseLabel: "..." },
      {
        id: "see_you_in_a_month",
        text: "„Tak se uvidíme zase za měsíc.“",
        audioSrc: "/object_13/story/segments/prvni_vyplata_see_you_in_a_month.m4a",
        responseLabel: "Zpátky ke stolu.",
      },
    ],
  },
};

/** Bezpečný přístup ke scéně — `null`, pokud by `id` neodpovídalo žádnému záznamu (dnes se to nemůže stát, `CinematicSceneId` je uzavřený union, ale CinematicScreen.tsx na tenhle fallback spoléhá). */
export function getCinematicScene(id: CinematicSceneId): CinematicScene | null {
  return CINEMATIC_SCENES[id] ?? null;
}
