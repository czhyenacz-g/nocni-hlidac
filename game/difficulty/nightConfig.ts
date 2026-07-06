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
}

export const DEFAULT_NIGHT_FEATURES: NightFeatureFlags = {
  generatorFaultsEnabled: true,
  bulbLifetimeEnabled: true,
  bulbReplacementEnabled: true,
  monsterRetreatVerificationEnabled: true,
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

// Briefingy jsou vnitřní monolog hlídače, ne firemní oznámení ani tutorial —
// žádné "od této noci se zapíná generátor", jen to, co by si sám pro sebe
// říkal před směnou (viz GAME_DESIGN.md).
const NIGHT_CONFIGS: NightConfig[] = [
  {
    nightNumber: 1,
    briefing: {
      title: "Noc 1",
      lines: ["První směna.", "Kamery fungují. Dveře taky.", "Stačí vydržet do rána."],
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
      lines: ["Ta žárovka u dveří svítí nějak slabě.", "Možná ji šetřit.", "Možná na ni nespoléhat."],
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
      lines: ["Včera něco luplo v generátoru.", "Pak se to zase rozběhlo.", "Doufám, že se to nebude opakovat."],
    },
    features: {
      monsterRetreatVerificationEnabled: false,
    },
  },
  {
    nightNumber: 4,
    briefing: {
      title: "Noc 4",
      lines: [
        "Když zmizí z kamery, neznamená to, že odešlo.",
        "To už jsem pochopil.",
        "Dneska si to radši ověřím.",
      ],
    },
    // Beze změn features — od tuhle noci je všechno zapnuté jako dnes.
  },
  {
    nightNumber: 5,
    briefing: {
      title: "Noc 5",
      lines: ["Našel jsem plánek objektu.", "Levá hala. Pravá hala. Sklad.", "Nechci tam chodit."],
    },
  },
];

const FALLBACK_BRIEFING_LINES: string[] = ["Další směna.", "Méně světla. Méně klidu.", "Stejný úkol: vydržet do rána."];

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
