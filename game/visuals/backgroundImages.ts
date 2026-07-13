// Konfigurace atmosférických pozadí pro jednotlivé obrazovky. Cíl: dát se
// zadefinovat bez zásahu do komponent — nový/jiný snímek, jiný typ efektu
// (prolínání mezi 1-3 snímky vs. jemné blikání/ztlumení) je jen změna dat tady,
// vykreslení řeší components/SceneBackground.tsx.

export interface BackgroundFrame {
  src: string;
  /**
   * Volitelné přebití `SceneBackgroundConfig.holdMs` jen pro tenhle jeden
   * snímek (viz "menuLogin" — základní frame vydrží déle, alarmový červený
   * frame jen krátce probliskne). Bez tohohle pole (undefined) se použije
   * `scene.holdMs` stejně jako dřív, žádná změna chování existujících scén.
   */
  holdMs?: number;
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
  /**
   * `true` = jednorázová sekvence (viz "death" — hráč umře, monstrum
   * dokoná útok na 3 snímcích, pak zůstane stát) — po dosažení posledního
   * snímku se přestane cyklovat zpátky na první (viz SceneBackground.tsx).
   * Bez tohohle pole (undefined/false) scéna cykluje pořád dokola jako dřív
   * (menu/win/menuLogin/...), žádná změna chování existujících scén.
   */
  playOnce?: boolean;
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
  | "menuFirstWin"
  | "menuLogin"
  | "loading"
  | "play"
  | "door"
  | "death"
  | "deathDoorAttack"
  | "win"
  | "about"
  | "monsterDefeated";

// play/win mají 2 varianty snímků (*_0.webp, *_1.webp v
// public/object_13/background/ — stejný obraz, jemně jiná varianta, např.
// jinak kouřící komín), které SceneBackground plynule prolíná automaticky po
// holdMs. `menu` (default, nepřihlášený hráč) má 3 varianty stejným
// způsobem (menu_bg_0/1/2.webp). about/loading/death/
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
      { src: `${OBJECT_13_BACKGROUND_PATH}/menu_bg_2.webp` },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  // Menu po prvním true endingu (viz zadání, game/core/monsterDefeatReward.ts,
  // MainMenuScreen.tsx) — stejný crossfade mechanismus jako "menu" výše, jen
  // jiná dvojice snímků. Soubory byly dodané jako .png
  // (menu_backgroud_first_win_0/1.png — "backgroud" je zdrojový překlep,
  // NEPŘEJMENOVÁVAT, viz zadání) a zkonvertované na .webp (cwebp, beze změny
  // rozměru) kvůli konzistenci s ostatními scénami zde. Frames pole je
  // navržené tak, aby šlo kdykoliv rozšířit o další variantu beze změny
  // SceneBackground.tsx — jen přidat další { src } záznam.
  menuFirstWin: {
    frames: [
      { src: `${OBJECT_13_BACKGROUND_PATH}/menu_backgroud_first_win_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/menu_backgroud_first_win_1.webp` },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  // Menu pro přihlášeného Discord hráče, který ještě nemá monster defeat
  // odměnu (viz zadání, game/visuals/mainMenuBackground.ts#resolveMainMenuBackground,
  // MainMenuScreen.tsx) — nikdy se nezobrazí zároveň s "menuFirstWin" (ta má
  // přednost, viz resolveMainMenuBackground). Frame 0 (strážný na obchůzce)
  // drží dlouho, frame 1 (červené alarmové světlo, hrozba ve stínu) jen
  // krátce probliskne — vlastní `holdMs` na každém snímku (viz BackgroundFrame),
  // scene.holdMs níže se prakticky nepoužije (obě frames mají explicitní
  // hodnotu), ponechané jen jako typově vyžadovaný fallback.
  menuLogin: {
    frames: [
      { src: `${OBJECT_13_BACKGROUND_PATH}/menu_bg_login_0.webp`, holdMs: 7000 },
      { src: `${OBJECT_13_BACKGROUND_PATH}/menu_bg_login_1.webp`, holdMs: 1100 },
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
  // Jednorázová 3-snímková animace útoku (viz zadání "nahradit statickou
  // death obrazovku jednoduchou animací") — nahrazuje dřívější jediný
  // statický `death_bg_0.webp`. Assety žijí v `public/object_13/monster/ghoul/`
  // (ne pod OBJECT_13_BACKGROUND_PATH jako většina scén tady) — stejný důvod
  // jako `monsterDefeated` níže: patří k monstru, ne k "pozadí objektu".
  // `holdMs: 500` na každém snímku + `playOnce: true` (viz SceneBackground.tsx)
  // = přehraje se jednou (0 → 1 → 2) a zůstane stát na posledním, žádná
  // smyčka zpátky na první snímek. Krátký `crossfadeMs` (150ms), ať se tři
  // snímky za 500ms každý nerozmazaly do sebe přes zbytečně dlouhé prolnutí.
  death: {
    frames: [
      { src: "/object_13/monster/ghoul/ghoul_death_0.webp", holdMs: 500 },
      { src: "/object_13/monster/ghoul/ghoul_death_1.webp", holdMs: 500 },
      { src: "/object_13/monster/ghoul/ghoul_death_2.webp", holdMs: 500 },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: 150,
    overlay: DEFAULT_OVERLAY,
    playOnce: true,
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
