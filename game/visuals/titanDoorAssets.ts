// Titanovy dveřní assety (viz zadání "napoj kompletní dveřní vizuální
// sekvenci Titana z existujících assetů") — analogické místo k
// BACKGROUND_SCENES.door v backgroundImages.ts, ale VLASTNÍ soubor, ne
// zásah do sdíleného/generického registru: dveřní vizuál dnes běží nezávisle
// na aktivním monstru (viz DoorView.tsx komentář "doorDestroyed a
// doorGeneratorOverloadActive"), Titan sem přidává PRVNÍ monstrum-specifické
// odchylky. Titan zatím nemá vlastní MonsterDefinition/MonsterPresentation
// (viz zadání "použij state.night.enemy.id === 'titan', nevytvářej nové
// pole") — tenhle soubor proto žije mimo game/enemies/monsterPresentation.ts,
// čistě jako datová sada cest + jedna deterministická výběrová funkce, ne
// jako součást formální monster-presentation architektury.
//
// Zdrojové PNG (public/object_13/monster/titan/*.png) zůstávají beze změny —
// tady jsou jen WebP cesty použité ve hře (cwebp -q 87, viz report).

const TITAN_DOOR_PATH = "/object_13/monster/titan";

export const TITAN_DOOR_ASSETS = {
  /**
   * Titan probourávající se dveřmi zvenku — 3 snímky. Index 0 = `at_door`,
   * index 2 = `breach` (viz zadání). Index 1 (`breakthrough_1.webp`) se
   * zatím NEPOUŽÍVÁ v hlavním flow (jiný poměr stran než zbytek sady —
   * 1536×1024 vs. 1672×941 — `DoorSceneFrame`'s `object-contain` by ho
   * vykreslil s viditelnými pruhy po stranách, nekonzistentně se zbytkem).
   * Zkonvertovaný a v registru PŘIPRAVENÝ pro budoucí použití, jen aktivně
   * nenapojený.
   */
  breakthrough: [
    `${TITAN_DOOR_PATH}/titan_doors_breakthrough_0.webp`,
    `${TITAN_DOOR_PATH}/titan_doors_breakthrough_1.webp`,
    `${TITAN_DOOR_PATH}/titan_doors_breakthrough_2.webp`,
  ],
  /**
   * Dveře se taví přetížením generátoru, Titan u nich — 6 snímků. Indexy
   * 0-4 tvoří pětikrokový deterministický countdown (viz
   * resolveTitanOverloadFrameSrc níže), index 5 je mrtvý/zhroucený Titan po
   * dokončení overloadu (viz zadání "successful kill" reveal).
   */
  overdrive: [
    `${TITAN_DOOR_PATH}/titan_doors_overdrive_0.webp`,
    `${TITAN_DOOR_PATH}/titan_doors_overdrive_1.webp`,
    `${TITAN_DOOR_PATH}/titan_doors_overdrive_2.webp`,
    `${TITAN_DOOR_PATH}/titan_doors_overdrive_3.webp`,
    `${TITAN_DOOR_PATH}/titan_doors_overdrive_4.webp`,
    `${TITAN_DOOR_PATH}/titan_doors_overdrive_5.webp`,
  ],
  /** Titan útočí na hráče u (už prolomených) dveří — nahrazuje Impovo `door_open_death_0` jen pro Titana, viz zadání. */
  attack: `${TITAN_DOOR_PATH}/titan_attacks_broken_door.webp`,
} as const;

/** `enemyStage === "at_door"` (viz zadání). */
export const TITAN_AT_DOOR_SRC = TITAN_DOOR_ASSETS.breakthrough[0];
/** `enemyStage === "breach"` (viz zadání). */
export const TITAN_BREACH_SRC = TITAN_DOOR_ASSETS.breakthrough[2];
/** `enemyStage === "attack"` (Titanův death-reveal, viz zadání). */
export const TITAN_ATTACK_SRC = TITAN_DOOR_ASSETS.attack;
/** Mrtvý Titan po dokončeném přetížení (`titanOverloadDeathRevealUntilMs`, viz gameReducer.ts). */
export const TITAN_OVERLOAD_DEATH_SRC = TITAN_DOOR_ASSETS.overdrive[5];

/** Kolik snímků tvoří countdown fázi (indexy 0-4 v `overdrive`, index 5 je samostatný "mrtvý" reveal). */
const TITAN_OVERLOAD_COUNTDOWN_FRAME_COUNT = 5;

/**
 * Deterministický výběr countdown snímku (0-4) podle SKUTEČNÉHO postupu
 * probíhajícího přetížení — žádný `setTimeout`/`setInterval`/lokální
 * počítadlo (viz zadání), jen čistá funkce nad existujícími časovými poli
 * (`elapsedMs`, `doorGeneratorOverloadUntilMs`, `GENERATOR_OVERLOAD_DOOR_DURATION_MS`
 * — stejná pole, co už používá `doorGeneratorOverloadSecondsRemaining` v
 * GameScreen.tsx). 5 pásem po 20 % (0-20, 20-40, 40-60, 60-80, 80-100 %,
 * přesně podle zadání) — `Math.min` na konci ochrání proti hraniční hodnotě
 * přesně 100 % (jinak by `Math.floor(1 * 5)` vyšlo 5, mimo pole).
 */
export function resolveTitanOverloadFrameSrc(elapsedMs: number, overloadUntilMs: number, totalDurationMs: number): string {
  const remainingMs = Math.max(0, overloadUntilMs - elapsedMs);
  const progressRatio = totalDurationMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalDurationMs)) : 1;
  const bucket = Math.min(TITAN_OVERLOAD_COUNTDOWN_FRAME_COUNT - 1, Math.floor(progressRatio * TITAN_OVERLOAD_COUNTDOWN_FRAME_COUNT));
  return TITAN_DOOR_ASSETS.overdrive[bucket];
}

/**
 * Natvrdo stáhne Titanovy dveřní assety do cache prohlížeče — stejný vzor
 * jako `preloadBackgroundImages` v backgroundImages.ts, volané odtud jen
 * když je aktivní monstrum skutečně Titan (viz LoadingScreen.tsx), ať se
 * běžná (dnes jediná, Impova) noc nezatěžuje stahováním obrázků, které nikdy
 * neuvidí.
 */
export function preloadTitanDoorImages(): void {
  if (typeof window === "undefined") return;
  const allSrcs = [...TITAN_DOOR_ASSETS.breakthrough, ...TITAN_DOOR_ASSETS.overdrive, TITAN_DOOR_ASSETS.attack];
  for (const src of allSrcs) {
    const img = new Image();
    img.src = src;
  }
}
