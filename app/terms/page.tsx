import type { Metadata } from "next";
import { COPY_CS as COPY } from "@/content/copy";
import TermsScreen from "@/components/screens/TermsScreen";

export const metadata: Metadata = {
  title: COPY.terms.seoTitle,
  description: COPY.terms.seoDescription,
};

// Server komponenta jen kvůli `metadata` exportu výše — samotný obsah (a
// stav pro volitelné "intro" cinematic, viz zadání) je v TermsScreen.tsx.
export default function TermsPage() {
  return <TermsScreen />;
}
