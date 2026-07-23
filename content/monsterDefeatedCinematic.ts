// Timed-caption cinematic pro true ending (viz zadání, game/core/monsterEnding.ts,
// components/screens/MonsterDefeatedScreen.tsx) — NA ROZDÍL OD content/cinematics.ts
// (klikací segmenty, každý s vlastním krátkým audio klipem) je tohle JEDEN
// dlouhý namluvený track (`dead_monster_1.m4a`) s titulky časovanými proti
// jeho přehrávání (`atMs`), ne proti kliknutí hráče. Menší datový model
// (jen text + atMs), žádné responseLabel/audioSrc per-segment.

export interface TimedCaption {
  /** Klíč do content/copy.ts#monsterDefeatedCinematicCaptions (jazykově nezávislý, viz i18n) — samotný text titulku žije tam, tady jen timing. */
  id: string;
  /** Kdy (ms od startu přehrávání) se má tenhle titulek zobrazit — poslední caption s `atMs <= currentMs` je ta aktivní, viz resolveActiveCaptionIndex. */
  atMs: number;
}

export const MONSTER_DEFEATED_CINEMATIC_AUDIO_SRC = "/object_13/story/dead_monster_1.m4a";

// Celková délka `dead_monster_1.m4a` (ověřeno ffprobe, zaokrouhleno na celé
// ms) — použije se jako bezpečnostní fallback (setTimeout), kdyby se audio
// z nějakého důvodu nepřehrálo/nezavolalo "ended" (chybějící soubor,
// autoplay blokovaný prohlížečem apod.), ať cinematic nikdy nezůstane
// zaseknutý (stejný princip jako CinematicScreen.tsx "chybějící soubor
// nesmí zaseknout scénu").
export const MONSTER_DEFEATED_CINEMATIC_DURATION_MS = 37_480;

// POZOR: `atMs` jsou jen HRUBÝ odhad (proporcionálně podle délky textu vůči
// celkové délce nahrávky), NE ověřené poslechem — Claude neumí přehrát/
// analyzovat obsah audio souboru. Hynek by měl časování doladit podle sluchu
// (viz report). Texty jsou přesně podle zadání, jen s opravou pravopisu
// ("Věřmi" -> "Věř mi").
export const MONSTER_DEFEATED_CINEMATIC_CAPTIONS: TimedCaption[] = [
  { id: "congrats_not_a_rookie", atMs: 0 },
  { id: "warrior_spirit", atMs: 5300 },
  { id: "not_first_not_last", atMs: 8950 },
  { id: "more_will_come", atMs: 15_900 },
  { id: "reward_for_you", atMs: 17_800 },
  { id: "left_on_office_wall", atMs: 21_400 },
  { id: "want_to_know_truth", atMs: 26_300 },
  { id: "meet_on_day_30", atMs: 30_650 },
  { id: "or_in_valhalla", atMs: 35_000 },
];

/**
 * Index titulku aktivního v `elapsedMs` (poslední, jehož `atMs <= elapsedMs`)
 * — čistá funkce, žádný DOM/Audio element, snadno testovatelná bez
 * component testů (repo zatím nemá jsdom/testing-library, viz ostatní testy
 * v tomhle projektu — jen pure-function unit testy). `null` před prvním
 * titulkem (nemělo by nastat, první `atMs` je vždy 0, ale bezpečné i kdyby
 * se to v budoucnu změnilo).
 */
export function resolveActiveCaptionIndex(captions: TimedCaption[], elapsedMs: number): number | null {
  let activeIndex: number | null = null;
  for (let i = 0; i < captions.length; i++) {
    if (captions[i].atMs <= elapsedMs) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
}
