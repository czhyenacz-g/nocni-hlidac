"use client";

import { useEffect, useState } from "react";

export interface ShakeOffset {
  x: number;
  y: number;
}

const ZERO_OFFSET: ShakeOffset = { x: 0, y: 0 };

/**
 * Krátké nepravidelné třesení nezávislé na `DeathSequenceOverlay.tsx`u (ten
 * má vlastní shake vetknutý do svojí větší rAF smyčky vázané na
 * `DeathSequenceConfig` — tenhle hook je pro krátký "doznívající" shake NA
 * `DeathScreen.tsx`u, viz zadání "zkus ten shake i na tu animaci ghoula",
 * ať úder pokračuje i do samotného odhalení, ne jen do jeho konce).
 *
 * Dokud `active`, každý animační frame vrátí náhodný posun v rozsahu
 * ±`intensityPx` na obou osách; po `durationMs` se sám zastaví a offset
 * spadne zpátky na `{0, 0}`. Volající offset jen aplikuje jako CSS
 * transform, žádnou další logiku sem nepřidávej.
 */
export function useShakeOffset(active: boolean, durationMs: number, intensityPx: number): ShakeOffset {
  const [offset, setOffset] = useState<ShakeOffset>(ZERO_OFFSET);

  useEffect(() => {
    if (!active) {
      setOffset(ZERO_OFFSET);
      return;
    }

    let rafId: number;
    const startedAt = performance.now();

    function tick(now: number) {
      if (now - startedAt >= durationMs) {
        setOffset(ZERO_OFFSET);
        return;
      }
      setOffset({
        x: (Math.random() * 2 - 1) * intensityPx,
        y: (Math.random() * 2 - 1) * intensityPx,
      });
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active, durationMs, intensityPx]);

  return offset;
}
