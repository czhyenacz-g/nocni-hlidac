import type { Metadata } from "next";
import Link from "next/link";
import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { getLeaderboardEntries } from "@/lib/leaderboard/getLeaderboardEntries";
import { formatNights } from "@/lib/leaderboard/formatNights";

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
// Stejné pozadí jako menu/terms (BACKGROUND_SCENES.menu), širší panel než
// about/terms kvůli tabulce, ale pořád ve stejném pixel/horror stylu.
export default async function LeaderboardPage() {
  const entries = await getLeaderboardEntries();

  return (
    <main className="relative min-h-screen flex flex-col items-center p-4 py-10">
      <SceneBackground scene={BACKGROUND_SCENES.menu} />

      <div className="w-full max-w-2xl pixel-panel p-6 sm:p-8">
        <h1 className="text-xl font-bold mb-1 text-red-500 text-center">{COPY.leaderboard.heading}</h1>
        <p className="text-sm text-gray-500 mb-4 text-center italic">{COPY.leaderboard.subheading}</p>
        <p className="text-xs text-gray-600 mb-6 text-center">{COPY.leaderboard.explanation}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="py-2 pr-2 font-normal">{COPY.leaderboard.columnRank}</th>
                <th className="py-2 pr-2 font-normal">{COPY.leaderboard.columnGuard}</th>
                <th className="py-2 pr-2 font-normal whitespace-nowrap">{COPY.leaderboard.columnBestRun}</th>
                <th className="py-2 font-normal whitespace-nowrap">{COPY.leaderboard.columnCurrentRun}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.guardName} className="border-b border-gray-800 text-gray-300">
                  <td className="py-2 pr-2 text-gray-500">{index + 1}.</td>
                  <td className="py-2 pr-2 font-bold text-amber-300 whitespace-nowrap">{entry.guardName}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">{formatNights(entry.bestRun)}</td>
                  <td className="py-2 whitespace-nowrap">
                    {entry.currentRun === 0 ? (
                      <span className="text-gray-600">{COPY.leaderboard.noActiveRunLabel}</span>
                    ) : (
                      formatNights(entry.currentRun)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Link href="/play" className="block mt-8 text-center text-xs text-gray-500 hover:text-gray-300">
          {COPY.leaderboard.backToGameLabel}
        </Link>
      </div>
    </main>
  );
}
