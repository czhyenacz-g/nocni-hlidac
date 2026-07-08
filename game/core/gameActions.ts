import { CameraId, RoomBulbsState } from "./types";
import { NightFeatureFlags } from "../difficulty/nightConfig";

export type GameAction =
  | { type: "START_LOADING" }
  // Krátký briefing panel před START_SHIFT/RESTART_SHIFT (viz
  // components/screens/BriefingScreen.tsx) — jen přechod na screen
  // "briefing", žádná jiná změna stavu.
  | { type: "SHOW_BRIEFING" }
  // roomBulbs (viz game/core/roomBulbs.ts), bulbsRemaining (viz
  // game/core/bulbInventory.ts) a nightFeatures (viz
  // game/difficulty/nightConfig.ts) jsou volitelné — app/play/page.tsx je
  // posílá načtené z localStorage / spočítané přes getNightConfig, chybí-li
  // se použijí čerstvé výchozí hodnoty (createDefaultRoomBulbs,
  // BULBS_CONFIG.startingCount, DEFAULT_NIGHT_FEATURES).
  | { type: "START_SHIFT"; roomBulbs?: RoomBulbsState; bulbsRemaining?: number; nightFeatures?: NightFeatureFlags }
  | { type: "RESTART_SHIFT"; roomBulbs?: RoomBulbsState; bulbsRemaining?: number; nightFeatures?: NightFeatureFlags }
  | { type: "TOGGLE_DOOR" }
  | { type: "TOGGLE_LIGHT" }
  | { type: "LOOK_AT_DOOR" }
  | { type: "LOOK_AT_DESK" }
  | { type: "LOOK_AT_GENERATOR" }
  | { type: "LOOK_AT_LEFT_WALL" }
  | { type: "LOOK_AT_MAP" }
  | { type: "RESTART_GENERATOR" }
  | { type: "OPEN_CAMERA"; cameraId: CameraId }
  | { type: "CLOSE_CAMERAS" }
  | { type: "TOGGLE_AUDIO_MUTED" }
  | { type: "START_BULB_REPLACEMENT" }
  // Puštění tlačítka/pointer leave/cancel před dokončením — viz DoorView.tsx.
  // No-op, pokud žádná výměna zrovna neběží.
  | { type: "CANCEL_BULB_REPLACEMENT" }
  // stressLevel (0..1, viz game/audio/useHeartbeatStress.ts) je volitelný —
  // řídí jen game/core/stressTimeScale.ts, chybí-li, čas běží normální
  // rychlostí (stejné jako stressLevel 0). currentNight (survivedNights + 1,
  // viz game/core/survivedNights.ts) řídí jen game/difficulty/nightScaling.ts,
  // chybí-li, bere se jako noc 1 (žádné ztěžování). Ani jedno pole nezajímá
  // zbytek herní logiky/audia.
  | { type: "TICK"; deltaMs: number; stressLevel?: number; currentNight?: number }
  | { type: "ENEMY_ADVANCE" }
  | { type: "GO_TO_MENU" }
  // Efekt z nouzové minihry (viz EmergencyMiniGame, game/minigame/types.ts
  // EmergencyWorldEffect "energy_recharged") po returned resultu —
  // app/play/page.tsx#handleEmergencyMiniGameComplete pošle už spočítané
  // množství, reducer jen přičte a clampne na MAX_POWER. amount <= 0 je no-op.
  | { type: "RECHARGE_POWER"; amount: number }
  // Hráč zemřel uvnitř nouzové minihry (outcome "dead", viz
  // EmergencyMiniGame) — stejný death flow jako ENEMY_ADVANCE/TICK, jen
  // spuštěný zvenčí (z app/play/page.tsx), ne z herní smyčky.
  | { type: "EMERGENCY_MINIGAME_DIED" };
