import type { NextConfig } from "next";

// Vercel automaticky nastaví VERCEL_GIT_COMMIT_SHA při každém buildu (žádná
// vlastní konfigurace na Vercelu potřeba) — `env` blok tuhle hodnotu vloží do
// klientského bundlu v build-time (viz game/core/buildInfo.ts, Footer.tsx),
// ať jde na hlavní stránce poznat, že proběhl nový deploy, i když se
// GAME_VERSION zrovna ručně nezvýšila. Lokální `npm run dev`/`build` bez
// Vercelu nemá VERCEL_GIT_COMMIT_SHA vůbec — fallback "dev" řeší
// buildInfo.ts, ne tady (undefined se prostě propíše dál).
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
