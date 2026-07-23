"use client";

// Sdílený jazykový kontext (viz zadání "přepínatelnost bez reloadu") —
// jediné místo, které drží aktuálně zvolený Language a stará se o jeho
// persistenci do localStorage (viz language.ts). Komponenty nikdy nečtou
// localStorage samy — vždy přes useLanguage()/useCopy()/useTranslation()
// níže, ať existuje jedna pravda o aktuálním jazyce.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, Language, loadStoredLanguage, saveLanguage } from "./language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Lazy initializer čte localStorage jen jednou při prvním renderu na
  // klientovi (viz zadání "1. platná uložená hodnota, 2. neplatná -> výchozí").
  // Na serveru (SSR) loadStoredLanguage() vrátí DEFAULT_LANGUAGE (typeof
  // window === "undefined"), takže hydration mismatch nehrozí — klient se
  // stejnou hodnotou "cs" nejdřív vykreslí a teprve efekt níže případně
  // přepne na uloženou hodnotu.
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(loadStoredLanguage());
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    saveLanguage(next);
  }

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Mimo LanguageProvider (např. v izolovaných testech jednotlivých komponent) tiše spadne na DEFAULT_LANGUAGE, ať nikde nemusí být explicitní wrapper jen kvůli jednomu textu. */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (context) return context;
  return { language: DEFAULT_LANGUAGE, setLanguage: () => {} };
}
