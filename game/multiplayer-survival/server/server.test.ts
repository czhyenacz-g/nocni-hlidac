import * as http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { attachMultiplayerSurvivalSocket, MultiplayerSurvivalDevServerHandle } from "./server";

let handle: MultiplayerSurvivalDevServerHandle | null = null;
let httpServer: http.Server | null = null;

afterEach(async () => {
  handle?.stop();
  await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
  handle = null;
  httpServer = null;
});

function startOnEphemeralPort(corsOrigins: string[] = ["https://nocni-hlidac.cz"]): Promise<number> {
  httpServer = http.createServer();
  handle = attachMultiplayerSurvivalSocket(httpServer, corsOrigins);
  return new Promise((resolve) => {
    httpServer!.listen(0, "127.0.0.1", () => {
      const address = httpServer!.address();
      if (address === null || typeof address === "string") throw new Error("expected an AddressInfo");
      resolve(address.port);
    });
  });
}

function getJson(port: number, path: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: raw ? JSON.parse(raw) : null }));
      })
      .on("error", reject);
  });
}

function getStatus(port: number, path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        res.resume(); // drain — engine.io's own response body isn't plain JSON, we only care about the status here.
        res.on("end", () => resolve(res.statusCode ?? 0));
      })
      .on("error", reject);
  });
}

describe("GET /health", () => {
  it("responds 200 with a minimal, non-sensitive status payload", async () => {
    const port = await startOnEphemeralPort();
    const { status, body } = await getJson(port, "/health");

    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok", service: "multiplayer-survival" });
  });

  it("does not leak room/player state through the health endpoint", async () => {
    const port = await startOnEphemeralPort();
    const { body } = await getJson(port, "/health");

    // "multiplayer-survival" (the service name) legitimately contains
    // "player" as a substring — check for the actual sensitive fields
    // instead of a naive "player" match.
    expect(JSON.stringify(body)).not.toMatch(/playerId|token|"room"|players\[|slots/i);
  });

  it("does not interfere with socket.io's own path", async () => {
    const port = await startOnEphemeralPort();
    const status = await getStatus(port, "/socket.io/?EIO=4&transport=polling");
    // Not 404 — engine.io's own handler responded (exact body isn't ours to
    // assert on, just that our /health listener didn't swallow this request).
    expect(status).not.toBe(404);
  });
});
