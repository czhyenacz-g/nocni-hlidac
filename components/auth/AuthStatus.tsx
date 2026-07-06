"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/content/copy";
import { DiscordPlayer } from "@/lib/auth/types";

type AuthStatusState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; player: DiscordPlayer };

// Nenápadný login box v hlavním menu — základ identity hráče pro budoucí
// žebříček (viz TECH_DESIGN.md "Discord login"). Hra samotná se přihlášením
// nijak nemění, jde hrát dál i bez něj. Client komponenta (fetch /api/auth/me
// při mountu), protože MainMenuScreen běží pod "use client" stromem
// app/play/page.tsx — nemůže být async Server Component s přímým getSession().
export default function AuthStatus() {
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

  // Dokud se /api/auth/me nevrátí, radši nic nezobrazit, než na zlomek
  // sekundy bleskla "Přihlásit" a hned se přepsala na jméno hráče.
  if (state.status === "loading") return null;

  if (state.status === "guest") {
    return (
      <a href="/api/auth/login" className="block text-center text-[11px] text-gray-500 hover:text-gray-300 mt-4">
        {COPY.auth.discordLoginLabel}
      </a>
    );
  }

  const name = state.player.displayName ?? state.player.username;
  return (
    <div className="flex flex-col items-center gap-1 mt-4 text-[11px] text-gray-500">
      <span>{COPY.auth.verifiedLabel.replace("{name}", name)}</span>
      <form method="POST" action="/api/auth/logout">
        <button type="submit" className="text-gray-600 hover:text-gray-400 underline">
          {COPY.auth.logoutLabel}
        </button>
      </form>
    </div>
  );
}
