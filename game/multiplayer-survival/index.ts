// Veřejné rozhraní izolovaného multiplayer-survival prototypu — viz
// README.md. Volající mimo tenhle modul (app/dev/multiplayer-survival/)
// importuje jen odsud, ne z jednotlivých vnitřních souborů přímo.

export type {
  MultiplayerSurvivalState,
  MultiplayerSurvivalMap,
  MultiplayerSurvivalInputs,
  MultiplayerSurvivalPlayerInput,
  MultiplayerSurvivalRoundStatus,
  MultiplayerSurvivalRoundEndReason,
  PlayerState,
  MonsterState,
  PickupState,
  PlayerId,
  MonsterId,
} from "./state/types";

export { createInitialMultiplayerSurvivalState, tickMultiplayerSurvival } from "./engine/tick";
export { formatRemainingTime } from "./engine/formatRoundTime";
export { computeRoundProgress, getMonsterBoostConfig } from "./engine/monsterBoostConfig";
export type { MonsterBoostConfig } from "./engine/monsterBoostConfig";
export { renderMultiplayerSurvival, DEFAULT_DEBUG_TOGGLES } from "./rendering/renderCanvas";
export type { MultiplayerSurvivalDebugToggles } from "./rendering/renderCanvas";
export { PROTOTYPE_MAP } from "./maps/prototypeMap";
