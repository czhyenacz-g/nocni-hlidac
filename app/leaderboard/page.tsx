import type { Metadata } from "next";
import { COPY_CS as COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { getLeaderboardEntries } from "@/lib/leaderboard/getLeaderboardEntries";
import LeaderboardTableClient from "./LeaderboardTableClient";

// Next.js Metadata se generuje server-side, před renderem — nemůže volat
// useCopy() (React hook, potřebuje LanguageProvider kontext), proto zůstává
// staticky česky (viz game/i18n/metadata.ts pro budoucí anglický build).
export const metadata: Metadata = {
  title: COPY.leaderboard.seoTitle,
  description: COPY.leaderboard.seoDescription,
};

// Vynuceně dynamické — bez tohohle Next.js za určitých okolností (build bez
// nastavených NOCNI_HLIDAC_API_* proměnných, build cache, budoucí změna
// prerender heuristiky) stránku staticky vygeneruje při `next build` a
// zamrzne na datech z toho okamžiku, i když getLeaderboardEntries() interně
// volá `fetch(..., { cache: "no-store" })` na živé VPS API (viz
// lib/hubClient.ts). Ověřeno lokálním buildem bez env proměnných: stránka
// vyšla jako "○ Static" místo "ƒ Dynamic". Na produkci (Vercel má env
// proměnné při buildu) se to zatím neprojevovalo (x-vercel-cache: MISS na
// každý request), ale spoléhat na tenhle nepřímý signál je křehké — radši
// explicitně, ať `/leaderboard` vždycky ukazuje živá data bez ohledu na to,
// jaký byl stav env proměnných v okamžiku posledního buildu.
export const dynamic = "force-dynamic";

// getLeaderboardEntries() zkusí soukromé VPS API (viz lib/hubClient.ts,
// lib/leaderboard/remoteLeaderboard.ts) a spadne na mock data
// (lib/leaderboard/mockLeaderboard.ts), pokud API není nakonfigurované nebo
// selže — stránka o tom vůbec neví, jen dostane GuardLeaderboardEntry[].
// Zobrazení (i18n texty, tabulka) žije v LeaderboardTableClient.tsx (hooky
// potřebují klientský strom) — tahle stránka jen fetchuje data + nese metadata.
export default async function LeaderboardPage() {
  const entries = await getLeaderboardEntries();

  return (
    <main className="relative min-h-screen flex flex-col items-center p-4 py-10">
      <SceneBackground scene={BACKGROUND_SCENES.menu} />

      {/* Stejný "terminál" obal jako MainMenuScreen/BriefingScreen/DeathScreen/
          WinScreen — kovový rám + 4 šrouby + zapuštěná obrazovka, jen širší
          panel (max-w-2xl) kvůli tabulce. */}
      <div className="w-full max-w-2xl menu-terminal-frame relative z-10">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <LeaderboardTableClient entries={entries} />
      </div>
    </main>
  );
}
