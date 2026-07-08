"use client";

import { useEffect, useState } from "react";
import { DiscordPlayer } from "@/lib/auth/types";

export type AuthStatusState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; player: DiscordPlayer };

// Sdílený fetch /api/auth/me — vytažené z AuthStatus.tsx, ať ho může použít i
// MainMenuScreen.tsx (potřebuje vědět, jestli je hráč přihlášený, aby mohl
// zvolit Hardcore režim — viz zadání "Hardcore vyžaduje Discord"), beze
// změny samotného /api/auth/me endpointu.
export function useAuthStatus(): AuthStatusState {
  const [state, setState] = useState<AuthStatusState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { player: DiscordPlayer | null }) => {
        if (cancelled) return;
        setState(data.player ? { status: "authenticated", player: data.player } : { status: "guest" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "guest" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
