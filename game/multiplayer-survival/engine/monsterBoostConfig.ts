// Konfigurace budoucí aktivní schopnosti monstra — krátký, cooldownem
// omezený "boost" rychlosti (viz zadání "Budoucí schopnosti hráčem
// ovládaného monstra"). Zatím NENÍ zapojená do AI ani do žádného budoucího
// player-monster controlleru — je to jen čistá konfigurační funkce
// připravená pro obojí (stejná mechanika pohybu/kolizí/boostu má sdílet
// jak současný AI controller, tak budoucí hráčem ovládané monstrum, lišit
// se má jen ZDROJ vstupů/rozhodnutí, ne konfigurace síly).
//
// Boost je natvrdo NEslučitelný se střelbou monstra — hráčem ovládané
// monstrum (budoucí asymetrický režim) nesmí mít přístup k `hasShotgun`/
// `ammo`/inventáři přeživších vůbec, útočí jen kontaktem nebo vlastními
// schopnostmi (boost je první z nich). Server MUSÍ zůstat autoritativní nad
// zahájením/délkou/cooldownem/max. rychlostí/kolizemi boostu i nad tímhle
// zákazem střelby — klient (ať hráč, nebo debug overlay) si sám nesmí
// rozhodnout, že boost běží nebo jakou má rychlost.

export interface MonsterBoostConfig {
  /** Násobič `speed` po dobu boostu (viz engine/config.ts#MULTIPLAYER_SURVIVAL_AI_CONFIG.chaseSpeed) — NE trvalé zvýšení, jen dokud běží `durationMs`. */
  speedMultiplier: number;
  /** Jak dlouho boost trvá, jednou aktivovaný. */
  durationMs: number;
  /** Jak dlouho musí uplynout od KONCE předchozího boostu, než se dá aktivovat znovu. */
  cooldownMs: number;
}

/** Slabý/vzácný boost na začátku kola — cíl je dát přeživším šanci se zorientovat, ne je hned tlačit. */
const BOOST_AT_ROUND_START: MonsterBoostConfig = {
  speedMultiplier: 1.15,
  durationMs: 1_000,
  cooldownMs: 22_000,
};

/** Silný/častý boost na konci kola — cíl je aktivně zabránit pasivnímu přečkávání do konce časovače (viz zadání). */
const BOOST_AT_ROUND_END: MonsterBoostConfig = {
  speedMultiplier: 1.6,
  durationMs: 2_500,
  cooldownMs: 6_000,
};

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * `roundProgress` — normalizovaný průběh kola, `0` = start, `1` = konec
 * (viz zadání `progress = 1 - remainingTime / roundDuration`, počítá si ho
 * volající ze `state.remainingMs`/délky kola, tahle funkce bere jen
 * výsledek, ať zůstane nezávislá na tom, odkud přesně `remainingMs` pochází).
 * Lineární interpolace mezi `BOOST_AT_ROUND_START` a `BOOST_AT_ROUND_END` —
 * nejjednodušší křivka, která splňuje "slabší/řidší na začátku, silnější/
 * častější na konci"; vstup mimo `[0,1]` se ořízne.
 */
export function getMonsterBoostConfig(roundProgress: number): MonsterBoostConfig {
  const progress = Math.min(1, Math.max(0, roundProgress));
  return {
    speedMultiplier: lerp(BOOST_AT_ROUND_START.speedMultiplier, BOOST_AT_ROUND_END.speedMultiplier, progress),
    durationMs: lerp(BOOST_AT_ROUND_START.durationMs, BOOST_AT_ROUND_END.durationMs, progress),
    cooldownMs: lerp(BOOST_AT_ROUND_START.cooldownMs, BOOST_AT_ROUND_END.cooldownMs, progress),
  };
}

/** `state.remainingMs` + délka kola → normalizovaný `roundProgress` pro `getMonsterBoostConfig` (viz zadání "odvozeno od zbývajícího času nebo normalizovaného průběhu"). */
export function computeRoundProgress(remainingMs: number, roundDurationMs: number): number {
  if (roundDurationMs <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remainingMs / roundDurationMs));
}
