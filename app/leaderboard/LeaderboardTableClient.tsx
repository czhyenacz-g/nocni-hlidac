"use client";

import Link from "next/link";
import { useTranslation } from "@/game/i18n/useTranslation";
import { formatNights } from "@/lib/leaderboard/formatNights";
import type { GuardLeaderboardEntry } from "@/lib/leaderboard/types";

interface LeaderboardTableClientProps {
  entries: GuardLeaderboardEntry[];
}

// Vytažené z app/leaderboard/page.tsx (server component tam jen fetchuje
// entries + nese metadata, viz tam) — hooky (useCopy) potřebují klientský strom.
export default function LeaderboardTableClient({ entries }: LeaderboardTableClientProps) {
  const { copy: COPY, language } = useTranslation();

  return (
    <div className="menu-terminal-screen pixel-screen-static">
      <div className="menu-terminal-header">
        <span>Objekt 13 · Síň slávy</span>
        <span className="menu-terminal-led" aria-hidden="true" />
      </div>

      <div className="p-6 sm:p-8">
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
                  <td className="py-2 pr-2 whitespace-nowrap">{formatNights(entry.bestRun, language)}</td>
                  <td className="py-2 whitespace-nowrap">
                    {entry.currentRun === 0 ? (
                      <span className="text-gray-600">{COPY.leaderboard.noActiveRunLabel}</span>
                    ) : (
                      formatNights(entry.currentRun, language)
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
    </div>
  );
}
