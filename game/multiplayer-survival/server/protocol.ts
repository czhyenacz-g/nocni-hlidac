// Sdílené typy pro socket.io eventy mezi serverem (server/room.ts,
// server/server.ts) a klientem (dev/multiplayer-survival-online). Vzor
// převzatý z ~/PhpstormProjects/project-hub-api (Osmá liga) — `join` s
// {code, token}, server odpoví `joined`/`error`, autoritativní stav chodí
// jako `snapshot` s monotónním `seq` (na rozdíl od Osmé ligy tenhle `seq`
// klient SKUTEČNĚ kontroluje, viz useMultiplayerSurvivalOnline.ts).

import { MultiplayerSurvivalInputs, MultiplayerSurvivalState, PlayerId } from "../state/types";

/** Jedna pevná dev místnost — žádné lobby/matchmaking (viz README.md rozsah týhle směny). */
export const DEV_ROOM_CODE = "dev-room";

export type PlayerSlot = "player-1" | "player-2";

export interface JoinRequest {
  /** Kód místnosti — dnes vždy DEV_ROOM_CODE, pole existuje jen kvůli tvaru zprávy, ne kvůli budoucí rozšiřitelnosti (žádné lobby se neplánuje). */
  code: string;
  /** Token z předchozího joinu (localStorage) — umožňuje jednoduchý rejoin do STEJNÉHO slotu po reloadu, viz zadání "jednoduchý tokenový návrat". Chybí/neznámý token = nový slot, pokud je volný. */
  token: string | null;
}

export interface JoinedResponse {
  playerId: PlayerId;
  slot: PlayerSlot;
  token: string;
}

export interface JoinErrorResponse {
  message: string;
}

export interface SnapshotMessage {
  /** Monotónně rostoucí pořadové číslo — klient MUSÍ zahodit snapshot se `seq <= lastAppliedSeq` (viz zadání "ignorování starších snapshotů", oprava oproti Osmé lize, která `tick` posílá, ale nikde nekontroluje). */
  seq: number;
  state: MultiplayerSurvivalState;
}

export interface PingMessage {
  clientTimeMs: number;
}

export interface PongMessage {
  clientTimeMs: number;
  serverTimeMs: number;
}

/** Klient → server. */
export interface ClientToServerEvents {
  join: (request: JoinRequest) => void;
  input: (input: Omit<MultiplayerSurvivalInputs[number], "playerId">) => void;
  ping: (message: PingMessage) => void;
}

/**
 * Jestli se má příchozí snapshot vůbec aplikovat — `false` pro cokoliv se
 * `seq <= lastAppliedSeq` (stejné/starší/duplicitní, typicky po krátkém
 * síťovém zaškobrtnutí nebo souběhu websocket + reconnect). Vytažené jako
 * čistá funkce, ať je tahle konkrétní oprava (viz zadání "ignorování
 * starších snapshotů") testovatelná bez skutečného socketu.
 */
export function shouldAcceptSnapshot(lastAppliedSeq: number, incomingSeq: number): boolean {
  return incomingSeq > lastAppliedSeq;
}

/** Server → klient. */
export interface ServerToClientEvents {
  joined: (response: JoinedResponse) => void;
  error: (response: JoinErrorResponse) => void;
  snapshot: (message: SnapshotMessage) => void;
  pong: (message: PongMessage) => void;
  player_disconnected: (payload: { playerId: PlayerId }) => void;
  player_reconnected: (payload: { playerId: PlayerId }) => void;
}
