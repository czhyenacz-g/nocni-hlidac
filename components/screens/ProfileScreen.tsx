"use client";

import { useState } from "react";
import Link from "next/link";
import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { getMonsterDefeatReward, resetMonsterDefeatReward } from "@/game/core/monsterDefeatReward";
import { getPlayerProfileStats, resetPlayerProfileStats, PlayerProfileStats } from "@/game/core/playerProfileStats";
import { resolvePlayerAchievements } from "@/game/core/playerAchievements";

// Profil hlídače (viz zadání) — první verze budoucího účtu/profilu, čistě
// lokální localStorage data (game/core/monsterDefeatReward.ts,
// game/core/playerProfileStats.ts, game/core/playerAchievements.ts). Veřejně
// dostupná bez Discord loginu — přihlášení jen doplní jméno/avatar navrch
// (viz useAuthStatus, stejný hook jako AuthStatus.tsx v hlavním menu), hra
// samotná se přihlášením nijak nemění.
//
// "use client" komponenta (localStorage čtení může běžet jen v prohlížeči) —
// stránka app/profile/page.tsx zůstává Server Component kvůli metadata
// exportu, stejný vzor jako MainMenuScreen.tsx pod app/play/page.tsx.
export default function ProfileScreen() {
  const authStatus = useAuthStatus();
  // Čte se jednou při mountu (stejný vzor jako MainMenuScreen.tsx#reward) —
  // "Resetovat lokální profil" níže vynutí remount přes location.reload(),
  // ať se nemusí ručně sestavovat druhý zdroj pravdy pro live re-render.
  const [reward] = useState(() => getMonsterDefeatReward());
  const [stats] = useState<PlayerProfileStats>(() => getPlayerProfileStats());
  const achievements = resolvePlayerAchievements(stats, reward);

  const statTiles: { label: string; value: number }[] = [
    { label: COPY.profile.statTotalDeaths, value: stats.totalDeaths },
    { label: COPY.profile.statTotalRunsStarted, value: stats.totalRunsStarted },
    { label: COPY.profile.statTotalNightsSurvived, value: stats.totalNightsSurvived },
    { label: COPY.profile.statHardcoreBestNight, value: stats.hardcoreBestNight },
    { label: COPY.profile.statBulbsReplaced, value: stats.bulbsReplaced },
    { label: COPY.profile.statGeneratorsRestarted, value: stats.generatorsRestarted },
    { label: COPY.profile.statExpeditionsStarted, value: stats.expeditionsStarted },
    { label: COPY.profile.statExpeditionsReturned, value: stats.expeditionsReturned },
    { label: COPY.profile.statMonsterHitsConfirmed, value: stats.monsterHitsConfirmed },
    { label: COPY.profile.statMonsterKills, value: stats.monsterKills },
  ];

  // Dev/debug nástroj (viz zadání "později schovat za dev mode") — resetuje
  // OBĚ lokální úložiště (reward i stats), pak vynutí čerstvé načtení
  // stránky, ať se nemusí ručně synchronizovat lokální React state s nově
  // vynulovanými daty.
  function handleResetLocalProfile() {
    if (!window.confirm(COPY.profile.resetConfirmLabel)) return;
    resetPlayerProfileStats();
    resetMonsterDefeatReward();
    window.location.reload();
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center p-4 py-10">
      <SceneBackground scene={BACKGROUND_SCENES.about} />

      <div className="w-full max-w-2xl menu-terminal-frame relative z-10">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <div className="menu-terminal-screen pixel-screen-static">
          <div className="menu-terminal-header">
            <span>Objekt 13 · Osobní spis</span>
            <span className="menu-terminal-led" aria-hidden="true" />
          </div>

          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold mb-1 text-red-500 text-center">{COPY.profile.heading}</h1>

            {authStatus.status === "authenticated" && (
              <div className="flex items-center justify-center gap-2 mb-6 text-xs text-gray-400">
                {authStatus.player.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={authStatus.player.avatarUrl}
                    alt=""
                    aria-hidden="true"
                    className="w-6 h-6 rounded-full border border-gray-700"
                  />
                )}
                <span>{authStatus.player.displayName ?? authStatus.player.username}</span>
              </div>
            )}
            {authStatus.status !== "authenticated" && <div className="mb-6" />}

            {/* Sekce 1: Služební karta. */}
            <section className="console-panel p-4 mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">{COPY.profile.serviceCardHeading}</h2>
              <div className="flex flex-col gap-1.5 text-sm">
                <p>
                  <span className="text-gray-500">{COPY.profile.statusLabel}: </span>
                  <span className={reward.hasDefeatedMonster ? "text-amber-300 font-bold" : "text-gray-300"}>
                    {reward.hasDefeatedMonster ? COPY.profile.statusGolden : COPY.profile.statusRookie}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">{COPY.profile.rewardLabel}: </span>
                  <span className={reward.doubleBarrelUnlocked ? "text-amber-300" : "text-gray-500"}>
                    {reward.doubleBarrelUnlocked ? COPY.profile.rewardUnlocked : COPY.profile.rewardLocked}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">{COPY.profile.monsterDefeatsLabel}: </span>
                  <span className="text-gray-300">{reward.monsterDefeatsCount}</span>
                </p>
              </div>
              <p className="mt-3 text-xs text-gray-500 italic">
                {reward.hasDefeatedMonster ? COPY.profile.noteGolden : COPY.profile.noteRookie}
              </p>
            </section>

            {/* Sekce 2: Statistiky. */}
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">{COPY.profile.statsHeading}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {statTiles.map((tile) => (
                  <div key={tile.label} className="console-panel p-3 text-center">
                    <div className="text-lg font-bold text-gray-200">{tile.value}</div>
                    <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{tile.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Sekce 3: Achievementy. */}
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">{COPY.profile.achievementsHeading}</h2>
              <div className="flex flex-col gap-2">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`console-panel p-3 flex items-start gap-3 ${achievement.unlocked ? "" : "opacity-50"}`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border text-xs font-bold ${
                        achievement.unlocked ? "border-amber-400 text-amber-300" : "border-gray-600 text-gray-500"
                      }`}
                      aria-hidden="true"
                    >
                      {achievement.unlocked ? COPY.profile.achievementUnlockedMark : COPY.profile.achievementLockedMark}
                    </span>
                    <div>
                      <div className={`text-sm font-bold ${achievement.unlocked ? "text-amber-300" : "text-gray-400"}`}>
                        {achievement.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{achievement.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Sekce 4: Výbava. */}
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">{COPY.profile.loadoutHeading}</h2>
              {reward.doubleBarrelUnlocked ? (
                <div className="console-panel p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/object_13/views/reward_shotgun.webp"
                    alt=""
                    aria-hidden="true"
                    className="w-20 h-16 object-cover rounded border border-gray-700"
                  />
                  <div>
                    <div className="text-sm font-bold text-amber-300">{COPY.profile.loadoutDoubleBarrelName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{COPY.profile.loadoutDoubleBarrelNote}</div>
                  </div>
                </div>
              ) : (
                <div className="console-panel p-3 text-xs text-gray-500 italic">{COPY.profile.loadoutEmpty}</div>
              )}
            </section>

            <Link href="/play" className="block text-center text-xs text-gray-400 hover:text-gray-200 mb-6">
              {COPY.profile.backToMenuLabel}
            </Link>

            {/* Dev/debug reset (viz zadání "později schovat za dev mode") —
                nenápadné, dole, mimo hlavní tok pozornosti. */}
            <button
              type="button"
              onClick={handleResetLocalProfile}
              className="block w-full text-center text-[10px] text-gray-700 hover:text-gray-500 underline"
            >
              {COPY.profile.resetButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
