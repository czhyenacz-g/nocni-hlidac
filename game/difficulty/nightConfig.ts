// Konfigurace jednotlivých nocí v řadě (currentNight = survivedNights + 1,
// viz game/core/survivedNights.ts — stejný zdroj čísla noci jako HUD a
// game/difficulty/nightScaling.ts). Na rozdíl od nightScaling.ts (plynulé
// škálování energy drainu) tohle je: (1) krátký briefing, vnitřní monolog
// hlídače před směnou, (2) které mechaniky jsou tuhle noc vůbec zapnuté.
// Nezávislé na Difficulty (easy/medium/hard) — ta říká, jaký je zvolený
// režim hry, tohle říká, co už hráč tuhle noc vůbec potkává.

export interface NightFeatureFlags {
  generatorFaultsEnabled: boolean;
  bulbLifetimeEnabled: boolean;
  bulbReplacementEnabled: boolean;
  monsterRetreatVerificationEnabled: boolean;
  /**
   * Jestli je "Jít ven" (EmergencyMiniGame z left_wall, viz
   * app/play/page.tsx#handleStartEmergencyRun) tuhle noc vůbec dostupné —
   * zastřešující flag nad konkrétními výpravami (batteryRunEnabled níže).
   * ZATÍM true pro všechny noci (vývoj/ruční testování) — zamýšlený budoucí
   * stav je noc 1–4 false, noc 5+ true (viz getNightConfig komentář — noc 5
   * je i práh, kde energyDrainMultiplier v nightScaling.ts poprvé udělá
   * skok, ×1.15 → ×1.25, ne jen 1–4 free-hodinu), ale dokud neexistuje víc
   * než jedna výprava, nemá smysl to už teď takhle omezovat v produkčním
   * defaultu.
   */
  emergencyRunsEnabled: boolean;
  /** Konkrétní výprava "jít ven pro baterii" — vyžaduje i emergencyRunsEnabled (viz canStartBatteryEmergencyRun v game/core/emergencyMiniGameIntegration.ts). ZATÍM true pro všechny noci, zamýšlený budoucí stav noc 5+. */
  batteryRunEnabled: boolean;
  /** Připraveno pro budoucí výpravu "jít pro žárovky" — v /play zatím žádná bulb run mise neexistuje, proto false, ať se nezobrazuje nic, co by nešlo spustit. */
  bulbRunEnabled: boolean;
}

export const DEFAULT_NIGHT_FEATURES: NightFeatureFlags = {
  generatorFaultsEnabled: true,
  bulbLifetimeEnabled: true,
  bulbReplacementEnabled: true,
  monsterRetreatVerificationEnabled: true,
  emergencyRunsEnabled: true,
  batteryRunEnabled: true,
  bulbRunEnabled: false,
};

export interface NightBriefing {
  title: string;
  lines: string[];
}

export interface NightConfig {
  nightNumber: number;
  briefing: NightBriefing;
  /** Jen částečné — chybějící klíče doplní DEFAULT_NIGHT_FEATURES, viz getNightConfig. */
  features?: Partial<NightFeatureFlags>;
}

export interface ResolvedNightConfig {
  nightNumber: number;
  briefing: NightBriefing;
  features: NightFeatureFlags;
}

// Zamýšlené budoucí odemykání "Jít ven" podle noci (NENÍ zatím nastavené —
// emergencyRunsEnabled/batteryRunEnabled jsou v DEFAULT_NIGHT_FEATURES obě
// `true` pro všechny noci kvůli vývoji/ručnímu testování):
//   noc 1–4:  emergencyRunsEnabled: false, batteryRunEnabled: false
//   noc 5+:   emergencyRunsEnabled: true, batteryRunEnabled: true
//   noc 7+:   bulbRunEnabled: true (až bude v /play existovat bulb run mise)
// Noc 5 není náhoda — od tamtud energyDrainMultiplier (game/difficulty/nightScaling.ts)
// poprvé skáče víc než o 5 % (×1.15 → ×1.25), takže nouzová obchůzka/baterie
// začne dávat smysl přesně tam, kde spotřeba energie přestane být mírná.
// Až se tohle zapne doopravdy, půjde jednoduše přidat
// `features: { emergencyRunsEnabled: false, batteryRunEnabled: false }` do
// NIGHT_CONFIGS záznamů pro noci 1–4 (stejný vzor jako generatorFaultsEnabled výše).

// Briefingy jsou vnitřní monolog hlídače, ne firemní oznámení ani tutorial —
// žádné "od této noci se zapíná generátor", jen to, co by si sám pro sebe
// říkal před směnou (viz GAME_DESIGN.md).
const NIGHT_CONFIGS: NightConfig[] = [
  {
    nightNumber: 1,
    briefing: {
      title: "Noc 1",
      lines: ["První směna.", "Stačí vydržet do rána."],
    },
    features: {
      generatorFaultsEnabled: false,
      bulbLifetimeEnabled: false,
      monsterRetreatVerificationEnabled: false,
    },
  },
  {
    nightNumber: 2,
    briefing: {
      title: "Noc 2",
      lines: ["Viděl jsem to na kameře.", "Jen tak tak jsem stihl zavřít dveře.", "Žárovka u nich svítí nějak slabě..."],
    },
    features: {
      generatorFaultsEnabled: false,
      monsterRetreatVerificationEnabled: false,
    },
  },
  {
    nightNumber: 3,
    briefing: {
      title: "Noc 3",
      lines: ["Generátor včera ztichl.", "Nejhorší zvuk v mém životě."],
    },
    features: {
      monsterRetreatVerificationEnabled: false,
    },
  },
  {
    nightNumber: 4,
    briefing: {
      title: "Noc 4",
      lines: ["Na kameře nebylo nic vidět.", "Do dveří stejně něco udeřilo."],
    },
    // Beze změn features — od tuhle noci je všechno zapnuté jako dnes.
  },
];

// Noci 5+ (bez vlastního záznamu v NIGHT_CONFIGS výše) dostanou tenhle
// fallback — noci 5–10 i 11+ mají záměrně stejný text (viz zadání).
const FALLBACK_BRIEFING_LINES: string[] = ["Služby jsou čím dál horší.", "Tohle místo se rozpadá."];

/**
 * Vrací kompletní config pro danou noc — nikdy `undefined` hodnoty ve
 * features (chybějící klíče se vždy doplní z DEFAULT_NIGHT_FEATURES).
 * Neplatné/nesmyslné číslo (< 1, NaN, ...) se bezpečně bere jako noc 1,
 * stejná konvence jako computeNightScaling. Nedefinovaná noc (typicky 6+)
 * dostane fallback briefing + čistě DEFAULT_NIGHT_FEATURES.
 */
export function getNightConfig(nightNumber: number): ResolvedNightConfig {
  const safeNightNumber = Number.isFinite(nightNumber) && nightNumber >= 1 ? Math.floor(nightNumber) : 1;
  const entry = NIGHT_CONFIGS.find((config) => config.nightNumber === safeNightNumber);

  return {
    nightNumber: safeNightNumber,
    briefing: entry?.briefing ?? { title: `Noc ${safeNightNumber}`, lines: FALLBACK_BRIEFING_LINES },
    features: { ...DEFAULT_NIGHT_FEATURES, ...entry?.features },
  };
}
