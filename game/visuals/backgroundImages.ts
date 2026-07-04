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
const DEFAULT_OVERLAY = "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75))";

export type BackgroundSceneId = "menu" | "loading" | "play" | "death" | "win" | "about";

// Zatím má vlastní obrázek jen menu/play/win (viz public/*.webp) — loading/death/about
// mají prázdné frames (žádné pozadí), infrastruktura je ale připravená pro všechny:
// stačí sem přidat frames (a případně flicker), nikam jinam se sahat nemusí.
export const BACKGROUND_SCENES: Record<BackgroundSceneId, SceneBackgroundConfig> = {
  menu: {
    frames: [{ src: "/menu_bg.webp" }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  loading: {
    frames: [],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  play: {
    frames: [{ src: "/play_background.webp" }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8))",
  },
  death: {
    frames: [],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: DEFAULT_OVERLAY,
  },
  win: {
    frames: [{ src: "/win1_background.webp" }],
    holdMs: DEFAULT_HOLD_MS,
    crossfadeMs: DEFAULT_CROSSFADE_MS,
    overlay: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7))",
  },
  about: {
    frames: [],
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
