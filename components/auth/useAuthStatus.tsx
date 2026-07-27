"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthenticatedPlayer } from "@/lib/auth/types";
import { apiFetch } from "@/lib/http/apiFetch";

type RawAuthStatusState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; player: AuthenticatedPlayer };

/**
 * `refresh` je přimíchané do KAŽDÉ varianty stavu (ne samostatná položka
 * vedle něj) — stávající volající (MainMenuScreen.tsx,
 * Object13PlayerProfileProvider.tsx, ProfileScreen.tsx) čtou jen
 * `.status`/`.player` a beze změny fungují dál; nový kód (AuthStatus.tsx po
 * popup loginu/logoutu, viz zadání "8. useAuthStatus a credentials" —
 * "vždy načte skutečný stav ze serveru") může navíc zavolat `.refresh()`.
 */
export type AuthStatusState = RawAuthStatusState & { refresh: () => void };

// Sdílený fetch /api/auth/me — vytažené z AuthStatus.tsx, ať ho může použít i
// MainMenuScreen.tsx (potřebuje vědět, jestli je hráč přihlášený, aby mohl
// zvolit Hardcore režim — viz zadání "Hardcore vyžaduje Discord"), beze
// změny samotného /api/auth/me endpointu. `AuthenticatedPlayer` (ne jen
// `DiscordPlayer`) — endpoint už `bestRun`/`currentRun` vrací, MainMenuScreen
// je teď potřebuje pro "má hráč rozehranou Hardcore hru" (viz zadání
// "poznat rozehranou hru"), typ jen odkrývá data, co v odpovědi vždycky byla.
//
// `apiFetch` (ne holý `fetch`) — absolutní API origin + `credentials:
// "include"`, ať session cookie dojede i z itch.io (viz zadání "2. Centrální
// API origin", "8. useAuthStatus a credentials").
export function useAuthStatus(): AuthStatusState {
  const [raw, setRaw] = useState<RawAuthStatusState>({ status: "loading" });
  const [refreshSeq, setRefreshSeq] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    apiFetch("/api/auth/me", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { player: AuthenticatedPlayer | null }) => {
        if (cancelled) return;
        setRaw(data.player ? { status: "authenticated", player: data.player } : { status: "guest" });
      })
      .catch(() => {
        // Síťová/CORS chyba i běžné "nepřihlášeno" končí stejně jako
        // "guest" — /api/auth/me endpoint samo o sobě 401 nikdy nevrací
        // (viz app/api/auth/me/route.ts), takže tu žádné 401 rozlišovat
        // není od čeho; rozlišení 401 vs síťová chyba dává smysl u
        // zápisových profil/hardcore endpointů (viz
        // lib/playerProfile/object13PlayerProfileClient.ts), ne tady.
        if (!cancelled) setRaw({ status: "guest" });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refreshSeq]);

  const refresh = useCallback(() => setRefreshSeq((seq) => seq + 1), []);

  return { ...raw, refresh };
}
