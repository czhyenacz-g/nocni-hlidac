// Autoritativní room stav pro JEDNU pevnou dev místnost (viz zadání "první
// veřejná hratelná verze" — jedna aktivní místnost, žádné lobby/matchmaking,
// dynamicky spravovaný počet hráčů do MAX_PLAYERS, viz engine/config.ts) —
// vzor převzatý z project-hub-api (Osmá liga) `modules/osmaLiga/onlineGames.ts`
// (token-per-slot, in-memory pole, žádná DB). Čisté funkce nad `DevRoom`
// tady, žádný socket.io — ten zapojuje server.ts, ať se tahle logika dá
// testovat bez skutečné sítě.
//
// Identita hráče je dána VÝHRADNĚ jeho slotem v týhle místnosti (přidělený
// při `joinRoom`, obnovený přes token při rejoinu) — nikdy klávesou ani
// ničím, co posílá klient (viz zadání "server si drží vazbu connection ->
// playerId").

import { randomBytes } from "node:crypto";
import { MAX_PLAYERS, ROUND_DURATION_MS } from "../engine/config";
import { createInitialMultiplayerSurvivalState, tickMultiplayerSurvival } from "../engine/tick";
import { MonsterId, MultiplayerSurvivalInputs, MultiplayerSurvivalState, PlayerId } from "../state/types";
import { PlayerSlot } from "./protocol";

export interface SlotOccupant {
  playerId: PlayerId;
  token: string;
  connected: boolean;
}

export interface DevRoom {
  /** `slots[i]` odpovídá `playerId === "player-${i + 1}"` — pevná délka `MAX_PLAYERS`, `null` = volno. */
  slots: Array<SlotOccupant | null>;
  state: MultiplayerSurvivalState;
  /** Poslední známý vstup per hráč — přepisuje se `input` eventem, čte se každý tik (viz tickRoom). Chybějící záznam = žádný pohyb/výstřel. */
  lastInputByPlayer: Map<PlayerId, Omit<MultiplayerSurvivalInputs[number], "playerId">>;
  /** Monotónní čítač snapshotů (viz protocol.ts#SnapshotMessage.seq) — NIKDY se nevrací zpět, ani po rejoinu, resetu na "waiting" nebo restartu kola. */
  seq: number;
  /** Délka kola pro tuhle místnost (viz engine/config.ts#ROUND_DURATION_MS) — parametrizované jen kvůli lokálnímu zkrácenému testování (viz README.md), produkční výchozí je vždy `ROUND_DURATION_MS`. */
  roundDurationMs: number;
}

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

function slotPlayerId(index: number): PlayerId {
  return `player-${index + 1}`;
}

const MONSTER_ID: MonsterId = "monster-1";

export function createDevRoom(roundDurationMs: number = ROUND_DURATION_MS): DevRoom {
  return {
    slots: new Array(MAX_PLAYERS).fill(null),
    state: createInitialMultiplayerSurvivalState([], [MONSTER_ID]),
    lastInputByPlayer: new Map(),
    seq: 0,
    roundDurationMs,
  };
}

function ensurePlayerInEngineState(room: DevRoom, slotIndex: number, playerId: PlayerId): void {
  if (room.state.players.some((p) => p.id === playerId)) return;
  // Přidání hráče doprostřed běžící hry (nebo první hráč do "waiting" místnosti)
  // — znovu použije stejný init přes vytvoření dočasného 1-hráčového stavu jen
  // kvůli spawn pozici, ať se spawn logika (viz
  // engine/tick.ts#createInitialMultiplayerSurvivalState) nikde neduplikuje.
  // Odsazení na ose X podle slotu, stejné pravidlo jako tam (mapa má dnes jen
  // jeden reálný player_start slot).
  const withNewPlayer = createInitialMultiplayerSurvivalState([playerId], []);
  const spawnedPlayer = withNewPlayer.players[0];
  room.state = {
    ...room.state,
    players: [...room.state.players, { ...spawnedPlayer, x: spawnedPlayer.x + slotIndex * 30 }],
  };
}

/**
 * Nastartuje kolo — zavolá se z `joinRoom` přesně jednou, když PRVNÍ hráč
 * vstoupí do místnosti ve stavu "waiting" (viz zadání "po připojení prvního
 * hráče vznikne survival kolo"). Nedělá nic, když kolo už běží — další
 * kamarádi se jen přidají do BĚŽÍCÍHO kola (`ensurePlayerInEngineState`),
 * časovač se jim nijak neresetuje.
 */
function startRoundIfWaiting(room: DevRoom): void {
  if (room.state.roundStatus !== "waiting") return;
  const monsters = createInitialMultiplayerSurvivalState([], [MONSTER_ID]).monsters;
  room.state = {
    ...room.state,
    roundStatus: "playing",
    roundEndReason: null,
    remainingMs: room.roundDurationMs,
    elapsedMs: 0,
    monsters,
  };
}

export type JoinRoomResult = { ok: true; slot: PlayerSlot; playerId: PlayerId; token: string } | { ok: false; reason: "full" };

/**
 * Rejoin (token sedí na existující slot) NEBO nové přiřazení prvního
 * volného slotu — v tomhle pořadí, ať token vždy vyhraje nad "obsazeností"
 * (i odpojený hráč si drží svůj slot navěky v rámci životnosti procesu,
 * viz zadání "jednoduchý tokenový návrat", žádný TTL/expirace v tomhle
 * rozsahu směny). Klient bez platného tokenu na plnou místnost (`MAX_PLAYERS`
 * obsazených slotů) dostane `{ok:false}` → server.ts pošle `error`.
 */
export function joinRoom(room: DevRoom, token: string | null): JoinRoomResult {
  if (token) {
    for (let index = 0; index < room.slots.length; index++) {
      const occupant = room.slots[index];
      if (occupant && occupant.token === token) {
        occupant.connected = true;
        ensurePlayerInEngineState(room, index, occupant.playerId);
        startRoundIfWaiting(room);
        return { ok: true, slot: occupant.playerId, playerId: occupant.playerId, token };
      }
    }
  }

  for (let index = 0; index < room.slots.length; index++) {
    if (room.slots[index] === null) {
      const playerId = slotPlayerId(index);
      const newToken = generateToken();
      room.slots[index] = { playerId, token: newToken, connected: true };
      ensurePlayerInEngineState(room, index, playerId);
      startRoundIfWaiting(room);
      return { ok: true, slot: playerId, playerId, token: newToken };
    }
  }

  return { ok: false, reason: "full" };
}

function resetRoomToWaiting(room: DevRoom): void {
  room.slots = new Array(MAX_PLAYERS).fill(null);
  room.state = createInitialMultiplayerSurvivalState([], [MONSTER_ID]);
  room.lastInputByPlayer = new Map();
  // `seq` se NIKDY nevrací zpět, i tady zůstává beze změny.
}

/**
 * `connected: false` (disconnect) OKAMŽITĚ odebere hráče z enginového stavu
 * (viz zadání "odpojený hráč se korektně odstraní ze serverového stavu") —
 * token/slot zůstává rezervovaný pro jednoduchý rejoin (`joinRoom` ho pak
 * zase přidá na čerstvý spawn). Monstrum přestane cílit samo, jakmile hráč
 * zmizí z `players[]` (viz ai/monsterAi.ts#findNearestAlivePlayer). Když
 * odejde poslední připojený hráč, celá místnost se vrátí do `"waiting"`
 * (viz zadání "poslední odpojení nesmí nechat server v rozbitém mezistavu").
 */
export function markSlotConnection(room: DevRoom, playerId: PlayerId, connected: boolean): void {
  const occupant = room.slots.find((slot) => slot?.playerId === playerId);
  if (!occupant) return;

  occupant.connected = connected;
  if (connected) return;

  room.state = { ...room.state, players: room.state.players.filter((p) => p.id !== playerId) };
  room.lastInputByPlayer.delete(playerId);

  const anyoneStillConnected = room.slots.some((slot) => slot?.connected);
  if (!anyoneStillConnected) resetRoomToWaiting(room);
}

export function setPlayerInput(room: DevRoom, playerId: PlayerId, input: Omit<MultiplayerSurvivalInputs[number], "playerId">): void {
  room.lastInputByPlayer.set(playerId, input);
}

/** Jeden autoritativní krok simulace — čte poslední známý vstup KAŽDÉHO hráče AKTUÁLNĚ v engine stavu (odpojení jsou odstraněni hned, viz markSlotConnection, takže tady nezůstává žádný "duch"). Žádný efekt, když kolo není `"playing"` (viz engine/tick.ts early-return). */
export function tickRoom(room: DevRoom, deltaMs: number): void {
  const inputs: MultiplayerSurvivalInputs = room.state.players.map((player) => ({
    playerId: player.id,
    ...(room.lastInputByPlayer.get(player.id) ?? { moveX: 0, moveY: 0, firing: false }),
  }));
  room.state = tickMultiplayerSurvival(room.state, inputs, deltaMs);
}

/**
 * Nové kolo po výhře/prohře (viz zadání "restart musí... fungovat opakovaně
 * bez restartu Node procesu") — no-op, dokud kolo neskončilo. Hráči, co jsou
 * teď připojení, dostanou čerstvý spawn a plný časovač; monstrum se vrátí do
 * výchozího stavu. Odpojení (ale rezervovaní) hráči se nepřidávají — vrátí
 * se přes běžný rejoin, stejně jako do právě běžícího kola.
 */
export function restartRound(room: DevRoom): void {
  if (room.state.roundStatus !== "won" && room.state.roundStatus !== "lost") return;

  const connectedPlayerIds = room.slots.filter((slot): slot is SlotOccupant => slot !== null && slot.connected).map((slot) => slot.playerId);

  room.lastInputByPlayer = new Map();
  const freshState = createInitialMultiplayerSurvivalState(connectedPlayerIds, [MONSTER_ID]);
  room.state = freshState.roundStatus === "playing" ? { ...freshState, remainingMs: room.roundDurationMs } : freshState;
}

export function nextSnapshotSeq(room: DevRoom): number {
  room.seq += 1;
  return room.seq;
}
