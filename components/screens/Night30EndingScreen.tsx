"use client";

import { useState } from "react";
import { COPY } from "@/content/copy";
import { CinematicSceneId } from "@/content/cinematics";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";
import CinematicScreen from "@/components/screens/CinematicScreen";

interface Night30EndingScreenProps {
  /** "no_kill" (PRVNÍ VÝPLATA) nebo "warrior" (POSLEDNÍ SMĚNA) — nikdy "none", volající (app/play/page.tsx) tenhle screen pro "none" vůbec nemountuje. */
  kind: "no_kill" | "warrior";
  /** Achievementy nově odemčené touhle přežitou 30. nocí (viz app/play/page.tsx, stejný "win" efekt jako WinScreen). */
  newlyUnlockedAchievements?: PlayerAchievement[];
  onGoToMenu: () => void;
}

const INTRO_SCENE_ID_BY_KIND: Record<Night30EndingScreenProps["kind"], CinematicSceneId> = {
  no_kill: "no_kill_ending",
  warrior: "warrior_ending",
};

type Phase = "intro" | "epilogue" | "record";

// Hardcore Noc 30 ending — dvě varianty ("no_kill"/PRVNÍ VÝPLATA, "warrior"/
// POSLEDNÍ SMĚNA, viz game/core/night30Ending.ts#resolveNight30Ending) sdílí
// stejnou třífázovou strukturu, ne dvě skoro identické komponenty:
// "intro" — klikací CinematicScreen scéna (content/cinematics.ts
//   no_kill_ending/warrior_ending), na výslovnou žádost "mělo by být v okně
//   a s postupným přehráváním zprávy, podobně jako Valhala".
// "epilogue" — jen warrior (copy.epilogueText), na výslovnou žádost "epilog
//   udělat stejným způsobem — akorát místo obrázku černá obrazovka s
//   textem" — samostatná obrazovka s jedním "Pokračovat" tlačítkem, no_kill
//   variantu úplně přeskočí (nemá epilog), rovnou na "record".
// "record" — ztemnělá obrazovka, úmrtní záznam + achievementy + návrat do
//   menu. Po ní run končí, žádné pokračování na noc 31 (viz app/play/page.tsx).
export default function Night30EndingScreen({ kind, newlyUnlockedAchievements = [], onGoToMenu }: Night30EndingScreenProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const copy = kind === "no_kill" ? COPY.night30Ending.noKill : COPY.night30Ending.warrior;

  if (phase === "intro") {
    return (
      <CinematicScreen
        sceneId={INTRO_SCENE_ID_BY_KIND[kind]}
        onComplete={() => setPhase(copy.epilogueText ? "epilogue" : "record")}
      />
    );
  }

  if (phase === "epilogue" && copy.epilogueText) {
    return (
      <main className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-full max-w-2xl pixel-panel p-4">
          <p className="text-sm text-gray-100 whitespace-pre-line leading-relaxed mb-4">{copy.epilogueText}</p>
          <button
            className="pixel-button tap-target px-4 py-2 text-xs w-full"
            onClick={() => setPhase("record")}
          >
            {COPY.night30Ending.continueLabel}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 bg-black">
      <div className="relative z-10 w-full max-w-lg text-center">
        <p className="text-xs text-gray-500 mb-1">{COPY.night30Ending.recordHeading}</p>
        <h1 className="text-lg font-bold text-white tracking-widest mb-6">{COPY.night30Ending.recordTitle}</h1>

        <div className="text-left text-xs text-gray-200 flex flex-col gap-3 mb-6">
          <div>
            <div className="text-gray-500">{COPY.night30Ending.recordCauseLabel}</div>
            <div>{COPY.night30Ending.recordCauseValue}</div>
          </div>
          <div>
            <div className="text-gray-500">{COPY.night30Ending.recordFactorsLabel}</div>
            {COPY.night30Ending.recordFactors.map((factor) => (
              <div key={factor}>{factor}</div>
            ))}
          </div>
          <div>
            <div className="text-gray-500">{COPY.night30Ending.recordWeightLabel}</div>
            <div>{COPY.night30Ending.recordWeightValue}</div>
          </div>
          <div>
            <div className="text-gray-500">{COPY.night30Ending.recordTimeLabel}</div>
            <div>{COPY.night30Ending.recordTimeValue}</div>
          </div>
          <div>
            <div className="text-gray-500">{COPY.night30Ending.recordDescendantsLabel}</div>
            <div>{COPY.night30Ending.recordDescendantsValue}</div>
          </div>
          <div>
            <div className="text-gray-500">{COPY.night30Ending.recordNoteLabel}</div>
            <div className="whitespace-pre-line">{copy.recordNoteValue}</div>
          </div>
        </div>

        <AchievementResultPanel achievements={newlyUnlockedAchievements} />

        <button
          className="pixel-button console-button console-button--primary tap-target px-6 py-3 text-sm w-full mt-4"
          onClick={onGoToMenu}
        >
          {COPY.night30Ending.backToMenuLabel}
        </button>
      </div>
    </main>
  );
}
