// Timed-caption cinematic pro true ending (viz zadání, game/core/monsterEnding.ts,
// components/screens/MonsterDefeatedScreen.tsx) — NA ROZDÍL OD content/cinematics.ts
// (klikací segmenty, každý s vlastním krátkým audio klipem) je tohle JEDEN
// dlouhý namluvený track (`dead_monster_1.m4a`) s titulky časovanými proti
// jeho přehrávání (`atMs`), ne proti kliknutí hráče. Menší datový model
// (jen text + atMs), žádné responseLabel/audioSrc per-segment.

export interface TimedCaption {
  text: string;
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
  { text: "Blahopřeji a uznávám, že už nejsi ucho!", atMs: 0 },
  { text: "Máš v sobě ducha bojovníka.", atMs: 5300 },
  { text: "Věř mi ale, že ta bestie nebyla první, ani poslední.", atMs: 8950 },
  { text: "Přijdou další.", atMs: 15_900 },
  { text: "Za odměnu pro tebe něco mám.", atMs: 17_800 },
  { text: "Dal jsem ti to na stěnu v kanceláři.", atMs: 21_400 },
  { text: "Chceš vědět, o čem to reálně je?", atMs: 26_300 },
  { text: "Potkáme se až nastane 30. den...", atMs: 30_650 },
  { text: "...nebo ve Valhale.", atMs: 35_000 },
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
