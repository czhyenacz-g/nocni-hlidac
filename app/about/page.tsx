import type { Metadata } from "next";
import Link from "next/link";
import { COPY } from "@/content/copy";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: COPY.about.seoTitle,
  description: COPY.about.seoDescription,
};

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-4 py-10">
      <div className="w-full max-w-md pixel-panel p-8">
        <h1 className="text-xl font-bold mb-6 text-red-500">{COPY.about.heading}</h1>

        <div className="flex flex-col gap-4 text-sm text-gray-400 leading-relaxed">
          {COPY.about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-300 font-bold mb-2">{COPY.about.futureListHeading}</p>
          <ul className="list-disc list-inside flex flex-col gap-1 text-sm text-gray-400">
            {COPY.about.futureList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-sm text-gray-400 leading-relaxed">{COPY.about.closingParagraph}</p>

        <div className="mt-8 pixel-panel p-4 text-center">
          <p className="text-sm text-gray-300">{COPY.about.ctaHeading}</p>
          <p className="text-sm text-gray-300 mb-3">{COPY.about.ctaSubheading}</p>
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
