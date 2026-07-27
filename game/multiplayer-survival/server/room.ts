// Autoritativní room stav pro JEDNU pevnou dev místnost (viz zadání "jedna
// pevná dev místnost, maximálně 2 hráči, bez lobby, bez matchmakingu") —
// vzor převzatý z project-hub-api (Osmá liga) `modules/osmaLiga/onlineGames.ts`
// (token-per-slot, in-memory Map/objekt, žádná DB), zjednodušený na přesně
// 2 pevné sloty. Čisté funkce nad `DevRoom` tady, žádný socket.io — ten
// zapojuje server.ts, ať se tahle logika dá testovat bez skutečné sítě.

import { randomBytes } from "node:crypto";
import { createInitialMultiplayerSurvivalState, tickMultiplayerSurvival } from "../engine/tick";
import { MonsterId, MultiplayerSurvivalInputs, MultiplayerSurvivalState, PlayerId } from "../state/types";
import { PlayerSlot } from "./protocol";

export const PLAYER_SLOTS: PlayerSlot[] = ["player-1", "player-2"];

export interface SlotOccupant {
  playerId: PlayerId;
  token: string;
  connected: boolean;
}

export interface DevRoom {
  slots: Record<PlayerSlot, SlotOccupant | null>;
  state: MultiplayerSurvivalState;
  /** Poslední známý vstup per hráč — přepisuje se `input` eventem, čte se každý tik (viz tickRoom). Chybějící záznam = žádný pohyb/výstřel. */
  lastInputByPlayer: Map<PlayerId, Omit<MultiplayerSurvivalInputs[number], "playerId">>;
  /** Monotónní čítač snapshotů (viz protocol.ts#SnapshotMessage.seq) — NIKDY se nevrací zpět, ani po rejoinu. */
  seq: number;
}

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

const MONSTER_ID: MonsterId = "monster-1";

export function createDevRoom(): DevRoom {
  return {
    slots: { "player-1": null, "player-2": null },
    state: createInitialMultiplayerSurvivalState([], [MONSTER_ID]),
    lastInputByPlayer: new Map(),
    seq: 0,
  };
}

function ensurePlayerInEngineState(room: DevRoom, slot: PlayerSlot, playerId: PlayerId): void {
  if (room.state.players.some((p) => p.id === playerId)) return;
  // Přidání hráče doprostřed běžící hry — znovu použije stejný init přes
  // vytvoření dočasného 1-hráčového stavu jen kvůli spawn pozici, ať se
  // spawn logika (viz engine/tick.ts#createInitialMultiplayerSurvivalState)
  // nikde neduplikuje.
  // Vždy voláme s polem o jednom prvku (nezávisle na tom, kolikátý hráč se
  // připojuje), takže si musíme dopočítat X odsazení sami — stejné pravidlo
  // jako engine/tick.ts#createInitialMultiplayerSurvivalState (jen na
  // ose X, uvnitř kanceláře, viz komentář tam).
  const index = PLAYER_SLOTS.indexOf(slot);
  const withNewPlayer = createInitialMultiplayerSurvivalState([playerId], []);
  const spawnedPlayer = withNewPlayer.players[0];
  room.state = {
    ...room.state,
    players: [...room.state.players, { ...spawnedPlayer, x: spawnedPlayer.x + index * 30 }],
  };
}

export type JoinRoomResult = { ok: true; slot: PlayerSlot; playerId: PlayerId; token: string } | { ok: false; reason: "full" };

/**
 * Rejoin (token sedí na existující slot) NEBO nové přiřazení prvního
 * volného slotu — v tomhle pořadí, ať token vždy vyhraje nad "obsazeností"
 * (i odpojený hráč si drží svůj slot navěky v rámci životnosti procesu,
 * viz zadání "jednoduchý tokenový návrat", žádný TTL/expirace v tomhle
 * rozsahu směny). Třetí klient bez platného tokenu na plnou místnost
 * dostane `{ok:false}` → server.ts pošle `error`.
 */
export function joinRoom(room: DevRoom, token: string | null): JoinRoomResult {
  if (token) {
    for (const slot of PLAYER_SLOTS) {
      const occupant = room.slots[slot];
      if (occupant && occupant.token === token) {
        occupant.connected = true;
        ensurePlayerInEngineState(room, slot, occupant.playerId);
        return { ok: true, slot, playerId: occupant.playerId, token };
      }
    }
  }

  for (const slot of PLAYER_SLOTS) {
    if (room.slots[slot] === null) {
      const playerId: PlayerId = slot;
      const newToken = generateToken();
      room.slots[slot] = { playerId, token: newToken, connected: true };
      ensurePlayerInEngineState(room, slot, playerId);
      return { ok: true, slot, playerId, token: newToken };
    }
  }

  return { ok: false, reason: "full" };
}

export function markSlotConnection(room: DevRoom, playerId: PlayerId, connected: boolean): void {
  for (const slot of PLAYER_SLOTS) {
    const occupant = room.slots[slot];
    if (occupant && occupant.playerId === playerId) {
      occupant.connected = connected;
      return;
    }
  }
}

export function setPlayerInput(room: DevRoom, playerId: PlayerId, input: Omit<MultiplayerSurvivalInputs[number], "playerId">): void {
  room.lastInputByPlayer.set(playerId, input);
}

/** Jeden autoritativní krok simulace — čte poslední známý vstup KAŽDÉHO hráče v engine stavu (odpojený hráč = poslední vstup se dál "drží", dokud nepřijde nový nebo nebude explicitně vynulován při disconnectu, viz server.ts). */
export function tickRoom(room: DevRoom, deltaMs: number): void {
  const inputs: MultiplayerSurvivalInputs = room.state.players.map((player) => ({
    playerId: player.id,
    ...(room.lastInputByPlayer.get(player.id) ?? { moveX: 0, moveY: 0, firing: false }),
  }));
  room.state = tickMultiplayerSurvival(room.state, inputs, deltaMs);
}

export function nextSnapshotSeq(room: DevRoom): number {
  room.seq += 1;
  return room.seq;
}
