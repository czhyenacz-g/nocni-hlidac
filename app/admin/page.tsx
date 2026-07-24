import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { fetchAdminActivityEvents, fetchAdminPlayers, PlayerActivityEventType } from "@/lib/admin/adminOverview";
import { resolveAdminPageAccess } from "@/lib/admin/resolveAdminPageAccess";

// Admin-only interní stránka — vynechaná z vyhledávání (viz zadání "Stránka
// má být jednoduchá a funkční, bez rozsáhlého designu", žádný SceneBackground/
// menu-terminal-frame jako zbytek appky).
export const metadata: Metadata = { title: "Admin — Noční hlídač", robots: { index: false, follow: false } };

// Stejný důvod jako app/leaderboard/page.tsx — živá data z VPS API při
// každém requestu, ne zamrzlá na buildu.
export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<PlayerActivityEventType, string> = {
  login: "Přihlášení",
  game_started: "Spuštění hry",
  night_survived: "Přežitá noc",
  player_died: "Smrt hráče",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Prague" });

/** Jediný datum formátovací helper v projektu zatím neexistuje (viz audit) — malá lokální funkce místo nové knihovny. */
function formatCzechDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMATTER.format(date);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminPage() {
  const session = await getSession();
  const access = resolveAdminPageAccess(session);

  if (access === "guest") {
    return (
      <main className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center gap-4 p-6 font-mono text-sm">
        <p>Pro přístup na /admin se musíš přihlásit přes Discord.</p>
        <a href="/api/auth/login" className="underline text-blue-300">
          Přihlásit přes Discord
        </a>
      </main>
    );
  }

  if (access === "forbidden") {
    return (
      <main className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center p-6 font-mono text-sm">
        <p>Tahle stránka je jen pro administrátory.</p>
      </main>
    );
  }

  const [players, events] = await Promise.all([fetchAdminPlayers(100), fetchAdminActivityEvents(100)]);
  const playerList = players ?? [];
  const eventList = events ?? [];

  // Hráči bez aktivity (lastActivityAt === null) až dole (viz zadání "10.
  // Řazení" — "Hráči bez aktivity mají být až dole") — VPS strana sice už
  // vrací seřazené, ale tahle stránka si to nezávisle ověří/dorovná, ať
  // pořadí nezávisí jen na tom, že se hub nikdy nezmění.
  const sortedPlayers = [...playerList].sort((a, b) => {
    if (a.lastActivityAt === b.lastActivityAt) return 0;
    if (a.lastActivityAt === null) return 1;
    if (b.lastActivityAt === null) return -1;
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });

  const now = Date.now();
  const playedLast24h = playerList.filter((p) => p.lastPlayedAt !== null && now - new Date(p.lastPlayedAt).getTime() < DAY_MS).length;
  const lastActivityAt = sortedPlayers.find((p) => p.lastActivityAt !== null)?.lastActivityAt ?? null;

  const hubUnavailable = players === null && events === null;

  return (
    <main className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 font-mono text-xs sm:text-sm">
      <h1 className="text-lg font-bold mb-4">Admin — Noční hlídač</h1>

      {hubUnavailable && (
        <p className="mb-4 text-amber-400">VPS API není nakonfigurované nebo neodpovídá — data níže mohou být prázdná.</p>
      )}

      <div className="flex flex-wrap gap-6 mb-6">
        <div>
          <div className="text-gray-500">Celkem hráčů</div>
          <div className="text-xl font-bold">{playerList.length}</div>
        </div>
        <div>
          <div className="text-gray-500">Hráli za posledních 24 hodin</div>
          <div className="text-xl font-bold">{playedLast24h}</div>
        </div>
        <div>
          <div className="text-gray-500">Poslední zaznamenaná aktivita</div>
          <div className="text-xl font-bold">{formatCzechDateTime(lastActivityAt)}</div>
        </div>
      </div>

      <h2 className="font-bold mb-2">Hráči</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-700">
              <th className="p-2">Hráč</th>
              <th className="p-2">Discord ID</th>
              <th className="p-2">Poslední přihlášení</th>
              <th className="p-2">Poslední hraní</th>
              <th className="p-2">Poslední aktivita</th>
              <th className="p-2">Klient</th>
              <th className="p-2">Build</th>
              <th className="p-2">Hardcore rekord</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <tr key={player.discordUserId} className="border-b border-gray-800">
                <td className="p-2">{player.displayName ?? player.username}</td>
                <td className="p-2">{player.discordUserId}</td>
                <td className="p-2">{formatCzechDateTime(player.lastLoginAt)}</td>
                <td className="p-2">{formatCzechDateTime(player.lastPlayedAt)}</td>
                <td className="p-2">{formatCzechDateTime(player.lastActivityAt)}</td>
                <td className="p-2">{player.lastClient ?? "—"}</td>
                <td className="p-2">{player.lastBuildVersion ?? "—"}</td>
                <td className="p-2">{player.hardcoreBestNight}</td>
              </tr>
            ))}
            {sortedPlayers.length === 0 && (
              <tr>
                <td className="p-2 text-gray-500" colSpan={8}>
                  Žádní hráči.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-bold mb-2">Poslední události</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-700">
              <th className="p-2">Čas</th>
              <th className="p-2">Hráč</th>
              <th className="p-2">Událost</th>
              <th className="p-2">Noc</th>
              <th className="p-2">Režim</th>
              <th className="p-2">Klient</th>
              <th className="p-2">Build</th>
            </tr>
          </thead>
          <tbody>
            {eventList.map((event) => (
              <tr key={event.id} className="border-b border-gray-800">
                <td className="p-2">{formatCzechDateTime(event.createdAt)}</td>
                <td className="p-2">{event.displayName ?? event.username}</td>
                <td className="p-2">{EVENT_LABELS[event.eventType] ?? event.eventType}</td>
                <td className="p-2">{event.nightNumber ?? "—"}</td>
                <td className="p-2">{event.gameMode ?? "—"}</td>
                <td className="p-2">{event.client ?? "—"}</td>
                <td className="p-2">{event.buildVersion ?? "—"}</td>
              </tr>
            ))}
            {eventList.length === 0 && (
              <tr>
                <td className="p-2 text-gray-500" colSpan={7}>
                  Žádné události.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
