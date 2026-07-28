"use client";

// Klientský hook pro skutečný (websocketový) multiplayer-survival dev
// server (viz server.ts, README.md) — vzor převzatý z
// ~/PhpstormProjects/osma-liga/components/online/useOnlineGame.ts (Osmá
// liga): connect → `join` s tokenem z localStorage → poslouchej `joined`/
// `snapshot`/`error`, pošli `input`.
//
// Opravy oproti tomu vzoru (viz server.ts hlavička a README.md):
//   - zahazuje snapshoty se `seq <= lastAppliedSeq` (Osmá liga tohle vůbec
//     nekontroluje, přepisuje stav slepě podle pořadí PŘÍCHODU, ne podle
//     autoritativního pořadového čísla).
//   - lokální hráč se NELERPUJE jako vzdálené entity — pohyb se aplikuje
//     OKAMŽITĚ lokální predikcí (stejné čisté funkce jako server), server
//     snapshot pak jen koriguje/snapne lokálního hráče na autoritativní
//     pozici. Monstrum/pickupy/vzdálený hráč se vždy vykreslují přímo z
//     posledního přijatého snapshotu, beze změny.

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { directionFromVector, moveWithWallSliding } from "../../minigame/logic";
import { MultiplayerSurvivalState, PlayerId } from "../state/types";
import { DEV_ROOM_CODE, JoinedResponse, shouldAcceptSnapshot } from "./protocol";

const TOKEN_STORAGE_KEY = "mp-survival-dev-token";

/** Jak dlouho čekat na "connect"/"joined", než se stav přepne na "unreachable" (viz zadání "po ~8-10s bez úspěšného spojení"). Socket.io mezitím dál zkouší na pozadí (reconnection zůstává zapnuté) — timeout je čistě UX rozhodnutí, ne zrušení pokusu o spojení. */
const CONNECT_TIMEOUT_MS = 9_000;

export type ConnectionStatus = "connecting" | "joined" | "full" | "unreachable" | "error" | "disconnected";

export interface MultiplayerSurvivalOnlineHookResult {
  status: ConnectionStatus;
  errorMessage: string | null;
  playerId: PlayerId | null;
  state: MultiplayerSurvivalState | null;
  lastAppliedSeq: number;
  pingMs: number | null;
  sendInput: (moveX: number, moveY: number, firing: boolean) => void;
  /** Vyžádá nové kolo (viz server/room.ts#restartRound) — no-op na serveru, dokud aktuální kolo neskončilo (won/lost). */
  sendRestart: () => void;
  /** Zahodí aktuální socket a vytvoří nový (viz zadání "tlačítko Zkusit znovu musí vytvořit nové spojení") — pro `"unreachable"`/`"error"`/`"disconnected"` stavy. */
  retry: () => void;
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function storeToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function useMultiplayerSurvivalOnline(serverUrl: string): MultiplayerSurvivalOnlineHookResult {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<PlayerId | null>(null);
  const [state, setState] = useState<MultiplayerSurvivalState | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const lastAppliedSeqRef = useRef(0);
  const [lastAppliedSeq, setLastAppliedSeq] = useState(0);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setStatus("connecting");
    setErrorMessage(null);

    const socket = io(serverUrl, { path: "/socket.io/", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    // Nenechat uživatele v nekonečném "Připojuji se..." (viz zadání) — pokud
    // se nepřipojíme/nejoinneme do CONNECT_TIMEOUT_MS, ukaž "server
    // nedostupný". Socket.io mezitím dál zkouší na pozadí; funkční
    // update ignoruje timeout, pokud mezitím status pokročil (joined/full/error).
    const unreachableTimer = setTimeout(() => {
      setStatus((current) => (current === "connecting" ? "unreachable" : current));
    }, CONNECT_TIMEOUT_MS);

    socket.on("connect", () => {
      socket.emit("join", { code: DEV_ROOM_CODE, token: readStoredToken() });
    });

    // Selhání handshake (server dole/nedostupný) — nepřepínat hned na
    // "unreachable" při první ráně (běžné krátké zaškobrtnutí by blikalo),
    // necháme to na `unreachableTimer` výše.
    socket.on("connect_error", () => {});

    socket.on("joined", (response: JoinedResponse) => {
      clearTimeout(unreachableTimer);
      storeToken(response.token);
      setPlayerId(response.playerId);
      setStatus("joined");
      setErrorMessage(null);
    });

    socket.on("error", ({ message }) => {
      clearTimeout(unreachableTimer);
      setErrorMessage(message);
      setStatus(message.toLowerCase().includes("full") ? "full" : "error");
    });

    socket.on("snapshot", ({ seq, state: nextState }) => {
      // Oprava: zahodit zastaralý/přeskočený-pořadím snapshot (viz zadání
      // "ignorování starších snapshotů").
      if (!shouldAcceptSnapshot(lastAppliedSeqRef.current, seq)) return;
      lastAppliedSeqRef.current = seq;
      setLastAppliedSeq(seq);
      setState(nextState);
    });

    socket.on("pong", ({ clientTimeMs }) => {
      setPingMs(Date.now() - clientTimeMs);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    const pingInterval = setInterval(() => {
      socket.emit("ping", { clientTimeMs: Date.now() });
    }, 2000);

    return () => {
      clearTimeout(unreachableTimer);
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, [serverUrl, retryToken]);

  const sendInput = useCallback((moveX: number, moveY: number, firing: boolean) => {
    socketRef.current?.emit("input", { moveX, moveY, firing });
  }, []);

  const sendRestart = useCallback(() => {
    socketRef.current?.emit("restart_round", { code: DEV_ROOM_CODE });
  }, []);

  // Zahodí + znovu vytvoří socket (viz efekt výše, `retryToken` v deps) —
  // nový token z localStorage se pošle znovu, takže rejoin na stejný slot
  // funguje i po "Zkusit znovu".
  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  return { status, errorMessage, playerId, state, lastAppliedSeq, pingMs, sendInput, sendRestart, retry };
}

/**
 * Lokální predikce pohybu VLASTNÍHO hráče — stejné čisté funkce jako server
 * (moveWithWallSliding/directionFromVector, importované beze změny), volané
 * na klientovi mezi dvěma snapshoty, ať ovládání necítí round-trip latenci.
 * Server je pořád autoritativní — příští přijatý snapshot predikci přepíše
 * (jednoduché "snap" srovnání, ne plný rollback/replay nepotvrzených vstupů,
 * viz README.md "co je zjednodušené").
 */
export function predictLocalPlayerPosition(
  player: { x: number; y: number; radius: number; direction: import("../state/types").Direction; speed: number },
  moveX: number,
  moveY: number,
  walls: import("../state/types").MapWall[],
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number; direction: import("../state/types").Direction } {
  const dx = moveX * player.speed;
  const dy = moveY * player.speed;
  const moved = moveWithWallSliding(player.x, player.y, dx, dy, player.radius, walls, mapWidth, mapHeight);
  const direction = dx === 0 && dy === 0 ? player.direction : directionFromVector(dx, dy, player.direction);
  return { x: moved.x, y: moved.y, direction };
}
