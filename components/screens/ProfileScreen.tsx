"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { isAdminUsername } from "@/lib/auth/adminUsers";
import { getMonsterDefeatReward, resetMonsterDefeatReward, MonsterDefeatReward } from "@/game/core/monsterDefeatReward";
import { getPlayerProfileStats, resetPlayerProfileStats, PlayerProfileStats } from "@/game/core/playerProfileStats";
import { resolvePlayerAchievements } from "@/game/core/playerAchievements";
import { resetShownResultAchievements } from "@/game/core/achievementResultStorage";
import {
  ServerHardcorePlayerProfile,
  createHardcoreProfileSnapshotFromLocalState,
  getLocalHardcoreMonsterProgress,
  serverHardcoreProfileToPlayerProfileStats,
  serverHardcoreProfileToReward,
} from "@/game/core/hardcorePlayerProfileSnapshot";

// Profil hlídače (viz zadání) — první verze budoucího účtu/profilu. Lokální
// data (game/core/monsterDefeatReward.ts, game/core/playerProfileStats.ts)
// zůstávají zdroj pravdy pro nepřihlášené hráče a pro Normal aktivitu.
// Přihlášený hráč navíc dostane serverový HARDCORE profil (viz
// game/core/hardcorePlayerProfileSnapshot.ts, /api/player/hardcore-profile) —
// server ukládá výhradně Hardcore hodnoty, Normal se na server nikdy
// neposílá (viz zadání). Veřejně dostupná bez Discord loginu.
//
// "use client" komponenta (localStorage čtení/fetch může běžet jen v
// prohlížeči) — stránka app/profile/page.tsx zůstává Server Component kvůli
// metadata exportu, stejný vzor jako MainMenuScreen.tsx pod app/play/page.tsx.
export default function ProfileScreen() {
  const authStatus = useAuthStatus();
  // Čte se jednou při mountu (stejný vzor jako MainMenuScreen.tsx#reward) —
  // "Resetovat lokální profil" níže vynutí remount přes location.reload(),
  // ať se nemusí ručně sestavovat druhý zdroj pravdy pro live re-render.
  const [reward] = useState<MonsterDefeatReward>(() => getMonsterDefeatReward());
  const [stats] = useState<PlayerProfileStats>(() => getPlayerProfileStats());

  // Serverový Hardcore profil — `null` dokud se nenačte/hráč není
  // přihlášený/načtení selhalo. `serverError` odlišuje "ještě nezkoušeno"
  // od "zkoušeno, ale selhalo" (viz zadání bod 4 "pokud server selže,
  // zobrazil lokální profil a nenápadné varování").
  const [serverProfile, setServerProfile] = useState<ServerHardcorePlayerProfile | null>(null);
  const [serverError, setServerError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (authStatus.status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/player/hardcore-profile")
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (cancelled) return;
        if (res.ok && body?.ok) {
          setServerProfile(body.profile as ServerHardcorePlayerProfile);
          setServerError(false);
        } else {
          setServerError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setServerError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus.status]);

  // Ruční sync (viz zadání "Synchronizovat Hardcore profil") — pošle
  // aktuální lokální Hardcore snapshot (jen skutečně Hardcore-scoped pole,
  // viz createHardcoreProfileSnapshotFromLocalState) a při úspěchu rovnou
  // zobrazí vrácený serverový profil, ať hráč vidí výsledek okamžitě.
  function handleSyncHardcoreProfile() {
    setIsSyncing(true);
    const snapshot = createHardcoreProfileSnapshotFromLocalState(stats, getLocalHardcoreMonsterProgress());
    fetch("/api/player/hardcore-profile/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (res.ok && body?.ok) {
          setServerProfile(body.profile as ServerHardcorePlayerProfile);
          setServerError(false);
        } else {
          setServerError(true);
        }
      })
      .catch(() => setServerError(true))
      .finally(() => setIsSyncing(false));
  }

  // Zdroj pravdy pro služební kartu + Hardcore/reward achievementy (viz
  // zadání "Pokud jsou dostupná serverová Hardcore data, použij je POUZE
  // pro Hardcore/reward achievementy": not_a_rookie_anymore, golden_guard,
  // hardcore_night_5, hardcore_night_10, monster_slayer). `effectiveReward`
  // nahradí CELÝ reward objekt (ten je čistě Hardcore/reward téma beztak).
  // `effectiveStats` přepíše JEN hardcoreBestNight/monsterKills — zbytek
  // (totalDeaths/totalRunsStarted/expeditions/bulbsReplaced/...) zůstává
  // lokální, ať first_shift/first_death/first_expedition/first_bulb_replaced/
  // first_generator_restart/first_monster_hit (mimo těch pět jmenovaných)
  // dál počítají z lokální, mode-agnostic aktivity beze změny.
  const usingServerData = serverProfile !== null;
  const effectiveReward: MonsterDefeatReward = serverProfile ? serverHardcoreProfileToReward(serverProfile) : reward;
  const effectiveStats: PlayerProfileStats = serverProfile ? serverHardcoreProfileToPlayerProfileStats(serverProfile, stats) : stats;
  const achievements = resolvePlayerAchievements(effectiveStats, effectiveReward);
  // Název/popis nezískaného achievementu je schválně skrytý pro běžné
  // hráče (viz zadání, content/copy.ts#achievementHiddenTitle) — jen admin
  // (lib/auth/adminUsers.ts, stejná vlastnost jako jinde ve hře) vidí, o co
  // přesně jde, i než ho odemkne. Odemčené achievementy vidí všichni beze
  // změny.
  const isAdmin = authStatus.status === "authenticated" && isAdminUsername(authStatus.player.username);

  const statTiles: { label: string; value: number }[] = [
    { label: COPY.profile.statTotalDeaths, value: stats.totalDeaths },
    { label: COPY.profile.statTotalRunsStarted, value: stats.totalRunsStarted },
    { label: COPY.profile.statTotalNightsSurvived, value: stats.totalNightsSurvived },
    { label: COPY.profile.statHardcoreBestNight, value: effectiveStats.hardcoreBestNight },
    { label: COPY.profile.statBulbsReplaced, value: stats.bulbsReplaced },
    { label: COPY.profile.statGeneratorsRestarted, value: stats.generatorsRestarted },
    { label: COPY.profile.statExpeditionsStarted, value: stats.expeditionsStarted },
    { label: COPY.profile.statExpeditionsReturned, value: stats.expeditionsReturned },
    { label: COPY.profile.statMonsterHitsConfirmed, value: stats.monsterHitsConfirmed },
    { label: COPY.profile.statMonsterKills, value: effectiveStats.monsterKills },
    // Volitelná dlaždice (viz zadání) — Hardcore-only, čte z effectiveStats
    // (server-preferred, stejně jako hardcoreBestNight/monsterKills výše),
    // ať odráží serverový hardcoreDeathsByNight, když je dostupný, jinak
    // lokální fallback. Celý histogram podle noci se zobrazí až později
    // (viz zadání "nepřidávej celý histogram UI").
    { label: COPY.profile.statHardcoreDeathsOnNightOne, value: Number(effectiveStats.hardcoreDeathsByNight["1"] ?? 0) },
  ];

  // Dev/debug nástroj (viz zadání "později schovat za dev mode") — resetuje
  // OBĚ lokální úložiště (reward i stats), pak vynutí čerstvé načtení
  // stránky, ať se nemusí ručně synchronizovat lokální React state s nově
  // vynulovanými daty. Resetuje jen lokální data — serverový Hardcore profil
  // se odsud NEMAŽE (viz zadání "Nevytvářej: serverový reset profilu").
  // resetShownResultAchievements (viz zadání "Napojit achievementy na
  // výsledkové obrazovky", game/core/achievementResultStorage.ts) čistí jen
  // "už zobrazeno na výsledkové obrazovce" seznam, ať po resetu profilu
  // znovu-odemčené achievementy zase vypadají jako nové.
  function handleResetLocalProfile() {
    if (!window.confirm(COPY.profile.resetConfirmLabel)) return;
    resetPlayerProfileStats();
    resetMonsterDefeatReward();
    resetShownResultAchievements();
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

            {/* Nenápadné varování při selhání serverového načtení (viz
                zadání bod 4) — jen pro přihlášeného hráče, jen když jsme se
                o server opravdu pokusili a nepovedlo se. */}
            {authStatus.status === "authenticated" && serverError && !usingServerData && (
              <p className="mb-4 text-center text-[11px] text-amber-600 italic">{COPY.profile.serverLoadFailedWarning}</p>
            )}

            {/* Sekce 1: Služební karta. */}
            <section className="console-panel p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs uppercase tracking-wide text-gray-500">{COPY.profile.serviceCardHeading}</h2>
                {authStatus.status === "authenticated" && (
                  <span className="text-[10px] text-gray-600">
                    {usingServerData ? COPY.profile.hardcoreSourceServer : COPY.profile.hardcoreSourceLocal}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <p>
                  <span className="text-gray-500">{COPY.profile.statusLabel}: </span>
                  <span className={effectiveReward.hasDefeatedMonster ? "text-amber-300 font-bold" : "text-gray-300"}>
                    {effectiveReward.hasDefeatedMonster ? COPY.profile.statusGolden : COPY.profile.statusRookie}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">{COPY.profile.rewardLabel}: </span>
                  <span className={effectiveReward.doubleBarrelUnlocked ? "text-amber-300" : "text-gray-500"}>
                    {effectiveReward.doubleBarrelUnlocked ? COPY.profile.rewardUnlocked : COPY.profile.rewardLocked}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">{COPY.profile.monsterDefeatsLabel}: </span>
                  <span className="text-gray-300">{effectiveReward.monsterDefeatsCount}</span>
                </p>
              </div>
              <p className="mt-3 text-xs text-gray-500 italic">
                {effectiveReward.hasDefeatedMonster ? COPY.profile.noteGolden : COPY.profile.noteRookie}
              </p>
            </section>

            {/* Sekce 2: Statistiky. Normal + Hardcore lokální countery zatím
                dohromady (viz zadání "pokud je to moc UI zásah, napiš do
                reportu, že se Normal/casual sekce vyčistí později") —
                hardcoreBestNight/monsterKills výše jsou server-preferred,
                zbytek je čistě lokální/nekompetitivní. */}
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">{COPY.profile.statsHeading}</h2>
              <p className="text-[10px] text-gray-600 mb-2 italic">{COPY.profile.statsLocalNote}</p>
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
                {achievements.map((achievement) => {
                  // Nezískaný achievement: název/popis vidí jen admin (viz
                  // isAdmin výše) — běžný hráč vidí jen skrytý placeholder,
                  // ať achievementy zůstanou překvapením.
                  const canSeeDetails = achievement.unlocked || isAdmin;
                  const title = canSeeDetails ? achievement.title : COPY.profile.achievementHiddenTitle;
                  const description = canSeeDetails ? achievement.description : COPY.profile.achievementHiddenDescription;
                  return (
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
                        <div className={`text-sm font-bold ${achievement.unlocked ? "text-amber-300" : "text-gray-400"}`}>{title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Sekce 4: Výbava. */}
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">{COPY.profile.loadoutHeading}</h2>
              {effectiveReward.doubleBarrelUnlocked ? (
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

            {authStatus.status === "authenticated" && (
              <button
                type="button"
                onClick={handleSyncHardcoreProfile}
                disabled={isSyncing}
                className="pixel-button console-button tap-target px-4 py-2 text-xs w-full mb-6 disabled:opacity-50"
              >
                {isSyncing ? COPY.profile.syncButtonSyncing : COPY.profile.syncButtonLabel}
              </button>
            )}

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
