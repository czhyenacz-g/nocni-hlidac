"use client";

import { ReactNode } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
import { getApiOrigin } from "@/lib/config/apiOrigin";
import { useDiscordAuthPopup } from "./useDiscordAuthPopup";

interface DiscordLoginButtonProps {
  className: string;
  /** Zavolá se po skutečném "auth-success" postMessage signálu (ne dřív) — volající si tím znovu načte /api/auth/me (viz zadání "8. useAuthStatus a credentials"). */
  onAuthenticated: () => void;
  children: ReactNode;
}

/**
 * Sdílený Discord login vstupní bod pro /play (AuthStatus.tsx +
 * MainMenuScreen.tsx hardcore login prompt) — mimo itch embed obyčejný
 * top-level `<a href>` redirect (beze změny oproti dřívějšku), uvnitř
 * itch embedu popup + postMessage flow (viz zadání "6. Popup OAuth flow"),
 * s fallbackem na top-level navigaci, pokud prohlížeč popup zablokuje (viz
 * zadání "7. Popup blocked fallback"). `/database` login odkaz
 * (DatabaseViewerStatus.tsx) je samostatná server-rendered stránka mimo
 * itch embed — tenhle komponent záměrně nepoužívá, obyčejný odkaz jí stačí.
 */
export default function DiscordLoginButton({ className, onAuthenticated, children }: DiscordLoginButtonProps) {
  const COPY = useCopy();
  const { embedded, popupBlocked, authError, openPopup } = useDiscordAuthPopup(onAuthenticated);

  return (
    <>
      <a
        href={`${getApiOrigin()}/api/auth/login?target=web`}
        className={className}
        onClick={(event) => {
          if (!embedded) return;
          event.preventDefault();
          openPopup();
        }}
      >
        {children}
      </a>
      {popupBlocked && <p className="mt-1 text-[10px] text-gray-500">{COPY.auth.popupBlockedLabel}</p>}
      {authError && <p className="mt-1 text-[10px] text-gray-500">{COPY.auth.popupErrorLabel}</p>}
    </>
  );
}
