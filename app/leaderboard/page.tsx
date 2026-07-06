import type { Metadata } from "next";
import Link from "next/link";
import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { getLeaderboardEntries } from "@/lib/leaderboard/mockLeaderboard";

export const metadata: Metadata = {
  title: COPY.leaderboard.seoTitle,
  description: COPY.leaderboard.seoDescription,
};

// Zatím jen mock data (viz lib/leaderboard/mockLeaderboard.ts) — žádné API,
// žádná DB, žádné ukládání výsledků směny. Stejné pozadí jako menu/terms
// (BACKGROUND_SCENES.menu), širší panel než about/terms kvůli tabulce, ale
// pořád ve stejném pixel/horror stylu.
export default async function LeaderboardPage() {
  const entries = await getLeaderboardEntries();

  return (
    <main className="relative min-h-screen flex flex-col items-center p-4 py-10">
      <SceneBackground scene={BACKGROUND_SCENES.menu} />

      <div className="w-full max-w-2xl pixel-panel p-6 sm:p-8">
        <h1 className="text-xl font-bold mb-1 text-red-500 text-center">{COPY.leaderboard.heading}</h1>
        <p className="text-sm text-gray-500 mb-6 text-center italic">{COPY.leaderboard.subheading}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="py-2 pr-2 font-normal">{COPY.leaderboard.columnRank}</th>
                <th className="py-2 pr-2 font-normal">{COPY.leaderboard.columnGuard}</th>
                <th className="py-2 pr-2 font-normal whitespace-nowrap">{COPY.leaderboard.columnNights}</th>
                <th className="py-2 pr-2 font-normal">{COPY.leaderboard.columnEndReason}</th>
                <th className="py-2 font-normal whitespace-nowrap">{COPY.leaderboard.columnRecordedAt}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.guardName}-${entry.recordedAt}`} className="border-b border-gray-800 text-gray-300">
                  <td className="py-2 pr-2 text-gray-500">{index + 1}.</td>
                  <td className="py-2 pr-2 font-bold text-amber-300 whitespace-nowrap">{entry.guardName}</td>
                  <td className="py-2 pr-2">{entry.survivedNights}</td>
                  <td className="py-2 pr-2 text-gray-400">{entry.endReason}</td>
                  <td className="py-2 text-gray-500 whitespace-nowrap">{entry.recordedAt}</td>
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
