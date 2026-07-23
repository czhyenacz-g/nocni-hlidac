// Hlavní spotřebitelské API i18n systému. Většina komponent (bývalý
// `import { COPY } from "@/content/copy"`) teď volá useCopy() a lokálně si
// přiřadí `const COPY = useCopy();` — zbytek souboru (COPY.x.y.z přístupy)
// zůstává beze změny, jen COPY je teď reaktivní podle zvoleného jazyka.
// t(key) je pro dynamicky sestavené klíče (cinematic textKey postavený za
// běhu ze scény/segmentu) — viz zadání "nikdy tiše nevracet prázdný text",
// [MISSING: key] fallback + dev-mode console.error.
import { useLanguage } from "./LanguageProvider";
import { TRANSLATIONS, resolveTranslationPath } from "./translations";
import type { CopyShape } from "../../content/copy";

export function useCopy(): CopyShape {
  const { language } = useLanguage();
  return TRANSLATIONS[language];
}

export function useTranslation() {
  const { language, setLanguage } = useLanguage();
  const copy = TRANSLATIONS[language];

  function t(key: string): string {
    const resolved = resolveTranslationPath(copy, key);
    if (resolved !== undefined) return resolved;

    // Fallback na angličtinu (viz zadání "1. anglická nebo jasně definovaná
    // záložní hodnota"), pak teprve viditelné [MISSING: key] — nikdy tiché
    // prázdné "".
    const fallback = language !== "en" ? resolveTranslationPath(TRANSLATIONS.en, key) : undefined;
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(`[i18n] missing translation key: "${key}"`);
    }
    return fallback ?? `[MISSING: ${key}]`;
  }

  return { copy, t, language, setLanguage };
}
