// Konfigurace atmosférických pozadí pro jednotlivé obrazovky. Cíl: dát se
// zadefinovat bez zásahu do komponent — nový/jiný snímek, jiný typ efektu
// (prolínání mezi 1-3 snímky vs. jemné blikání/ztlumení) je jen změna dat tady,
// vykreslení řeší components/SceneBackground.tsx.

export interface BackgroundFrame {
  src: string;
}

/** Jemný, nekonečně se opakující pulz jasu (blikající kontrolka, ztlumené světlo) — nezávislý na počtu snímků. */
export interface BackgroundFlicker {
  minBrightness: number;
  maxBrightness: number;
  periodMs: number;
}

export interface SceneBackgroundConfig {
  /**
   * 1-3 obrázky, které se plynule prolínají (crossfade) — 0 znamená zatím bez
   * pozadí (SceneBackground nic nevykreslí), 1 znamená statické pozadí bez
   * střídání. Víc snímků = např. jinak kouřící komín na jinak identickém obraze.
   */
  frames: BackgroundFrame[];
  /** Jak dlouho (ms) snímek zůstane plně viditelný, než se začne prolínat do dalšího. Ignoruje se při <= 1 snímku. */
  holdMs: number;
  /** Délka (ms) samotného prolnutí mezi snímky — "bez skoku", ne tvrdý střih. Ignoruje se při <= 1 snímku. */
  crossfadeMs: number;
  /** Volitelný efekt navíc (blikání/ztlumení), nezávislý na střídání snímků. */
  flicker?: BackgroundFlicker;
  /** Tmavý gradient přes obrázek, ať zůstane čitelný text panelů nad ním. */
  overlay: string;
}

const DEFAULT_HOLD_MS = 6000;
const DEFAULT_CROSSFADE_MS = 1500;
// Zdrojové obrázky jsou samy o sobě velmi tmavé (záměrně, hororová atmosféra)
// — text stojí v `.pixel-panel` boxech, které mají vlastní poloprůhledné
// pozadí (viz styles/pixel.css), takže overlay tu není kvůli čitelnosti
// textu, jen jemné doladění kontrastu. Původní 0.55-0.8 overlay obrázky
// prakticky úplně "spálil" na černo — proto jen slabý spodní gradient.
const DEFAULT_OVERLAY = "linear-gradient(rgba(0,0,0,0.05), rgba(0,0,0,0.25))";

// Assety jsou rozdělené po mapách/objektech (`public/<map>/background/...`,
// `public/<map>/camera/...`) — připraveno na to, až přibude druhá mapa vedle
// Objektu 13. BACKGROUND_SCENES níže zatím obsluhuje jen tenhle jeden objekt;
// až přibude další noc s jinou mapou, přibude vlastní sada scén se stejným
// vzorem (vlastní `<MAP>_BACKGROUND_PATH` konstanta + vlastní frames).
const OBJECT_13_BACKGROUND_PATH = "/object_13/background";

export type BackgroundSceneId =
  | "menu"
  | "loading"
  | "play"
  | "door"
  | "death"
  | "deathDoorAttack"
  | "win"
  | "about"
  | "monsterDefeated";

// menu/play/win mají 2 varianty snímků (*_0.webp, *_1.webp v
// public/object_13/background/ — stejný obraz, jemně jiná varianta, např.
// jinak kouřící komín), které SceneBackground plynule prolíná automaticky po
// holdMs. about/loading/death/
// deathDoorAttack mají zatím jen 1 snímek (statické pozadí, bez střídání).
// `door` má 3 snímky (otevřené/zavřené dveře + monstrum ve dveřích), ale
// NEcyklují se samy — GameScreen.tsx řídí aktivní index přes
// SceneBackground.activeIndexOverride podle state.doorClosed/
// state.doorDeathRevealUntilMs, viz komponenta i TECH_DESIGN.md.
export const BACKGROUND_SCENES: Record<BackgroundSceneId, SceneBackgroundConfig> = {
  menu: {
    frames: [
      { src: `${OBJECT_13_BACKGROUND_PATH}/menu_bg_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/menu_bg_1.webp` },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  loading: {
    frames: [{ src: `${OBJECT_13_BACKGROUND_PATH}/loading_bg_0.webp` }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  play: {
    frames: [
      { src: `${OBJECT_13_BACKGROUND_PATH}/play_bg_universal_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/play_bg_universal_1.webp` },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
  },
  // Index 0 = otevřené, index 1 = zavřené, index 2 = monstrum ve dveřích
  // (jen během krátkého doorDeathReveal, viz gameReducer ENEMY_ADVANCE/TICK a
  // GameScreen.tsx). crossfadeMs je tu kratší než jinde — reveal má trvat jen
  // DOOR_DEATH_REVEAL_DURATION_MS (700 ms) celkem, ať se stihne doprolínat.
  door: {
    frames: [
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_open_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_closed_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_open_death_0.webp` },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: 350,
    overlay: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
  },
  death: {
    frames: [{ src: `${OBJECT_13_BACKGROUND_PATH}/death_bg_0.webp` }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  // Smrt "door_open_at_attack" nastává ve stejném reducer dispatchi, kdy
  // enemyStage přejde na "attack" a screen na "death" zároveň — hráč tedy
  // nikdy neuvidí samostatnou "útok probíhá" fázi v DoorView, jen rovnou
  // DeathScreen. Tenhle obrázek proto slouží jako pozadí death screenu pro
  // tuhle konkrétní deathReason, viz DeathScreen.tsx.
  deathDoorAttack: {
    frames: [{ src: `${OBJECT_13_BACKGROUND_PATH}/door_open_death_0.webp` }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  win: {
    frames: [
      { src: `${OBJECT_13_BACKGROUND_PATH}/win_bg_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/win_bg_1.webp` },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: "linear-gradient(rgba(0,0,0,0.05), rgba(0,0,0,0.25))",
  },
  about: {
    frames: [{ src: `${OBJECT_13_BACKGROUND_PATH}/about_bg_0.webp` }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  // Skrytý true ending (viz zadání, game/core/monsterEnding.ts,
  // components/screens/MonsterDefeatedScreen.tsx) — asset žije v
  // public/object_13/story/ (stejná "cinematic ilustrace" složka jako
  // story_1.webp v content/cinematics.ts), ne pod OBJECT_13_BACKGROUND_PATH
  // jako ostatní scény výše, proto tu jediná plná cesta natvrdo.
  monsterDefeated: {
    frames: [{ src: "/object_13/story/dead_monster.webp" }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
};

/**
 * Natvrdo stáhne všechny nakonfigurované snímky do cache prohlížeče (přes
 * `new Image()`), ať jsou hotové, než je hráč reálně potřebuje — voláno z
 * LoadingScreen.tsx, který má i tak pár sekund "falešného" načítání navíc.
 * Díky tomu se pozadí zobrazí okamžitě i při zhoršeném připojení později ve směně.
 */
export function preloadBackgroundImages(): void {
  if (typeof window === "undefined") return;
  for (const scene of Object.values(BACKGROUND_SCENES)) {
    for (const frame of scene.frames) {
      const img = new Image();
      img.src = frame.src;
    }
  }
}
