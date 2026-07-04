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
// LoadingScreen.tsx a content/loadingHints.ts. Kolik hintů se vybere — jen 1
// (LoadingScreen ukazuje vždy jeden hint, ne víc různých najednou; pokud má
// dvě věty, odhalí je postupně, viz LoadingScreen.tsx#splitSentences).
export const LOADING_SCREEN_DURATION_MS = 4000;
export const LOADING_SCREEN_HINT_COUNT = 1;

// Krátký "reveal" moment před finalizací smrti "door_open_at_attack" — hráč
// uvidí monstrum ve dveřích (door_open_death_0), teprve pak DeathScreen. Viz
// GameState.doorDeathRevealUntilMs, gameReducer.ts ENEMY_ADVANCE/TICK.
export const DOOR_DEATH_REVEAL_DURATION_MS = 700;

// Jak často (ms) se v detailu kamery pomalu prostřídá obrázek bez monstra —
// viz game/cameras/cameraAssets.object13.ts#getCameraImageSrc. Záměrně
// pomalé (ne animace) — jen ať obraz kamery nepůsobí jako jedna mrtvá fotka.
export const CAMERA_IMAGE_CYCLE_MS = 4000;

// O kolik ms se zpozdí blikání šipky "Zkontrolovat generátor" po vstupu do
// generatorState "criticalBeeping" — viz game/core/generatorUrgency.ts.
// Rychlé pípání + rychlý pokles energie mají být jediná okamžitá
// signalizace; blikající tlačítko je až druhotné potvrzení o chvíli později.
export const GENERATOR_URGENT_BLINK_DELAY_MS = 2000;

// Heartbeat/stres vrstva (viz game/audio/heartbeatStress.ts,
// game/audio/useHeartbeatStress.ts) — jak rychle se plynulá stress hodnota
// (0..1) přibližuje k targetStress. Růst rychlejší než pokles: hráč má stres
// pocítit skoro okamžitě, ale uklidnění má být pozvolné, ne skokové.
export const HEARTBEAT_STRESS_RISE_MS = 1000;
// Playtest feedback: pokles působil moc rychle — zpomaleno ~5x (7 s -> 35 s).
export const HEARTBEAT_STRESS_FALL_MS = 35000;

// Dočasné dev zobrazení "Stres: X" v HUDu vedle energie (viz PowerMeter.tsx,
// app/play/page.tsx) — jde vypnout jedním přepnutím, až logika bude ověřená.
export const STRESS_DEV_HUD_ENABLED = true;

// Playtest feedback: heartbeat byl pořád moc tichý i po +12dB boostu souborů
// (viz assets/audio/README.md) — o 20 % hlasitěji, pak po dalším kole ještě o
// 30 % navrch (1.2 -> 1.56) přes tenhle násobič na výsledné
// computeHeartbeatVolumes (viz heartbeatStress.ts).
export const HEARTBEAT_VOLUME_MULTIPLIER = 1.56;

// Ambient (ambience_loop) se má při vysokém stresu ztišit, ať heartbeat víc
// vynikne — na maximu stresu klesne na tenhle podíl své základní hlasitosti
// (viz computeAmbientStressMultiplier v heartbeatStress.ts).
export const MIN_AMBIENT_STRESS_MULTIPLIER = 0.2;

// Jednorázový (ne akumulující se) bonus stresu, dokud generátor běží ve fázi
// "criticalBeeping" (porucha, rychlé pípání + rychlý pokles nouzové energie)
// — viz computeGeneratorStressBonus v heartbeatStress.ts.
export const BACKUP_POWER_STRESS_BONUS = 20;

// Stejný princip pro "restarting" (hráč omylem restartoval FUNKČNÍ generátor)
// — energie mizí stejně rychle jako u criticalBeeping (viz applyPowerDelta),
// navíc pípání teď taky slyšet (viz updateGenerator v gameReducer.ts), takže
// bonus je vyšší — vyšší stres za vlastní chybu, ne za skutečnou poruchu.
export const GENERATOR_RESTART_STRESS_BONUS = 40;

// Horor efekt: při vyšším stresu ubývá "Čas do úsvitu" pomaleji (subjektivně
// se noc vleče) — viz game/core/stressTimeScale.ts#computeStressTimeScale.
// Nikdy neskáče čas nahoru, jen zpomaluje odpočet; 0 = normální rychlost,
// MAX_STRESS_TIME_SLOWDOWN = maximální zpomalení při stresu 100 %.
export const STRESS_TIME_SLOWDOWN_ENABLED = true;
export const MAX_STRESS_TIME_SLOWDOWN = 0.5;

// Progresivní ztěžování podle počtu přežitých nocí aktuálního hlídače (ne
// podle difficulty easy/medium/hard — to je nezávislá vrstva, viz
// game/difficulty/nightScaling.ts). "Pressure" (noc - 1) je capnutá na tuhle
// hodnotu, ať žádný modifikátor neroste donekonečna.
export const NIGHT_SCALING_MAX_PRESSURE = 4;
// Kolik % navíc energy drain za každý bod "pressure" (noc 2 = +5 %, noc 3 = +10 %, ...).
export const NIGHT_SCALING_ENERGY_DRAIN_STEP = 0.05;

// Sekvence útoku/smrti (viz app/play/page.tsx, efekt na state.screen ===
// "death", AUDIO_DESIGN.md "Ticho před lekačkou"): ambience plynule ztlumí
// přes AMBIENCE_DEATH_FADE_MS, pak JUMPSCARE_SILENT_GAP_MS ticha, teprve
// potom zahraje jumpscare — ticho těsně před lekačkou je součást efektu, ne
// jen okamžik navíc.
export const AMBIENCE_DEATH_FADE_MS = 300;
export const JUMPSCARE_SILENT_GAP_MS = 200;
