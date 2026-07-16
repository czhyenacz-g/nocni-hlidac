"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import {
  fetchObject13PlayerProfile,
  saveObject13PlayerProfile,
  SaveObject13PlayerProfilePayload,
} from "@/lib/playerProfile/object13PlayerProfileClient";
import {
  deriveLoadStateFromFetchResult,
  deriveSaveStateFromSaveResult,
  Object13PlayerProfileLoadState,
  Object13PlayerProfileSaveState,
} from "@/game/core/object13PlayerProfile";

interface Object13PlayerProfileContextValue {
  loadState: Object13PlayerProfileLoadState;
  saveState: Object13PlayerProfileSaveState;
  /** Ruční znovunačtení (viz zadání "znovu načíst profil ručně") — no-op, pokud už jedno načítání běží. */
  reload: () => void;
  /** Po konfliktu (viz zadání "11. Konflikt 409") — vyčistí saveState a znovu načte aktuální serverový profil, žádný merge/force overwrite. */
  reloadAfterConflict: () => void;
  save: (payload: SaveObject13PlayerProfilePayload) => Promise<void>;
}

const Object13PlayerProfileContext = createContext<Object13PlayerProfileContextValue | null>(null);

/**
 * Centrální zdroj obecného profilu Objektu 13 pro celý autentizovaný strom
 * (viz zadání "jeden sdílený provider... jeden aktivní request") — mountuje
 * se jednou na stránku (app/play/page.tsx, components/screens/ProfileScreen.tsx),
 * ne v každé jednotlivé komponentě, která profil potřebuje (ty volají jen
 * `useObject13PlayerProfile()` níže).
 *
 * Načítání:
 * - spustí se automaticky, jakmile `useAuthStatus()` řekne "authenticated"
 *   (nikdy pro anonymního hráče, viz zadání "12. Chování bez přihlášení").
 * - `loadInFlightRef` zaručí NEJVÝŠ JEDNO současné volání
 *   `fetchObject13PlayerProfile()` — druhé volání `load()`, dokud první
 *   ještě běží (ať už z React Strict Mode dvojitého efektu, nebo z ručního
 *   `reload()` kliknutého dřív, než první doběhl), je no-op. Refy přežívají
 *   Strict Mode "efekt -> cleanup -> efekt" dvojitý běh beze změny, takže
 *   tahle ochrana funguje i tam.
 * - `mountedRef` zabrání `setState` po odmountování (žádný React warning),
 *   stejný "cancelled" princip jako `components/auth/useAuthStatus.ts`, jen
 *   pojmenovaný podle životnosti CELÉHO Provideru, ne jednoho efektu.
 *
 * Ukládání (`save`) nikdy neprovádí slepý retry po konfliktu (viz zadání
 * "neprovádět automatický slepý retry PUT po konfliktu") — `conflict` stav
 * čeká na explicitní `reloadAfterConflict()`.
 */
export function Object13PlayerProfileProvider({ children }: { children: ReactNode }) {
  const authStatus = useAuthStatus();
  const [loadState, setLoadState] = useState<Object13PlayerProfileLoadState>({ status: "idle" });
  const [saveState, setSaveState] = useState<Object13PlayerProfileSaveState>({ status: "idle" });

  const loadInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(() => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoadState({ status: "loading" });
    fetchObject13PlayerProfile()
      .then((result) => {
        if (!mountedRef.current) return;
        setLoadState(deriveLoadStateFromFetchResult(result));
      })
      .finally(() => {
        loadInFlightRef.current = false;
      });
  }, []);

  useEffect(() => {
    if (authStatus.status === "authenticated") {
      load();
    } else if (authStatus.status === "guest") {
      // Žádný GET pro anonymního hráče (viz zadání) — jasný stav, ne
      // "loading" navěky.
      setLoadState({ status: "unauthorized" });
    }
    // authStatus.status === "loading": nech loadState na "idle", dokud
    // nevíme, jestli je hráč vůbec přihlášený.
  }, [authStatus.status, load]);

  const save = useCallback(async (payload: SaveObject13PlayerProfilePayload) => {
    setSaveState({ status: "saving" });
    const result = await saveObject13PlayerProfile(payload);
    if (!mountedRef.current) return;

    const { saveState: nextSaveState, nextLoadState } = deriveSaveStateFromSaveResult(result);
    setSaveState(nextSaveState);
    if (nextLoadState) setLoadState(nextLoadState);
  }, []);

  const reloadAfterConflict = useCallback(() => {
    setSaveState({ status: "idle" });
    load();
  }, [load]);

  return (
    <Object13PlayerProfileContext.Provider value={{ loadState, saveState, reload: load, reloadAfterConflict, save }}>
      {children}
    </Object13PlayerProfileContext.Provider>
  );
}

/** Vyhodí, pokud se zavolá mimo `Object13PlayerProfileProvider` — stejná "musíš být zabalený v provideru" ochrana jako běžné React context hooky, ať se chybějící Provider projeví hned při vývoji, ne tichým `undefined`. */
export function useObject13PlayerProfile(): Object13PlayerProfileContextValue {
  const ctx = useContext(Object13PlayerProfileContext);
  if (!ctx) throw new Error("useObject13PlayerProfile must be used within Object13PlayerProfileProvider");
  return ctx;
}
