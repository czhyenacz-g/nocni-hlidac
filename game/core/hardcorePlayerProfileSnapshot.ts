import { MonsterDefeatReward } from "./monsterDefeatReward";
import { PlayerProfileStats } from "./playerProfileStats";

// ── Serverový Hardcore profil (viz zadání "serverové ukládání profilu
// hlídače jen pro Hardcore", TECH_DESIGN.md "VPS API specifikace") ──
//
// Objekt 13 (tenhle repozitář) NEMÁ přímé DB připojení — stejný princip jako
// existující leaderboard (bestRun/currentRun, viz lib/leaderboard/*): volá
// se soukromé VPS API (mimo tenhle repozitář) přes lib/hubClient.ts, to
// teprve mluví s DB. Tenhle soubor je proto:
//   1. tvar dat (ServerHardcorePlayerProfile/HardcoreProfileSnapshot),
//   2. čistá REFERENČNÍ specifikace merge/validace, kterou musí implementovat
//      VPS strana (stejný "testovaná dokumentace, v nocni-hlidac se sama
//      nevykonává proti žádné databázi" vzor jako
//      lib/leaderboard/guardRunTransitions.ts#applySurviveNight/applyDeath),
//   3. konverzní funkce mezi server tvarem a lokálními typy pro UI
//      (ProfileScreen.tsx) a pro odesílaný sync payload
//      (app/play/page.tsx, lib/hardcoreProfile/hardcoreProfileRequestHandlers.ts).
//
// Server ukládá VÝHRADNĚ Hardcore hodnoty — žádné Normal pole tenhle soubor
// vůbec nezná (viz zadání "Normal se na server neukládá").
//
// Tvar tady je záměrně JEN těch 9 polí, která project-hub-api skutečně vrací
// (viz zadání "Srovnat ServerHardcorePlayerProfile typ a client mapping s
// reálným project-hub-api contractem", project-hub-api
// src/modules/nocniHlidac/hardcoreProfileService.ts). Dřívější verze tohohle
// typu navíc deklarovala `hardcoreTotalDeaths`/`hardcoreTotalRunsStarted`/
// `hardcoreTotalNightsSurvived`/`hardcoreMonsterHitsConfirmed`/
// `hardcoreMonsterKills` — server je NEUKLÁDÁ (zatím nejsou bezpečně
// mode-specific, viz project-hub-api report), takže by tu vždycky skončily
// jako `undefined` navzdory typu `number`. Až budou tyhle countery na
// serveru skutečně dostupné, přidat je zpátky sem je jednoduché — do té doby
// ale typ nesmí slibovat víc, než co endpoint reálně vrací.
export interface ServerHardcorePlayerProfile {
  discordUserId: string;
  displayName: string | null;
  avatarUrl: string | null;

  hardcoreHasDefeatedMonster: boolean;
  hardcoreDoubleBarrelUnlocked: boolean;
  hardcoreMonsterDefeatsCount: number;
  hardcoreBestNight: number;

  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

/**
 * Jen ta podmnožina polí, kterou klient smí poslat v POST .../sync requestu
 * — bez identity/timestamps (`discordUserId` vždy ze server-side session,
 * `createdAt`/`updatedAt`/`lastSeenAt` vždy nastavuje server, viz zadání
 * "Bezpečnost").
 */
export type HardcoreProfileSnapshot = Pick<
  ServerHardcorePlayerProfile,
  "hardcoreHasDefeatedMonster" | "hardcoreDoubleBarrelUnlocked" | "hardcoreMonsterDefeatsCount" | "hardcoreBestNight"
>;

export const DEFAULT_HARDCORE_PROFILE_SNAPSHOT: HardcoreProfileSnapshot = {
  hardcoreHasDefeatedMonster: false,
  hardcoreDoubleBarrelUnlocked: false,
  hardcoreMonsterDefeatsCount: 0,
  hardcoreBestNight: 0,
};

/** Výchozí profil pro hráče, který na VPS ještě nemá záznam (viz zadání "Pokud profil neexistuje, vytvoří default profil a vrátí ho"). */
export function createDefaultServerHardcoreProfile(identity: {
  discordUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  nowIso?: string;
}): ServerHardcorePlayerProfile {
  const now = identity.nowIso ?? new Date().toISOString();
  return {
    discordUserId: identity.discordUserId,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  };
}

// ── Validace/clamp (viz zadání "Validace"/"Clamp hodnot") ──
const BEST_NIGHT_MAX = 10_000;
const MONSTER_DEFEATS_MAX = 100_000;

/** Trusted numeric input (už víme, že je to number) — jen zaokrouhlí dolů a ořízne do [0, max]. Sdíleno sanitize (netrusted vstup) i merge (defense-in-depth, viz test "clampuje extrémní hodnoty"). */
function clampInt(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), max);
}

/** Netrusted vstup (JSON tělo requestu) — chybějící/špatný typ spadne na default. */
function clampFieldFromUnknown(value: unknown, max: number): number {
  return typeof value === "number" ? clampInt(value, max) : 0;
}

/**
 * Whitelist + validace + clamp NEDŮVĚRYHODNÉHO vstupu (viz zadání
 * "Bezpečnost"/"Validace") — volá se v Next.js API route handleru PŘED
 * odesláním na VPS (viz lib/hardcoreProfile/hardcoreProfileRequestHandlers.ts),
 * ať server nikdy nepředá dál nečíselné/záporné/obří/neznámá pole. Neznámá
 * pole (včetně "Normal-like" polí bez "hardcore" prefixu, např. by se
 * omylem poslalo `totalDeaths`) se TIŠE IGNORUJÍ — jen čtyři jmenované
 * `Hardcore*` klíče se vůbec čtou, cokoliv jiného ve vstupu se prostě
 * nezkopíruje nikam dál.
 */
export function sanitizeHardcoreProfileSnapshot(raw: unknown): HardcoreProfileSnapshot {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT };
  const input = raw as Record<string, unknown>;

  return {
    hardcoreHasDefeatedMonster: typeof input.hardcoreHasDefeatedMonster === "boolean" ? input.hardcoreHasDefeatedMonster : false,
    hardcoreDoubleBarrelUnlocked: typeof input.hardcoreDoubleBarrelUnlocked === "boolean" ? input.hardcoreDoubleBarrelUnlocked : false,
    hardcoreMonsterDefeatsCount: clampFieldFromUnknown(input.hardcoreMonsterDefeatsCount, MONSTER_DEFEATS_MAX),
    hardcoreBestNight: clampFieldFromUnknown(input.hardcoreBestNight, BEST_NIGHT_MAX),
  };
}

/**
 * Referenční specifikace merge pravidel pro POST /nocni-hlidac/hardcore-profile/sync
 * (viz zadání "Pravidla merge") — SKUTEČNĚ by se měla vykonávat na VPS
 * straně (stejný "testovaná dokumentace, v nocni-hlidac se nevykonává" vzor
 * jako lib/leaderboard/guardRunTransitions.ts). Next.js route handler v
 * tomhle repozitáři jen validuje/clampuje vstup (viz
 * sanitizeHardcoreProfileSnapshot) a přeposílá ho na VPS — merge samotný dělá
 * VPS, protože jen ono zná AKTUÁLNÍ serverovou hodnotu (Next.js appka žádnou
 * databázi nevidí).
 *
 * Boolean reward hodnoty se slučují přes OR (jakmile je jednou `true`,
 * zůstává `true` navždy). Countery přes `max`, NIKDY součet — opakovaný sync
 * téhož lokálního snapshotu by jinak zdvojoval počítadla (viz zadání
 * "Důvod: Nechceme při opakovaném syncu zdvojovat počítadla"). Výsledek se
 * navíc znovu clampuje (defense-in-depth, kdyby `server`/`local` samo o sobě
 * neprošlo sanitizací).
 */
export function mergeHardcoreProfileSnapshot(
  server: ServerHardcorePlayerProfile,
  local: HardcoreProfileSnapshot,
  nowIso: string = new Date().toISOString(),
): ServerHardcorePlayerProfile {
  return {
    ...server,
    hardcoreHasDefeatedMonster: server.hardcoreHasDefeatedMonster || local.hardcoreHasDefeatedMonster,
    hardcoreDoubleBarrelUnlocked: server.hardcoreDoubleBarrelUnlocked || local.hardcoreDoubleBarrelUnlocked,
    hardcoreMonsterDefeatsCount: clampInt(
      Math.max(server.hardcoreMonsterDefeatsCount, clampInt(local.hardcoreMonsterDefeatsCount, MONSTER_DEFEATS_MAX)),
      MONSTER_DEFEATS_MAX,
    ),
    hardcoreBestNight: clampInt(Math.max(server.hardcoreBestNight, clampInt(local.hardcoreBestNight, BEST_NIGHT_MAX)), BEST_NIGHT_MAX),
    updatedAt: nowIso,
    lastSeenAt: nowIso,
  };
}

// ── Konverze server -> lokální typy (viz ProfileScreen.tsx) ──

/** Server reward pole -> lokální MonsterDefeatReward tvar (pro UI/achievementy, viz game/core/playerAchievements.ts). */
export function serverHardcoreProfileToReward(server: ServerHardcorePlayerProfile): MonsterDefeatReward {
  return {
    hasDefeatedMonster: server.hardcoreHasDefeatedMonster,
    doubleBarrelUnlocked: server.hardcoreDoubleBarrelUnlocked,
    monsterDefeatsCount: server.hardcoreMonsterDefeatsCount,
  };
}

/**
 * Server (project-hub-api) dnes vrací JEN `hardcoreBestNight` a
 * `hardcoreMonsterDefeatsCount` (viz `ServerHardcorePlayerProfile` výše) —
 * `totalDeaths`/`totalRunsStarted`/`totalNightsSurvived`/`monsterHitsConfirmed`
 * NEMAJÍ žádný server ekvivalent (zatím nejsou bezpečně mode-specific, viz
 * project-hub-api report), takže se pro ně použije `localStats` beze změny
 * (stejná lokální, mode-agnostic hodnota, jakou by ProfileScreen.tsx
 * zobrazil i bez serveru) — NIKDY `undefined`/natvrdo `0`, jen "server tohle
 * pole nezná, ber lokální". `monsterKills` (stat dlaždice "Zabité bestie")
 * nemá vlastní server pole buď — bezpečně se dá znovupoužít
 * `hardcoreMonsterDefeatsCount` (stejný koncept, "kolikrát jsi porazil
 * bestii", jen jiné jméno pole na dvou různých místech UI). Jediná hodnota,
 * kterou tenhle převod skutečně PŘEPÍŠE oproti `localStats`, je tedy
 * `hardcoreBestNight` a `monsterKills` — zbytek jde beze změny skrz.
 * NEPOUŽÍVAT tenhle výstup jako "kompletní stats hráče" pro obecné UI — jen
 * pro Hardcore/reward achievementy (viz ProfileScreen.tsx, zadání "použij je
 * pouze pro Hardcore/reward achievementy").
 */
export function serverHardcoreProfileToPlayerProfileStats(
  server: ServerHardcorePlayerProfile,
  localStats: PlayerProfileStats,
): PlayerProfileStats {
  return {
    ...localStats,
    hardcoreBestNight: server.hardcoreBestNight,
    monsterKills: server.hardcoreMonsterDefeatsCount,
  };
}

/**
 * Staví odchozí sync payload z lokálního stavu — volá se VÝHRADNĚ, když
 * `state.gameMode === "hardcore"` (viz zadání "Napojení true-ending reward",
 * app/play/page.tsx#handleMonsterDefeatedCinematicComplete). `stats.hardcoreBestNight`
 * je už dnes bezpečně Hardcore-only (viz playerProfileStats.ts#recordNightSurvived),
 * proto se posílá přímo. `hardcoreMonsterProgress` je izolovaný Hardcore-only
 * lokální počítadlo (viz getLocalHardcoreMonsterProgress níže) — NIKDY
 * game/core/monsterDefeatReward.ts (ten zůstává mode-agnostic napříč Normal
 * i Hardcore, viz zadání "neměň ho na velký mode-specific systém"). Server
 * (project-hub-api) dnes žádné jiné pole nepřijímá/neukládá (viz
 * `HardcoreProfileSnapshot`) — dřívější `hardcoreTotalDeaths`/
 * `hardcoreTotalRunsStarted`/`hardcoreTotalNightsSurvived`/
 * `hardcoreMonsterHitsConfirmed`/`hardcoreMonsterKills` pole tenhle payload
 * už neposílá vůbec (dřív se posílaly jako `0`, teď na typu ani neexistují).
 */
export function createHardcoreProfileSnapshotFromLocalState(
  stats: PlayerProfileStats,
  hardcoreMonsterProgress: LocalHardcoreMonsterProgress,
): HardcoreProfileSnapshot {
  return {
    hardcoreHasDefeatedMonster: hardcoreMonsterProgress.hasDefeatedMonster,
    hardcoreDoubleBarrelUnlocked: hardcoreMonsterProgress.doubleBarrelUnlocked,
    hardcoreMonsterDefeatsCount: hardcoreMonsterProgress.monsterDefeatsCount,
    hardcoreBestNight: stats.hardcoreBestNight,
  };
}

// ── Lokální Hardcore-only "porazil jsi bestii v Hardcore" počítadlo ──
//
// Izolované od game/core/monsterDefeatReward.ts (ten zůstává mode-agnostic
// napříč Normal i Hardcore, viz zadání "pokud současný monsterDefeatReward.ts
// má globální doubleBarrelUnlocked, neměň ho v tomto úkolu na velký
// mode-specific systém bez nutnosti") — tenhle je minimální přídavek jen
// proto, aby šel Hardcore server sync bezpečně naplnit BEZ rizika, že se do
// serverového Hardcore počítadla propašuje Normal aktivita (viz zadání
// "Pokud je potřeba přidat lokální Hardcore-only reward helper, přidej ho
// izolovaně a jasně pojmenuj"). Zvyšuje se VÝHRADNĚ z
// app/play/page.tsx#handleMonsterDefeatedCinematicComplete, jen když
// `state.gameMode === "hardcore"` — Normal true ending na tenhle counter
// nikdy nesáhne. Stejný localStorage vzor jako monsterDefeatReward.ts.
const HARDCORE_MONSTER_PROGRESS_STORAGE_KEY = "nocni-hlidac:object13:hardcore-monster-progress";

export interface LocalHardcoreMonsterProgress {
  hasDefeatedMonster: boolean;
  doubleBarrelUnlocked: boolean;
  monsterDefeatsCount: number;
}

function createDefaultLocalHardcoreMonsterProgress(): LocalHardcoreMonsterProgress {
  return { hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 };
}

function isValidLocalHardcoreMonsterProgress(value: unknown): value is LocalHardcoreMonsterProgress {
  if (typeof value !== "object" || value === null) return false;
  const { hasDefeatedMonster, doubleBarrelUnlocked, monsterDefeatsCount } = value as Record<string, unknown>;
  return (
    typeof hasDefeatedMonster === "boolean" && typeof doubleBarrelUnlocked === "boolean" && typeof monsterDefeatsCount === "number"
  );
}

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí výchozí (nic odemčené) stav, hra nespadne. */
export function getLocalHardcoreMonsterProgress(): LocalHardcoreMonsterProgress {
  if (typeof window === "undefined") return createDefaultLocalHardcoreMonsterProgress();
  try {
    const raw = window.localStorage.getItem(HARDCORE_MONSTER_PROGRESS_STORAGE_KEY);
    if (raw === null) return createDefaultLocalHardcoreMonsterProgress();
    const parsed: unknown = JSON.parse(raw);
    return isValidLocalHardcoreMonsterProgress(parsed) ? parsed : createDefaultLocalHardcoreMonsterProgress();
  } catch {
    return createDefaultLocalHardcoreMonsterProgress();
  }
}

/** Volat PŘESNĚ jednou za dokončený HARDCORE true ending — NIKDY pro Normal (viz app/play/page.tsx). */
export function recordLocalHardcoreMonsterDefeat(): LocalHardcoreMonsterProgress {
  const current = getLocalHardcoreMonsterProgress();
  const next: LocalHardcoreMonsterProgress = {
    hasDefeatedMonster: true,
    doubleBarrelUnlocked: true,
    monsterDefeatsCount: current.monsterDefeatsCount + 1,
  };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(HARDCORE_MONSTER_PROGRESS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return current;
  }
}
