import { useEffect, useRef } from "react";
import { audioManager } from "./audioManager";
import { AUDIO_EVENTS } from "./audioEvents";

export const SONIC_CANNON_FADE_IN_MS = 450;
export const SONIC_CANNON_FADE_OUT_MS = 300;
// Nikdy nezačít blíž ke konci stopy, než tohle (viz zadání) — dost času, ať
// hráč slyší aspoň kus věty, než by track (při krátkém použití děla) skočil
// na konec a spustil "pokračování z nového místa" logiku níže.
export const SONIC_CANNON_END_SAFETY_MARGIN_SEC = 10;

interface UseSonicCannonAudioOptions {
  /** Jediný zdroj pravdy je GameState.sonicCannonActive (viz app/play/page.tsx) — žádný paralelní lokální stav tady. */
  active: boolean;
}

/** Čistá funkce (testovatelná bez audio elementu, viz useSonicCannonAudio.test.ts) — nikdy nevrátí čas blíž ke konci stopy, než SONIC_CANNON_END_SAFETY_MARGIN_SEC. */
export function pickRandomSonicCannonStart(durationSeconds: number): number {
  if (durationSeconds <= SONIC_CANNON_END_SAFETY_MARGIN_SEC) return 0;
  const maxStart = Math.max(0, durationSeconds - SONIC_CANNON_END_SAFETY_MARGIN_SEC);
  return Math.random() * maxStart;
}

/**
 * Namluvená hlasová stopa sonického děla (viz zadání) — nezávislá na
 * `sonicCannonHum` (technické bzučení, stejný `sonicCannonActive` zdroj
 * pravdy, ale beze fade/random-start logiky). Jedna dlouhá nahrávka, proto:
 * náhodný start při KAŽDÉ nové aktivaci (ne při každém renderu), plynulý
 * fade-in/fade-out (viz audioManager.ts#startLoopWithFadeIn/fadeOutLoop) a
 * pokračování z nového náhodného místa, pokud stopa dojede na konec, zatímco
 * je dělo pořád aktivní (žádná druhá souběžná instance).
 *
 * `activeRef`/`generationRef` řeší závody stavů (zapnout→vypnout→rychle
 * znovu zapnout) — `generationRef` se zvyšuje při KAŽDÉ změně `active`,
 * takže případný pozdě dorazivší `onceLoadedMetadata` callback z předchozí
 * (už neplatné) aktivace se pozná a nic neudělá. Samotný fade-in/fade-out
 * race (rychlé přerušení uprostřed rampy) řeší sdílený `volumeRampGeneration`
 * uvnitř AudioManageru (viz tam), ne tenhle hook.
 */
export function useSonicCannonAudio({ active }: UseSonicCannonAudioOptions): void {
  const activeRef = useRef(active);
  activeRef.current = active;
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;

    if (active) {
      audioManager.onceLoadedMetadata(AUDIO_EVENTS.sonicCannonVoice, () => {
        // Mezitím už mohlo dojít k další změně `active` (vypnuto/zapnuto
        // znovu) dřív, než metadata dorazila — tahle (starší) aktivace už
        // není platná, nic nespouštěj.
        if (generationRef.current !== generation) return;
        const duration = audioManager.getDuration(AUDIO_EVENTS.sonicCannonVoice);
        audioManager.seekTo(AUDIO_EVENTS.sonicCannonVoice, pickRandomSonicCannonStart(duration));
        audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
      });
    } else {
      audioManager.fadeOutLoop(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_OUT_MS);
    }
  }, [active]);

  // Konec stopy během aktivního děla (viz zadání) — nativní `ended` fires jen
  // pro `loop: false` (viz audioConfig.ts#sonicCannonVoice), tedy přesně na
  // konci nahrávky, nikdy z manuálního pause()/fadeOutLoop. Restartuje
  // STEJNOU instanci na novém náhodném místě, žádná nová instance, žádný
  // slyšitelný skok/prasknutí navíc (viz zadání "jednoduchý restart je
  // přijatelný").
  useEffect(() => {
    return audioManager.onEnded(AUDIO_EVENTS.sonicCannonVoice, () => {
      if (!activeRef.current) return;
      const duration = audioManager.getDuration(AUDIO_EVENTS.sonicCannonVoice);
      audioManager.seekTo(AUDIO_EVENTS.sonicCannonVoice, pickRandomSonicCannonStart(duration));
      audioManager.startLoop(AUDIO_EVENTS.sonicCannonVoice);
    });
  }, []);

  // Tvrdá pojistka na skutečné odmountování (navigace pryč z /play, stejný
  // vzor jako sonicCannonHum/titanFootsteps v app/play/page.tsx) — nezávislé
  // na efektu výše, který reaguje jen na ZMĚNU `active`. Okamžité zastavení
  // (ne fade) je tu v pořádku, komponenta stejně mizí.
  useEffect(() => {
    return () => {
      generationRef.current++;
      audioManager.stopLoop(AUDIO_EVENTS.sonicCannonVoice);
    };
  }, []);
}
