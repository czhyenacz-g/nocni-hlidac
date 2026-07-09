import { GameMode } from "./gameMode";

// Trvalé statistiky hlídače pro budoucí profil/účet (viz zadání "profil
// hlídače", app/profile/page.tsx) — čistě lokální localStorage, stejný vzor
// jako deathCount.ts/bulbInventory.ts/monsterDefeatReward.ts, žádný
// backend/login/databáze. Server persistence se má řešit později (viz
// report) — tenhle modul je jen první verze, napojená na existující herní
// eventy, kde je to bezpečné bez velkého refactoru.
const PLAYER_PROFILE_STATS_STORAGE_KEY = "nocni-hlidac:object13:player-profile-stats";

export type PlayerProfileStats = {
  totalDeaths: number;
  totalRunsStarted: number;
  totalNightsSurvived: number;
  hardcoreBestNight: number;
  bulbsReplaced: number;
  generatorsRestarted: number;
  expeditionsStarted: number;
  expeditionsReturned: number;
  monsterHitsConfirmed: number;
  monsterKills: number;
};

const DEFAULT_PLAYER_PROFILE_STATS: PlayerProfileStats = {
  totalDeaths: 0,
  totalRunsStarted: 0,
  totalNightsSurvived: 0,
  hardcoreBestNight: 0,
  bulbsReplaced: 0,
  generatorsRestarted: 0,
  expeditionsStarted: 0,
  expeditionsReturned: 0,
  monsterHitsConfirmed: 0,
  monsterKills: 0,
};

function createDefaultPlayerProfileStats(): PlayerProfileStats {
  return { ...DEFAULT_PLAYER_PROFILE_STATS };
}

/**
 * Doplní chybějící/neplatná pole výchozí hodnotou místo zahození celého
 * záznamu — na rozdíl od modulů s `isValidX(value): value is X` (např.
 * monsterDefeatReward.ts), tenhle model se má do budoucna rozšiřovat o další
 * statistiky (viz zadání "musí umět doplnit chybějící hodnoty při budoucím
 * rozšíření modelu"), takže starý uložený záznam bez nových klíčů musí
 * zůstat čitelný, ne spadnout na kompletní default.
 */
function normalizePlayerProfileStats(value: unknown): PlayerProfileStats {
  if (typeof value !== "object" || value === null) return createDefaultPlayerProfileStats();
  const raw = value as Record<string, unknown>;
  const normalized = createDefaultPlayerProfileStats();
  for (const key of Object.keys(DEFAULT_PLAYER_PROFILE_STATS) as (keyof PlayerProfileStats)[]) {
    const rawValue = raw[key];
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[key] = rawValue;
    }
  }
  return normalized;
}

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí default, hra nespadne. */
export function getPlayerProfileStats(): PlayerProfileStats {
  if (typeof window === "undefined") return createDefaultPlayerProfileStats();
  try {
    const raw = window.localStorage.getItem(PLAYER_PROFILE_STATS_STORAGE_KEY);
    if (raw === null) return createDefaultPlayerProfileStats();
    const parsed: unknown = JSON.parse(raw);
    return normalizePlayerProfileStats(parsed);
  } catch {
    return createDefaultPlayerProfileStats();
  }
}

/** Uloží kompletní záznam beze změny — volající si sestaví celý objekt (viz incrementPlayerProfileStat/record* helpery níže). Chyba zápisu (plný/zakázaný localStorage) hru nesmí shodit, jen se tiše ignoruje. */
export function savePlayerProfileStats(stats: PlayerProfileStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAYER_PROFILE_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignoruj — i kdyby se nepovedlo zapsat, hra nesmí spadnout.
  }
}

/** Vrátí statistiky zpátky na výchozí hodnoty (viz app/profile/page.tsx "Resetovat lokální profil"). */
export function resetPlayerProfileStats(): PlayerProfileStats {
  const defaults = createDefaultPlayerProfileStats();
  savePlayerProfileStats(defaults);
  return defaults;
}

/** Obecný "přičti k jedné statistice" helper — všechny record* funkce níže ho používají, ať existuje jen jedno místo, které čte/upravuje/ukládá záznam. */
export function incrementPlayerProfileStat(key: keyof PlayerProfileStats, amount = 1): PlayerProfileStats {
  const current = getPlayerProfileStats();
  const next: PlayerProfileStats = { ...current, [key]: current[key] + amount };
  savePlayerProfileStats(next);
  return next;
}

/** Volat při START_SHIFT (nový run z menu) — viz app/play/page.tsx#handleBeginShift. */
export function recordRunStarted(): PlayerProfileStats {
  return incrementPlayerProfileStat("totalRunsStarted");
}

/**
 * Volat při KAŽDÉ skutečné smrti hráče (screen -> "death", mimo první noc
 * near-miss, který smrt vůbec není) — v Normal s více životy se počítá
 * každá jednotlivá smrt, ne jen konec celého runu (viz zadání), stejné
 * místo/podmínka jako existující deathCount.ts#incrementDeathCount.
 */
export function recordDeath(): PlayerProfileStats {
  return incrementPlayerProfileStat("totalDeaths");
}

/**
 * Volat při přechodu na "win" (přežitá noc). `hardcoreBestNight` se
 * aktualizuje jen směrem nahoru (Math.max) a jen pro gameMode "hardcore" —
 * Normal night číslo nikdy neovlivní.
 */
export function recordNightSurvived(gameMode: GameMode, night: number): PlayerProfileStats {
  const current = getPlayerProfileStats();
  const next: PlayerProfileStats = {
    ...current,
    totalNightsSurvived: current.totalNightsSurvived + 1,
    hardcoreBestNight: gameMode === "hardcore" ? Math.max(current.hardcoreBestNight, night) : current.hardcoreBestNight,
  };
  savePlayerProfileStats(next);
  return next;
}

/** Volat po úspěšné (dokončené) výměně žárovky — viz app/play/page.tsx#bulbReplaceSuccessSeq efekt. Ne po pokusu bez žárovky na skladě. */
export function recordBulbReplaced(): PlayerProfileStats {
  return incrementPlayerProfileStat("bulbsReplaced");
}

/** Volat po úspěšném restartu SKUTEČNĚ vadného generátoru — ne po zbytečném/omylem kliknutém restartu funkčního generátoru (viz gameReducer.ts RESTART_GENERATOR "accidental" větev). */
export function recordGeneratorRestarted(): PlayerProfileStats {
  return incrementPlayerProfileStat("generatorsRestarted");
}

/** Volat při skutečném spuštění EmergencyMiniGame (viz app/play/page.tsx#shouldLaunchEmergencyMiniGame efekt). */
export function recordExpeditionStarted(): PlayerProfileStats {
  return incrementPlayerProfileStat("expeditionsStarted");
}

/** Volat jen při outcome "returned" (bezpečný návrat) — nikdy při "dead"/"failed", viz handleEmergencyMiniGameComplete. */
export function recordExpeditionReturned(): PlayerProfileStats {
  return incrementPlayerProfileStat("expeditionsReturned");
}

/** Volat při CONFIRM_MONSTER_HIT s aktuálním počtem potvrzovaných zásahů (viz GameState.pendingMonsterHits) — ne pevně +1, ať sedí i pro budoucí dvouhlavňovkové vícenásobné potvrzení. */
export function recordMonsterHitsConfirmed(hitCount: number): PlayerProfileStats {
  if (hitCount <= 0) return getPlayerProfileStats();
  return incrementPlayerProfileStat("monsterHitsConfirmed", hitCount);
}

/** Volat přesně jednou za dokončený true ending (viz MonsterDefeatedScreen.tsx#onCinematicComplete) — stejné volací místo jako game/core/monsterDefeatReward.ts#recordMonsterDefeat, ať obě hodnoty zůstanou v zákrytu. */
export function recordMonsterKill(): PlayerProfileStats {
  return incrementPlayerProfileStat("monsterKills");
}
