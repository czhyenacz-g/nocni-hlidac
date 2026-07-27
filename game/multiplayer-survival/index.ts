// Veřejné rozhraní izolovaného multiplayer-survival prototypu — viz
// README.md. Volající mimo tenhle modul (app/dev/multiplayer-survival/)
// importuje jen odsud, ne z jednotlivých vnitřních souborů přímo.

export type {
  MultiplayerSurvivalState,
  MultiplayerSurvivalMap,
  MultiplayerSurvivalInputs,
  MultiplayerSurvivalPlayerInput,
  MultiplayerSurvivalStatus,
  PlayerState,
  MonsterState,
  PickupState,
  PlayerId,
  MonsterId,
} from "./state/types";

export { createInitialMultiplayerSurvivalState, tickMultiplayerSurvival } from "./engine/tick";
export { renderMultiplayerSurvival, DEFAULT_DEBUG_TOGGLES } from "./rendering/renderCanvas";
export type { MultiplayerSurvivalDebugToggles } from "./rendering/renderCanvas";
export { PROTOTYPE_MAP } from "./maps/prototypeMap";
