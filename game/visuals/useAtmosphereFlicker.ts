"use client";

import { useEffect, useRef, useState } from "react";
import { rollFlickerEvent, rollNextFlickerDelayMs } from "./atmosphereFlicker";

/** Krátká pauza mezi oběma poklesy dvojitého probliknutí (viz zadání "někdy dvojité probliknutí") — druhý pokles je o něco slabší než první, ať to nepůsobí jako mechanické opakování stejné věci. */
const DOUBLE_FLICKER_GAP_MS = 70;
const DOUBLE_FLICKER_SECOND_DIP_RATIO = 0.7;
/** Neutrální (žádné probliknutí) hodnota jasu vrstvy — viz useAtmosphereFlicker.ts#brightness. */
const NEUTRAL_BRIGHTNESS = 1;

/**
 * Nepravidelné probliknutí žárovky (viz zadání "4. Přidej systém simulace
 * probliknutí žárovky") — vrací aktuální násobitel jasu (1 = normální,
 * < 1 = ztlumeno) pro SAMOSTATNOU vrstvu (`.atmosphere-flicker-layer`, viz
 * styles/atmosphere.css), NE pro `.atmosphere-root` samotný — ten má
 * vlastní pomalou `transition: filter` pro saturaci/kontrast/jas podle
 * napětí, kterou by časté nepravidelné probliknutí jen rozmazalo (viz
 * zadání "nesmí resetovat CSS transition").
 *
 * Řetězec `setTimeout` (NIKDY `setInterval`, viz zadání "nikdy nepoužívej
 * pravidelný loop") — po každém probliknutí (nebo hned po zapnutí) se
 * vylosuje ÚPLNĚ NOVÁ, nezávislá čekací doba (game/visuals/atmosphereFlicker.ts).
 * `tensionRef`/`enabled` čtené přes ref v `scheduleNext`/`fire`, ať dlouho
 * naplánovaný příští flicker vždycky použije AKTUÁLNÍ (ne zastaralou)
 * hodnotu napětí, aniž by bylo nutné celý řetězec při každé změně napětí
 * rušit a zakládat znovu (to by frekvenci uměle deformovalo).
 *
 * `enabled=false` (viz zadání "5. Ochrany" — death screen/menu/briefing,
 * minihra, prefers-reduced-motion) okamžitě zastaví řetězec a vrátí jas na
 * neutrální hodnotu — žádný nový `setTimeout` se nezaloží, dokud se `enabled`
 * zase nestane `true`.
 */
export function useAtmosphereFlicker(tensionLevel: number, enabled: boolean): number {
  const [brightness, setBrightness] = useState(NEUTRAL_BRIGHTNESS);
  const tensionRef = useRef(tensionLevel);
  tensionRef.current = tensionLevel;

  useEffect(() => {
    if (!enabled) {
      setBrightness(NEUTRAL_BRIGHTNESS);
      return;
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function after(ms: number, fn: () => void) {
      const id = setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms);
      timeouts.push(id);
    }

    function scheduleNext() {
      after(rollNextFlickerDelayMs(tensionRef.current), fire);
    }

    function fire() {
      const event = rollFlickerEvent(tensionRef.current);
      setBrightness(Math.max(0, 1 - event.intensity));

      after(event.durationMs, () => {
        setBrightness(NEUTRAL_BRIGHTNESS);
        if (!event.double) {
          scheduleNext();
          return;
        }
        after(DOUBLE_FLICKER_GAP_MS, () => {
          setBrightness(Math.max(0, 1 - event.intensity * DOUBLE_FLICKER_SECOND_DIP_RATIO));
          after(event.durationMs, () => {
            setBrightness(NEUTRAL_BRIGHTNESS);
            scheduleNext();
          });
        });
      });
    }

    scheduleNext();

    return () => {
      cancelled = true;
      for (const id of timeouts) clearTimeout(id);
      setBrightness(NEUTRAL_BRIGHTNESS);
    };
  }, [enabled]);

  return brightness;
}
