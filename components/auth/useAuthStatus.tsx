"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
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
/**
 * `enabled=false` drží stav navždy na `"loading"` beze spuštění fetche — pro
 * volající, které mají skutečnou hodnotu z `AuthStatusContext` (viz níže) a
 * tenhle vlastní instance-fetch je jen nevyužitý fallback, co nesmí dělat
 * druhý zbytečný `/api/auth/me` request vedle toho sdíleného.
 */
function useAuthStatusFetch(enabled: boolean): AuthStatusState {
  const [raw, setRaw] = useState<RawAuthStatusState>({ status: "loading" });
  const [refreshSeq, setRefreshSeq] = useState(0);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, refreshSeq]);

  const refresh = useCallback(() => setRefreshSeq((seq) => seq + 1), []);

  return { ...raw, refresh };
}

/**
 * `null` mimo `AuthStatusProvider` (viz `useAuthStatus` níže — v tom případě
 * si každý volající drží vlastní nezávislou instanci, beze změny oproti
 * dřívějšku). Uvnitř Provideru je to JEDEN sdílený stav pro celý podstrom.
 */
const AuthStatusContext = createContext<AuthStatusState | null>(null);

/**
 * Obalí podstrom jedním sdíleným `/api/auth/me` stavem (viz zadání "po
 * Discord loginu na itch.io musel hráč dát refresh stránky" — `MainMenuScreen`,
 * `AuthStatus`, `Object13PlayerProfileProvider` volaly `useAuthStatus()`
 * KAŽDÝ nezávisle, takže `refresh()` z popup-login flow aktualizoval jen tu
 * jednu konkrétní instanci, ne zbytek stromu). Mountuje se jednou v
 * `app/play/page.tsx`, obaluje `Object13PlayerProfileProvider` zvenku, ať i
 * ten čte stejnou sdílenou hodnotu přes svoje stávající `useAuthStatus()`
 * volání beze změny.
 */
export function AuthStatusProvider({ children }: { children: ReactNode }) {
  const state = useAuthStatusFetch(true);
  return <AuthStatusContext.Provider value={state}>{children}</AuthStatusContext.Provider>;
}

export function useAuthStatus(): AuthStatusState {
  const ctx = useContext(AuthStatusContext);
  // Rules-of-hooks bezpečný fallback — hook se volá VŽDY (`enabled` jen řídí,
  // jestli běží jeho efekt), ať pořadí volání hooků nezávisí na tom, jestli
  // je komponenta zrovna uvnitř AuthStatusProvider.
  const own = useAuthStatusFetch(ctx === null);
  return ctx ?? own;
}
