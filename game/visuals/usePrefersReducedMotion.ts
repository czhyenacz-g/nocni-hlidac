"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Respektuje OS/prohlížečové nastavení "omezit pohyb" (viz zadání "musí
 * respektovat prefers-reduced-motion") — `false` na serveru i při prvním
 * renderu (bezpečný default, než se stihne zeptat `matchMedia`), pak se
 * hned na mountu doplní skutečná hodnota a dál žije, i když hráč nastavení
 * změní uprostřed hraní (`change` listener, ne jen jednorázové čtení).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mediaQueryList.matches);

    function handleChange(event: MediaQueryListEvent) {
      setReduced(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
