import type { Metadata } from "next";
import Link from "next/link";
import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

export const metadata: Metadata = {
  title: COPY.terms.seoTitle,
  description: COPY.terms.seoDescription,
};

// Napůl herní lore, napůl disclaimer — stejné pozadí jako úvodní obrazovka
// (BACKGROUND_SCENES.menu), text ve scrollovatelném panelu, ať se vejde i na
// menší obrazovky bez toho, aby stránka rostla do nekonečna.
export default function TermsPage() {
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

        <Link href="/play" className="block mt-6 text-center text-xs text-gray-500 hover:text-gray-300">
          {COPY.terms.backLabel}
        </Link>
      </div>
    </main>
  );
}
