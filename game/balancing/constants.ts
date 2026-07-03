// Ladicí konstanty pro první směnu. Držet mimo herní logiku, aby šly snadno měnit.

// Zobrazuje se v patičce hlavního menu (MainMenuScreen.tsx). Ruční verzování,
// aktualizuj při větších změnách.
export const GAME_VERSION = "v0.731";

export const GAME_TICK_MS = 100;

export const MAX_POWER = 100;

export const LOW_POWER_THRESHOLD = 25;
export const CRITICAL_POWER_THRESHOLD = 10;

export const FLASHLIGHT_DURATION_MS = 2000;

export const DEBUG_PANEL_ENABLED = true;

// Falešný briefing/loading screen mezi menu a startem směny — viz
// LoadingScreen.tsx a content/loadingHints.ts. Kolik hintů se z nich vybere.
export const LOADING_SCREEN_DURATION_MS = 4000;
export const LOADING_SCREEN_HINT_COUNT = 3;
