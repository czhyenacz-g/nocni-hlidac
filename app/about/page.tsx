import type { Metadata } from "next";
import { COPY_CS as COPY } from "@/content/copy";
import AboutPageClient from "./AboutPageClient";

// Next.js Metadata se generuje server-side, před renderem — nemůže volat
// useCopy() (React hook, potřebuje LanguageProvider kontext), proto zůstává
// staticky česky (viz game/i18n/metadata.ts pro budoucí anglický build).
export const metadata: Metadata = {
  title: COPY.about.seoTitle,
  description: COPY.about.seoDescription,
};

export default function AboutPage() {
  return <AboutPageClient />;
}
