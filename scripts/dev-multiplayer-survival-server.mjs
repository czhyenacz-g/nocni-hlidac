#!/usr/bin/env node
// `npm run dev:mp-survival-server` — SAME entrypoint pro lokální dev i pro
// produkční nasazení na VPS (viz game/multiplayer-survival/README.md
// "Nasazení na VPS") — chování se řídí čistě environment proměnnými, žádný
// samostatný "prod" skript.

import { startMultiplayerSurvivalDevServer } from "../game/multiplayer-survival/server/server.ts";

// `PORT` je standardní název pro dlouho běžící procesy (Docker/PM2/systemd,
// stejná konvence jako project-hub-api na tomtéž VPS) — `MULTIPLAYER_SURVIVAL_WS_PORT`
// zůstává jako alias jen pro zpětnou kompatibilitu s dřívějším lokálním nastavením.
const port = Number(process.env.PORT ?? process.env.MULTIPLAYER_SURVIVAL_WS_PORT ?? 4001);

const corsOrigins = (process.env.MULTIPLAYER_SURVIVAL_CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Jen pro lokální rychlé testování 5minutového kola (viz README.md "Jak
// dočasně zkrátit kolo pro test") — produkční výchozí (ROUND_DURATION_MS)
// se použije, pokud proměnná není nastavená.
const roundDurationMs = process.env.MULTIPLAYER_SURVIVAL_ROUND_MS ? Number(process.env.MULTIPLAYER_SURVIVAL_ROUND_MS) : undefined;

// eslint-disable-next-line no-console
console.log(`[multiplayer-survival] starting — NODE_ENV=${process.env.NODE_ENV ?? "development"}, port=${port}, corsOrigins=${JSON.stringify(corsOrigins)}`);

if (process.env.NODE_ENV === "production" && !process.env.MULTIPLAYER_SURVIVAL_CORS_ORIGINS) {
  // Nejde o bezpečnostní díru (chybějící env prostě znamená, že produkční
  // doména nebude v CORS allow-listu, takže handshake selže bezpečně), ale
  // stojí za nahlas vypsané varování, ať se to hned pozná v logu.
  // eslint-disable-next-line no-console
  console.warn("[multiplayer-survival] WARNING: NODE_ENV=production but MULTIPLAYER_SURVIVAL_CORS_ORIGINS is not set — falling back to localhost-only CORS origins");
}

startMultiplayerSurvivalDevServer(port, corsOrigins, { roundDurationMs });
