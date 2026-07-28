// Datový model pro izolovaný multiplayer-survival prototyp (viz
// game/multiplayer-survival/README.md) — NEZÁVISLÉ na game/core/types.ts,
// stejně jako existující game/minigame/*. `Wall`/`Vec2`/`Direction`/`Enemy`/
// `MiniGameItemId` jsou importované PŘÍMO z game/minigame/types.ts (čisté
// datové typy beze změny/zásahu do souboru samotného) — MonsterState je nad
// `Enemy` jen tenký multiplayer wrapper (přidává `id`), žádná duplikace jeho polí.

import { Direction, Enemy, MiniGameItemId, Vec2, Wall } from "../../minigame/types";
import { MiniGameLayoutWallKind } from "../../minigame/layoutTypes";

export type { Direction, Vec2, Wall, MiniGameItemId };

/** `Wall` + volitelný `kind` (regál/zeď/stroj/překážka) — jen pro vykreslení stylu (viz mapVisuals.ts#getMiniGameWallRenderStyle, importovaná beze změny), kolize je pro všechny druhy stejná. */
export interface MapWall extends Wall {
  kind?: MiniGameLayoutWallKind;
}

export type PlayerId = string;
export type MonsterId = string;
export type PickupId = string;

export interface PlayerState {
  id: PlayerId;
  x: number;
  y: number;
  radius: number;
  direction: Direction;
  speed: number;
  alive: boolean;
  hasShotgun: boolean;
  ammo: number;
  /** > 0 = brokovnicová výseč aktuálně "bliká bíle" (viz EmergencyMiniGame.tsx#isFlashing fork) — čistě vizuální, klesá k 0 každý tik. */
  shotFlashRemainingMs: number;
  /** Akumulovaný čas (ms) stání v dosahu nesebraného pickupu (viz `updateLootingProgressMs`, importovaná z game/minigame/logic.ts) — resetuje se při pohybu nebo opuštění dosahu. */
  lootingProgressMs: number;
  /** Věci, co hráč skutečně sebral (viz engine/tick.ts#applyPickups) — jen pro HUD/debug, žádná herní mechanika na tom (zatím) nestaví. */
  collectedItemIds: MiniGameItemId[];
}

/**
 * `Enemy` (game/minigame/types.ts) beze změny + `id` — sdílí VŠECHNA pole s
 * jednohráčovým nepřítelem (mode/investigationTarget/stunRemainingMs/
 * enraged/...), protože `updateEnemyAi` (game/minigame/logic.ts, importovaná
 * přímo, ne kopírovaná) tenhle přesný tvar očekává a vrací — viz
 * game/multiplayer-survival/ai/monsterAi.ts.
 */
export interface MonsterState extends Enemy {
  id: MonsterId;
  /** Id hráče, kterého AI tenhle tik reálně honí/vidí — jen pro debug overlay (viz zadání "zobrazit targetPlayerId"), sama AI ho nepotřebuje (updateEnemyAi bere jen pozici). `null`, když žádný hráč není `chasing` cíl (mode !== "chasing"). */
  targetPlayerId: PlayerId | null;
}

/**
 * Životní cyklus JEDNOHO kola (5minutové přežití, viz zadání "první veřejná
 * hratelná verze") — odděleno od per-entity `alive` (ten zůstává čistě
 * per-hráč/monstrum jako dřív). `"waiting"` = kolo ještě nezačalo (v místnosti
 * není nikdo, viz server/room.ts#createDevRoom); `"playing"` běží; `"won"`/
 * `"lost"` kolo skončilo (viz `MultiplayerSurvivalRoundEndReason`) a
 * `tickMultiplayerSurvival` už v těchhle stavech engine dál nesimuluje
 * (early-return beze změny, viz engine/tick.ts) — restart je výhradně
 * serverová akce (`server/room.ts#restartRound`), ne herní tik.
 */
export type MultiplayerSurvivalRoundStatus = "waiting" | "playing" | "won" | "lost";

/** Proč kolo skončilo — `null` dokud běží. `"caught"` = kteréhokoli hráče
 * chytlo monstrum (kolo končí OKAMŽITĚ, ne až když jsou dole všichni).
 * `"timeout"` = `remainingMs` doběhlo na 0 a nikdo nebyl chycen. */
export type MultiplayerSurvivalRoundEndReason = "caught" | "timeout" | null;

export interface MultiplayerSurvivalMap {
  id: string;
  width: number;
  height: number;
  walls: MapWall[];
  /** Jen pro vykreslení (místnostní obrysy/popisky) — kolize se řeší výhradně přes `walls`. */
  rooms: Array<{ id: string; name: string; bounds: { x: number; y: number; width: number; height: number } }>;
}

export interface PickupState {
  id: PickupId;
  itemId: MiniGameItemId;
  x: number;
  y: number;
  collected: boolean;
}

export interface MultiplayerSurvivalState {
  roundStatus: MultiplayerSurvivalRoundStatus;
  roundEndReason: MultiplayerSurvivalRoundEndReason;
  /** Zbývající čas kola v ms — počítá se dolů jen když `roundStatus === "playing"` (viz engine/tick.ts). Server řídí skutečnou délku kola (viz engine/config.ts#ROUND_DURATION_MS, room.ts#roundDurationMs). */
  remainingMs: number;
  elapsedMs: number;
  map: MultiplayerSurvivalMap;
  players: PlayerState[];
  monsters: MonsterState[];
  pickups: PickupState[];
}

/** Jeden hráčův vstup za tik — `moveX/moveY` je normalizovaný směr (-1..1 na obou osách, (0,0) = stojí), `firing` = stiskl teď výstřel. */
export interface MultiplayerSurvivalPlayerInput {
  playerId: PlayerId;
  moveX: number;
  moveY: number;
  firing: boolean;
}

export type MultiplayerSurvivalInputs = MultiplayerSurvivalPlayerInput[];
