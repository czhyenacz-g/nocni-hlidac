"use client";

// Aktualizuje document.title při přepnutí jazyka, bez reloadu (viz zadání) —
// SEO metadata/OpenGraph (app/layout.tsx#metadata) zůstávají statická
// (server-rendered pro výchozí český web, viz game/i18n/metadata.ts), tohle
// je jen viditelný titulek panelu prohlížeče pro aktuální klientskou session.
import { useEffect } from "react";
import { useTranslation } from "@/game/i18n/useTranslation";

export default function DocumentTitleSync() {
  const { copy } = useTranslation();

  useEffect(() => {
    document.title = copy.franchise.fullTitleObject13;
  }, [copy]);

  return null;
}
