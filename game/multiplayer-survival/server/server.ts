// socket.io glue pro multiplayer-survival dev server — vzor převzatý z
// ~/PhpstormProjects/project-hub-api/src/ws/onlineGameSocket.ts (Osmá liga):
// `join` s tokenem, server tick loop v setInterval, `input` jen zapisuje do
// stavu, snapshoty broadcastované celé místnosti. Opravené slabiny oproti
// tomu vzoru (viz README.md):
//   1. `socket.on('disconnect', ...)` SKUTEČNĚ existuje (Osmá liga ho vůbec
//      neposlouchá) — označí hráče jako odpojeného, slot zůstává rezervovaný
//      pro token (jednoduchý rejoin), NEODEBÍRÁ hráče z engine stavu.
//   2. Snapshot nese monotónní `seq` (Osmá liga posílá `tick`, ale
//      nekontroluje ho) — klient (useMultiplayerSurvivalOnline.ts)
//      zahazuje cokoliv se `seq <= lastAppliedSeq`.
//   3. Aplikační ping/pong pro RTT v UI, nezávislé na transportním
//      ping/pong socket.io (ten řeší jen "je socket vůbec živý").
//
// Server je autoritativní pro VŠECHNO (pohyb, monstrum, targetPlayerId,
// zásahy, pickupy) — klient posílá jen `input`, engine (`tickMultiplayerSurvival`,
// beze změny) běží výhradně tady.

import { Server as IOServer } from "socket.io";
import * as http from "node:http";
import { MAX_PLAYERS } from "../engine/config";
import { createDevRoom, DevRoom, joinRoom, markSlotConnection, nextSnapshotSeq, restartRound, setPlayerInput, tickRoom } from "./room";
import { ClientToServerEvents, DEV_ROOM_CODE, JoinRequest, ServerToClientEvents } from "./protocol";
import { PlayerId } from "../state/types";

export const TICK_MS = 50; // 20 ticků/s — bohatě stačí pro lokální dev test dvou oken na jednom stroji.

export interface MultiplayerSurvivalDevServerHandle {
  io: IOServer<ClientToServerEvents, ServerToClientEvents>;
  room: DevRoom;
  stop: () => void;
}

export interface MultiplayerSurvivalDevServerOptions {
  /** Přebije `ROUND_DURATION_MS` (engine/config.ts) — jen pro lokální zkrácené testování (viz README.md), produkční deploy tenhle parametr nepoužívá. */
  roundDurationMs?: number;
}

export function attachMultiplayerSurvivalSocket(httpServer: http.Server, corsOrigins: string[], options: MultiplayerSurvivalDevServerOptions = {}): MultiplayerSurvivalDevServerHandle {
  const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: corsOrigins, methods: ["GET", "POST"] },
    path: "/socket.io/",
  });

  const room = createDevRoom(options.roundDurationMs);

  io.on("connection", (socket) => {
    let joinedPlayerId: PlayerId | null = null;

    socket.on("join", (request: JoinRequest) => {
      if (request.code !== DEV_ROOM_CODE) {
        socket.emit("error", { message: "Unknown room" });
        return;
      }
      const result = joinRoom(room, request.token);
      if (!result.ok) {
        socket.emit("error", { message: `Room is full (max ${MAX_PLAYERS} players in this dev room)` });
        return;
      }
      joinedPlayerId = result.playerId;
      void socket.join(DEV_ROOM_CODE);
      socket.emit("joined", { playerId: result.playerId, slot: result.slot, token: result.token });
      socket.to(DEV_ROOM_CODE).emit("player_reconnected", { playerId: result.playerId });
    });

    socket.on("input", (input) => {
      if (!joinedPlayerId) return;
      setPlayerInput(room, joinedPlayerId, { moveX: Number(input.moveX) || 0, moveY: Number(input.moveY) || 0, firing: !!input.firing });
    });

    socket.on("ping", (message) => {
      socket.emit("pong", { clientTimeMs: message.clientTimeMs, serverTimeMs: Date.now() });
    });

    // Restart je no-op v room.ts, dokud kolo neskončilo (won/lost) — bezpečné
    // zavolat z libovolného joinnutého klienta, žádné "host" oprávnění v
    // týhle fázi (viz zadání "nepřidávej zbytečně enterprise-level" věci).
    socket.on("restart_round", (request) => {
      if (!joinedPlayerId || request.code !== DEV_ROOM_CODE) return;
      restartRound(room);
    });

    // Oprava #1 (viz komentář nahoře) — Osmá liga tenhle handler vůbec nemá.
    socket.on("disconnect", () => {
      if (!joinedPlayerId) return;
      markSlotConnection(room, joinedPlayerId, false);
      io.to(DEV_ROOM_CODE).emit("player_disconnected", { playerId: joinedPlayerId });
    });
  });

  const interval = setInterval(() => {
    tickRoom(room, TICK_MS);
    const seq = nextSnapshotSeq(room);
    io.to(DEV_ROOM_CODE).emit("snapshot", { seq, state: room.state });
  }, TICK_MS);

  return {
    io,
    room,
    stop: () => {
      clearInterval(interval);
      io.close();
    },
  };
}

/** Samostatný spustitelný dev server — viz scripts/dev-multiplayer-survival-server.mjs. Ne součást Next.js appky (dlouho běžící proces, na Vercelu serverless funkce nefunguje — pro veřejný deploy potřebuje vlastní dlouho běžící Node proces, viz README.md "Nasazení"). */
export function startMultiplayerSurvivalDevServer(port: number, corsOrigins: string[], options: MultiplayerSurvivalDevServerOptions = {}): MultiplayerSurvivalDevServerHandle {
  const httpServer = http.createServer();
  const handle = attachMultiplayerSurvivalSocket(httpServer, corsOrigins, options);
  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[multiplayer-survival] dev server listening on :${port} (room "${DEV_ROOM_CODE}")`);
  });
  return handle;
}
