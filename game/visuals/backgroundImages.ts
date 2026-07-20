// Konfigurace atmosférických pozadí pro jednotlivé obrazovky. Cíl: dát se
// zadefinovat bez zásahu do komponent — nový/jiný snímek, jiný typ efektu
// (prolínání mezi 1-3 snímky vs. jemné blikání/ztlumení) je jen změna dat tady,
// vykreslení řeší components/SceneBackground.tsx.

import { TITAN_ATTACK_SRC } from "./titanDoorAssets";

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

/**
 * Kolik ms trvá, než jednorázová (`playOnce`) scéna dosáhne svého POSLEDNÍHO
 * snímku — součet `holdMs` všech snímků KROMĚ posledního (ten pak zůstává
 * stát, viz SceneBackground.tsx#playOnce). `0` pro scény s <= 1 snímkem.
 * Používá `components/screens/DeathScreen.tsx`, ať ví, kdy přesně ghoul_death
 * animace doběhla na poslední snímek, než začne odpočítávat vlastní "hold"
 * před zobrazením dialogu.
 */
export function getPlayOnceLastFrameDelayMs(scene: SceneBackgroundConfig): number {
  if (scene.frames.length <= 1) return 0;
  return scene.frames.slice(0, -1).reduce((sum, frame) => sum + (frame.holdMs ?? scene.holdMs), 0);
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

// Zavřené dveře v BACKGROUND_SCENES.door mají 4 snímky (door_closed_0..3,
// idle animace — dveře nejsou úplně statické, i když zavřené) na indexech
// 1-4 (index 0 = otevřené, poslední = death reveal, viz BACKGROUND_SCENES.door
// níže) — DoorView.tsx mezi nimi cykluje vlastním pomalým časovačem, dokud
// jsou dveře zavřené a neběží doorDeathReveal.
export const DOOR_CLOSED_FRAME_COUNT = 4;
export const DOOR_CLOSED_FRAME_START_INDEX = 1;
// Znatelně rychlejší cyklení (na žádost — 5000ms i 2500ms bylo pořád moc
// pomalé), pořád ale krátký "hold" mezi snímky, ne plynulá animace.
export const DOOR_CLOSED_FRAME_HOLD_MS = 1000;

// Přetížení generátoru (viz GameState.doorGeneratorOverloadUntilMs,
// gameReducer.ts) a trvale zničené dveře (GameState.doorDestroyed) — dva
// další pevné snímky v BACKGROUND_SCENES.door, VLOŽENÉ před death-reveal
// snímek (ne přidané na konec pole), ať `deathRevealIndex = frames.length-1`
// v DoorView.tsx zůstane platné beze změny.
export const DOOR_GENERATOR_OVERLOAD_FRAME_INDEX = 5;
export const DOOR_DESTROYED_FRAME_INDEX = 6;

/**
 * Which door_closed_* frame offset (0..DOOR_CLOSED_FRAME_COUNT-1) to show for
 * a given monotonic step count — "ping-pong" sekvence tam a zpátky (viz
 * zadání "0,1,2,3,2,1,0,1,2,3,2,1,0..."), ne obyčejné cyklení dokola
 * (0,1,2,3,0,1,2,3,...), ať dveře nedělají viditelný "skok" zpátky na první
 * snímek. Čistá funkce (jen step + počet snímků), ať jde snadno testovat
 * nezávisle na DoorView.tsx#useEffect časovači.
 */
export function doorClosedFrameOffsetForStep(step: number): number {
  const period = 2 * (DOOR_CLOSED_FRAME_COUNT - 1);
  if (period <= 0) return 0;
  const phase = step % period;
  return phase < DOOR_CLOSED_FRAME_COUNT ? phase : period - phase;
}

export type BackgroundSceneId =
  | "menu"
  | "menuFirstWin"
  | "menuLogin"
  | "loading"
  | "play"
  | "door"
  | "death"
  | "deathDoorAttack"
  | "titanDeath"
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
  // Index 0 = otevřené, indexy 1-4 = zavřené (4-snímková idle animace, viz
  // DOOR_CLOSED_FRAME_COUNT/DoorView.tsx níže), poslední index = monstrum ve
  // dveřích (jen během krátkého doorDeathReveal, viz gameReducer
  // ENEMY_ADVANCE/TICK a GameScreen.tsx). crossfadeMs je tu kratší než jinde
  // — reveal má trvat jen DOOR_DEATH_REVEAL_DURATION_MS (700 ms) celkem, ať
  // se stihne doprolínat; DoorView.tsx pro cyklení mezi zavřenými snímky
  // používá vlastní pomalejší DOOR_CLOSED_FRAME_HOLD_MS, ne tenhle crossfadeMs.
  door: {
    frames: [
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_open_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_closed_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_closed_1.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_closed_2.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_closed_3.webp` },
      // Indexy DOOR_GENERATOR_OVERLOAD_FRAME_INDEX/DOOR_DESTROYED_FRAME_INDEX výše.
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_generator_overload_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_destroyed_0.webp` },
      { src: `${OBJECT_13_BACKGROUND_PATH}/door_open_death_0.webp` },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: 350,
    overlay: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
  },
  // Jednorázová 4-snímková animace útoku (viz zadání "nahradit statickou
  // death obrazovku jednoduchou animací", pak "mám nové obrázky ghoul_death_1-4")
  // — nahrazuje dřívější jediný statický `death_bg_0.webp` i starší 3-snímkovou
  // sadu `ghoul_death_0/1/2`. Assety žijí v `public/object_13/monster/ghoul/`
  // (ne pod OBJECT_13_BACKGROUND_PATH jako většina scén tady) — stejný důvod
  // jako `monsterDefeated` níže: patří k monstru, ne k "pozadí objektu".
  // Číslování snímků (1-4, ne 0-3) sedí se zdrojovými PNG, ze kterých se
  // konvertovaly (`ghoul_death_1.png..4.png` přes `cwebp`), záměrně beze
  // změny — přejmenování by jen matlo párování se zdrojem.
  // `holdMs: 120` na každém snímku + `playOnce: true` (viz SceneBackground.tsx)
  // = přehraje se jednou (1 → 2 → 3 → 4) a zůstane stát na posledním, žádná
  // smyčka zpátky na první snímek. `crossfadeMs` je záměrně KRATŠÍ než
  // `holdMs` (na žádost "snímky moc zanikají, dej rozumně menší crossfade" —
  // dřív bylo 150ms, 3× DELŠÍ než holdMs, takže se snímky rozmazaly skoro do
  // jednoho), ať je každý snímek ještě chvíli čistě vidět, ne jen v prolnutí.
  death: {
    frames: [
      { src: "/object_13/monster/ghoul/ghoul_death_1.webp", holdMs: 120 },
      { src: "/object_13/monster/ghoul/ghoul_death_2.webp", holdMs: 120 },
      { src: "/object_13/monster/ghoul/ghoul_death_3.webp", holdMs: 120 },
      { src: "/object_13/monster/ghoul/ghoul_death_4.webp", holdMs: 120 },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: 40,
    overlay: DEFAULT_OVERLAY,
    playOnce: true,
  },
  // Smrt "door_open_at_attack" nastává ve stejném reducer dispatchi, kdy
  // enemyStage přejde na "attack" a screen na "death" zároveň — hráč tedy
  // nikdy neuvidí samostatnou "útok probíhá" fázi v DoorView, jen rovnou
  // DeathScreen. Tenhle obrázek proto slouží jako pozadí death screenu pro
  // tuhle konkrétní deathReason, viz DeathScreen.tsx. Nejčastější způsob
  // smrti (útok u dveří) — dostává stejnou ghoul animaci jako výchozí
  // "death" scéna výše (na žádost po prvním živém testu, kde tahle scéna
  // zůstala nečekaně statická).
  deathDoorAttack: {
    frames: [
      { src: "/object_13/monster/ghoul/ghoul_death_1.webp", holdMs: 120 },
      { src: "/object_13/monster/ghoul/ghoul_death_2.webp", holdMs: 120 },
      { src: "/object_13/monster/ghoul/ghoul_death_3.webp", holdMs: 120 },
      { src: "/object_13/monster/ghoul/ghoul_death_4.webp", holdMs: 120 },
    ],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: 40,
    overlay: DEFAULT_OVERLAY,
    playOnce: true,
  },
  // Titan (viz zadání "oprav dvojitý Game Over" — DeathScreen.tsx dřív VŽDY
  // spadl na Ghoulovu `deathDoorAttack` animaci výše, bez ohledu na to, které
  // monstrum hráče zabilo). Jediný statický snímek — SCHVÁLNĚ STEJNÝ obrázek
  // (`TITAN_ATTACK_SRC`), jaký už game/death/gameOverReveal.ts použije pro
  // 4sekundový GAME OVER reveal PŘED touhle obrazovkou — nulová šance na
  // viditelný "probliknutí na jiný obrázek" přechod, protože je to fakticky
  // stejný snímek beze změny. Žádná animace/cyklení (na rozdíl od
  // `death`/`deathDoorAttack`) — Titanova smrt už svůj "dopad" odehrála v
  // reveal fázi, tahle scéna je jen klidné pozadí pro dialog.
  titanDeath: {
    frames: [{ src: TITAN_ATTACK_SRC }],
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
