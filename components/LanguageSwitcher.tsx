"use client";

// Přepínač jazyka (viz zadání "Čeština"/"English", bez reloadu, persistence
// v localStorage) — čistě prezentační, veškerá logika žije v
// game/i18n/LanguageProvider.tsx.
import { useLanguage } from "@/game/i18n/LanguageProvider";
import { LANGUAGES, LANGUAGE_LABELS } from "@/game/i18n/language";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-1" role="group" aria-label="Language / Jazyk">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className="pixel-button console-button tap-target px-2 py-1 text-[10px]"
          data-active={language === lang}
          aria-pressed={language === lang}
          onClick={() => setLanguage(lang)}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
