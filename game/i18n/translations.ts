import { COPY_CS, type CopyShape } from "../../content/copy";
import { COPY_EN } from "../../content/copy.en";
import type { Language } from "./language";

export const TRANSLATIONS: Record<Language, CopyShape> = {
  cs: COPY_CS,
  en: COPY_EN,
};

/** Bezpečný dotted-path lookup do libovolné vnořené struktury (viz useTranslation.ts#t) — používá se jen tam, kde klíč není staticky známý (např. cinematic textKey postavený za běhu ze scény/segmentu). Většina komponent přistupuje k textu přímo přes useCopy().x.y.z, ne přes tohle. */
export function resolveTranslationPath(root: unknown, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, root);
  return typeof value === "string" ? value : undefined;
}
