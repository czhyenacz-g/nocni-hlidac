#!/usr/bin/env node
// `npm run dev:mp-survival-server` — spustí samostatný socket.io dev server
// pro game/multiplayer-survival/ (viz game/multiplayer-survival/README.md).
// NENÍ součástí Next.js appky/Vercel deploye — dlouho běžící proces jen pro
// lokální testování dvou oken prohlížeče proti jedné pevné dev místnosti.

import { startMultiplayerSurvivalDevServer } from "../game/multiplayer-survival/server/server.ts";

const port = Number(process.env.MULTIPLAYER_SURVIVAL_WS_PORT ?? 4001);
const corsOrigins = (process.env.MULTIPLAYER_SURVIVAL_CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001").split(",");
// Jen pro lokální rychlé testování 5minutového kola (viz README.md "Jak
// dočasně zkrátit kolo pro test") — produkční výchozí (ROUND_DURATION_MS)
// se použije, pokud proměnná není nastavená.
const roundDurationMs = process.env.MULTIPLAYER_SURVIVAL_ROUND_MS ? Number(process.env.MULTIPLAYER_SURVIVAL_ROUND_MS) : undefined;

startMultiplayerSurvivalDevServer(port, corsOrigins, { roundDurationMs });
