"use client";

import { useState } from "react";
import Link from "next/link";
import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import CinematicScreen from "@/components/screens/CinematicScreen";

// Klientská část /terms (viz app/terms/page.tsx, který zůstává server
// komponentou kvůli `export const metadata`) — potřebuje vlastní stav jen
// kvůli volitelnému "intro" cinematicu (viz zadání "Spustit intro",
// content/cinematics.ts#intro). Stejný CinematicScreen jako všude jinde,
// žádná druhá kopie — dokončení jen přepne zpět na normální obsah stránky,
// beze změny route (`/terms` zůstává), žádný nový run ani zásah do herního
// profilu.
export default function TermsScreen() {
  const [introActive, setIntroActive] = useState(false);

  if (introActive) {
    return <CinematicScreen sceneId="intro" onComplete={() => setIntroActive(false)} />;
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.menu} />

      <div className="w-full max-w-md pixel-panel p-8 flex flex-col">
        <h1 className="text-xl font-bold mb-4 text-red-500 text-center">{COPY.terms.heading}</h1>

        <div className="flex flex-col gap-4 text-sm text-gray-400 leading-relaxed max-h-[55vh] overflow-y-auto pr-1">
          {COPY.terms.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {/* "Zpět na nástup" beze změny (stejné třídy jako dřív, jen teď jako
            flex item vedle nového tlačítka místo osamoceného `block`) —
            "Spustit intro" vizuálně zarovnané vedle něj, na mobilu se
            zalomí pod sebe (flex-wrap). */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/play" className="text-center text-xs text-gray-500 hover:text-gray-300">
            {COPY.terms.backLabel}
          </Link>
          <button
            type="button"
            className="text-center text-xs text-gray-500 hover:text-gray-300"
            onClick={() => setIntroActive(true)}
          >
            {COPY.intro.startIntroLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
