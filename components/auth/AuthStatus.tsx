"use client";

import { useCopy } from "@/game/i18n/useTranslation";
import ConsoleIcon from "@/components/game/ConsoleIcon";
import { apiFetch } from "@/lib/http/apiFetch";
import { useAuthStatus } from "./useAuthStatus";
import DiscordLoginButton from "./DiscordLoginButton";

// Nenápadný login box v hlavním menu — základ identity hráče pro budoucí
// žebříček (viz TECH_DESIGN.md "Discord login"). Hra samotná se přihlášením
// nijak nemění, jde hrát dál i bez něj. Client komponenta (fetch /api/auth/me
// přes useAuthStatus), protože MainMenuScreen běží pod "use client" stromem
// app/play/page.tsx — nemůže být async Server Component s přímým getSession().
export default function AuthStatus() {
  const COPY = useCopy();
  const state = useAuthStatus();

  // Dokud se /api/auth/me nevrátí, radši nic nezobrazit, než na zlomek
  // sekundy bleskla "Přihlásit" a hned se přepsala na jméno hráče.
  if (state.status === "loading") return null;

  if (state.status === "guest") {
    return (
      <DiscordLoginButton
        className="pixel-button console-button tap-target mt-4 flex items-center justify-center gap-2 px-3 py-1.5 text-[10px]"
        onAuthenticated={state.refresh}
      >
        <span className="console-icon-block console-icon-block--sm" aria-hidden="true">
          <ConsoleIcon id="discord" />
        </span>
        {COPY.auth.discordLoginLabel}
      </DiscordLoginButton>
    );
  }

  const name = state.player.displayName ?? state.player.username;

  // Dřív obyčejný `<form method="POST" action="/api/auth/logout">` — na
  // itch.io by cross-origin form POST navigoval celý embed pryč (viz
  // app/api/auth/logout/route.ts). Logout je teď fetch s `credentials:
  // "include"`, po úspěchu se přes `refresh()` znovu načte skutečný stav ze
  // serveru (viz zadání "9. Logout" — "frontend obnoví auth stav").
  function handleLogout() {
    apiFetch("/api/auth/logout", { method: "POST" })
      .catch(() => null)
      .finally(() => state.refresh());
  }

  return (
    <div className="flex flex-col items-center gap-1 mt-4 text-[11px] text-gray-500">
      <span>{COPY.auth.verifiedLabel.replace("{name}", name)}</span>
      <button type="button" onClick={handleLogout} className="text-gray-600 hover:text-gray-400 underline">
        {COPY.auth.logoutLabel}
      </button>
    </div>
  );
}
