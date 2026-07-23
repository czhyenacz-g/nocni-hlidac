"use client";

import Link from "next/link";
import { useCopy } from "@/game/i18n/useTranslation";
import Footer from "@/components/Footer";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

// Vytažené z app/about/page.tsx (server component nese jen metadata, viz
// tam) — hooky (useCopy) potřebují klientský strom.
export default function AboutPageClient() {
  const COPY = useCopy();

  return (
    <main className="relative min-h-screen flex flex-col items-center p-4 py-10">
      <SceneBackground scene={BACKGROUND_SCENES.about} />
      <div className="w-full max-w-md pixel-panel p-8">
        <h1 className="text-xl font-bold mb-6 text-red-500">{COPY.about.heading}</h1>

        <div className="flex flex-col gap-4 text-sm text-gray-400 leading-relaxed">
          {COPY.about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 pixel-panel p-4 text-center">
          <p className="text-sm text-gray-300 mb-3">{COPY.about.ctaHeading}</p>
          <a
            href={`mailto:${COPY.menu.authorEmail}`}
            className="pixel-button tap-target inline-block px-6 py-3 text-sm"
          >
            {COPY.about.ctaAction} {COPY.menu.authorEmail}
          </a>
        </div>

        <Link href="/play" className="block mt-8 text-center text-xs text-gray-500 hover:text-gray-300">
          {COPY.about.backToGameLabel}
        </Link>
      </div>

      <Footer />
    </main>
  );
}
