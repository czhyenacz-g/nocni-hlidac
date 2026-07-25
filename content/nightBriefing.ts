// Který klíč briefingu použít pro danou noc (viz zadání "i18n dosud chyběla
// u nočních briefingů", BriefingScreen.tsx, content/copy.ts#nightBriefing) —
// čistě obsahové rozhodnutí "která noc má vlastní text", ne herní pravidlo
// (viz CLAUDE.md "content/loadingHints.ts#selectLoadingHints... obsahové
// rozhodnutí, ne herní pravidlo" — stejný vzor). Herní pravidla (které
// mechaniky jsou tuhle noc zapnuté) zůstávají v game/difficulty/nightConfig.ts
// beze změny — tenhle soubor zná jen ČÍSLO noci, ne NightFeatureFlags.

export type NightBriefingKey = "night1" | "night2" | "night3" | "night4" | "night6" | "fallback";

/**
 * Noc 5 je Titanovo pevné první setkání (viz TITAN_FIRST_ENCOUNTER_NIGHT v
 * game/core/titanEncounterNights.ts) — hráč se to dozví přímo v encounteru
 * (Titanova vlastní "escape" rádiová hláška), ne v předsměnovém briefingu,
 * proto spadá (spolu s nocí 7+) do `fallback`.
 */
export function resolveNightBriefingKey(nightNumber: number): NightBriefingKey {
  switch (nightNumber) {
    case 1:
      return "night1";
    case 2:
      return "night2";
    case 3:
      return "night3";
    case 4:
      return "night4";
    case 6:
      return "night6";
    default:
      return "fallback";
  }
}
