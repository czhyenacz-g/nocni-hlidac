/**
 * Kolik ms nechat overlay viditelný, když `speechSynthesis` není dostupný
 * (viz speakRadioMessage níže) — odvozeno hrubě z délky textu (pomalejší
 * "čtení" ~70ms/znak), zaclampované na zadáním doporučený rozsah 3–4 s.
 * Čistá funkce, žádná závislost na `window` — testovatelná bez browseru.
 */
export function resolveRadioFallbackDurationMs(text: string): number {
  const estimated = text.length * 70;
  return Math.min(4000, Math.max(3000, estimated));
}

export interface SpeakRadioMessageResult {
  /** `false` = `speechSynthesis` není v tomhle prostředí dostupný (SSR, starý/omezený prohlížeč) — volající pak musí sám naplánovat fallback timeout (viz resolveRadioFallbackDurationMs). */
  supported: boolean;
  /** Zruší běžící řeč (a už nezavolá `onEnd`) — volat při unmountu i před spuštěním další zprávy, viz useRadioMessage.ts. */
  cancel: () => void;
}

/**
 * Tenký, best-effort obal nad browser `speechSynthesis` (viz zadání "první
 * prototyp, ne externí TTS API, ne předgenerované audio soubory") — nikdy
 * nesmí shodit appku: chybějící API, zakázané přehrání i jakákoliv jiná
 * chyba se jen zaloguje a chová se jako `supported: false`. Preferuje český
 * hlas, pokud je v systému dostupný (viz `voice.lang`), jinak necháme
 * prohlížeč vybrat výchozí. Mírně pomalejší tempo (`rate`) a lehce nižší
 * hlas (`pitch`) — "rádiové" hlášení, ne běžná řeč.
 */
export function speakRadioMessage(text: string, onEnd: () => void): SpeakRadioMessageResult {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return { supported: false, cancel: () => {} };
  }

  try {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const czechVoice = synth.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("cs"));
    if (czechVoice) utterance.voice = czechVoice;
    utterance.rate = 0.85;
    utterance.pitch = 0.85;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;

    synth.speak(utterance);

    return {
      supported: true,
      cancel: () => {
        utterance.onend = null;
        utterance.onerror = null;
        synth.cancel();
      },
    };
  } catch (err) {
    console.warn("[radio] speechSynthesis failed", err);
    return { supported: false, cancel: () => {} };
  }
}
