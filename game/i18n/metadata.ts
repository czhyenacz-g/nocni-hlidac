import type { Language } from "./language";
import { TRANSLATIONS } from "./translations";

/**
 * Připraveno pro budoucí anglickou verzi webu (viz zadání "pokud metadata
 * nejde měnit za běhu bez nepřiměřeného úsilí, priprav jasnou funkci/config
 * pro budoucí anglický build"). `<html lang>` a Next.js `Metadata`
 * (app/layout.tsx) se dnes generují jen jednou na serveru pro výchozí
 * (českou) verzi webu — přepnutí jazyka na klientovi je nezávislé
 * (DocumentTitleSync níže) a nemění SEO metadata/OpenGraph. Až bude web mít
 * skutečnou anglickou URL/build, tahle funkce dá přesně to, co se má vložit
 * do `export const metadata` pro daný jazyk.
 */
export function getSiteMetadataFor(language: Language) {
  const copy = TRANSLATIONS[language];
  return {
    title: copy.franchise.fullTitleObject13,
    description: copy.menu.intro,
    htmlLang: language,
  };
}
