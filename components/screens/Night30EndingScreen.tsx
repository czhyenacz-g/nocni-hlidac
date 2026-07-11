"use client";

import { useState } from "react";
import { COPY } from "@/content/copy";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";

interface Night30EndingScreenProps {
  /** "no_kill" (PRVNÍ VÝPLATA) nebo "warrior" (POSLEDNÍ SMĚNA) — nikdy "none", volající (app/play/page.tsx) tenhle screen pro "none" vůbec nemountuje. */
  kind: "no_kill" | "warrior";
  /** Achievementy nově odemčené touhle přežitou 30. nocí (viz app/play/page.tsx, stejný "win" efekt jako WinScreen). */
  newlyUnlockedAchievements?: PlayerAchievement[];
  onGoToMenu: () => void;
}

const BACKGROUND_SRC_BY_KIND: Record<Night30EndingScreenProps["kind"], string> = {
  no_kill: "/object_13/story/no_kill_ending.png",
  // Přesný existující asset ze zadání — NEOPRAVOVAT na "warrior_ending.png".
  warrior: "/object_13/story/warior_ending.png",
};

// Hardcore Noc 30 ending — dvě varianty ("no_kill"/PRVNÍ VÝPLATA, "warrior"/
// POSLEDNÍ SMĚNA, viz game/core/night30Ending.ts#resolveNight30Ending) sdílí
// stejnou dvoufázovou strukturu, jen jiný obrázek/text/volitelný epilog
// navíc — proto jedna komponenta s `kind` propem, ne dvě skoro identické.
// NE CinematicScreen.tsx — ten je letterboxovaný/object-contain se stejným
// rámovaným obrázkem po celou dobu, zadání tady výslovně chce full-bleed
// "object-fit: cover" pozadí + tmavý overlay, jiný vizuální jazyk. Dvě
// fáze, obě s jedním tlačítkem (na výslovnou žádost "jednoduché ovládání",
// ne segment-po-segmentu jako u CinematicScreen): "intro" (dopis od Hynka
// přes celý obrázek), "record" (ztemnělá obrazovka, volitelný epilog +
// bílý úmrtní záznam). Po "record" run končí — návrat do menu, žádné
// pokračování na noc 31 (viz app/play/page.tsx).
export default function Night30EndingScreen({ kind, newlyUnlockedAchievements = [], onGoToMenu }: Night30EndingScreenProps) {
  const [phase, setPhase] = useState<"intro" | "record">("intro");
  const copy = kind === "no_kill" ? COPY.night30Ending.noKill : COPY.night30Ending.warrior;

  if (phase === "intro") {
    return (
      <main className="relative min-h-screen w-full flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BACKGROUND_SRC_BY_KIND[kind]})` }}
          aria-hidden="true"
        />
        {/* Jemný tmavý overlay jen kvůli čitelnosti textu (viz zadání) — sám obrázek zůstává beze změny. */}
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-xl pixel-panel bg-black/50 p-6">
          <h1 className="text-sm font-bold tracking-widest text-amber-300 mb-4">{copy.title}</h1>
          <p className="text-sm text-gray-100 whitespace-pre-line leading-relaxed mb-6">{copy.introText}</p>
          <button
            className="pixel-button console-button console-button--primary tap-target px-6 py-3 text-sm w-full"
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
        {/* Volitelný narativní epilog PŘED úmrtním záznamem (jen warrior — viz
            zadání "epilog po penězích") — no_kill kind ho nemá, rovnou
            přechází na záznam. */}
        {copy.epilogueText && (
          <p className="text-left text-xs text-gray-300 whitespace-pre-line leading-relaxed mb-6">{copy.epilogueText}</p>
        )}

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
