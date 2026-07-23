// Jazyk hry — jediné místo, kde se definuje podporovaná množina jazyků a
// pravidla pro jejich uložení/načtení (viz LanguageProvider.tsx). Přidání
// dalšího jazyka v budoucnu znamená rozšířit jen tenhle union + přidat
// odpovídající překladový soubor (viz content/copy.<lang>.ts) — zbytek
// systému (LanguageProvider, useTranslation, testy) na konkrétní jazyky
// natvrdo neodkazuje.
export type Language = "cs" | "en";

export const LANGUAGES: readonly Language[] = ["cs", "en"];

// Přirozené názvy jazyků pro přepínač (viz zadání "Čeština"/"English", NE
// překlad slova "English" do češtiny) — jediné místo pro tenhle popisek.
export const LANGUAGE_LABELS: Record<Language, string> = {
  cs: "Čeština",
  en: "English",
};

export const DEFAULT_LANGUAGE: Language = "cs";

// Jeden stabilní localStorage klíč pro celou hru (viz zadání).
export const LANGUAGE_STORAGE_KEY = "night-watchman.language";

export function isValidLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/** Bezpečné čtení uloženého jazyka — neplatná/chybějící hodnota vždy tiše spadne na DEFAULT_LANGUAGE, nikdy nevyhodí výjimku (viz zadání "neplatná uložená hodnota -> výchozí jazyk"). */
export function loadStoredLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isValidLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Soukromý režim / zakázaný localStorage — jazyk zůstane jen pro tuhle
    // session (React state), žádná chyba se nemá dostat k hráči.
  }
}
