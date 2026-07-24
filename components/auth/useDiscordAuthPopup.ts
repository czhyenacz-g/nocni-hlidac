"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiOrigin } from "@/lib/config/apiOrigin";
import { AUTH_POPUP_ERROR_MESSAGE_TYPE, AUTH_POPUP_SUCCESS_MESSAGE_TYPE } from "@/lib/auth/authPopupMessageTypes";

/**
 * Je stránka vnořená (itch.io iframe embed)? Čistě UX heuristika (kterou
 * cestu loginu nabídnout), NIKDY bezpečnostní kontrola — ta žije server-side
 * (lib/http/cors.ts přesný origin whitelist). `window.top` čtení z
 * cross-origin iframe vyhodí — to samo o sobě znamená "jsme vnoření někde
 * jinde", proto `catch => true`.
 */
function isEmbeddedContext(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/**
 * Popup + postMessage Discord login flow (viz zadání "6. Popup OAuth flow")
 * — potřeba jen když hra běží vnořená (itch.io), kde by obyčejná top-level
 * navigace na /api/auth/login odnavigovala celý iframe pryč z itch kontextu.
 * Na běžném webu (isEmbeddedContext() === false) zůstává obyčejný `<a
 * href>` top-level redirect (viz zadání "pro běžný web flow může zůstat
 * normální redirect") — komponenta, co tenhle hook používá, o to rozhoduje
 * podle `embedded`.
 *
 * Nepřijímá auth data/user objekt/session z postMessage (viz zadání
 * "Nepřijímej auth data... ze zprávy") — zpráva je jen typ signálu,
 * `onAuthenticated` pak vždy znovu zavolá skutečný `/api/auth/me`.
 */
export function useDiscordAuthPopup(onAuthenticated: () => void) {
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [authError, setAuthError] = useState(false);
  const embedded = isEmbeddedContext();

  useEffect(() => {
    if (!embedded) return;
    const apiOrigin = getApiOrigin();

    function handleMessage(event: MessageEvent) {
      // Přesná shoda originu (viz zadání "Akceptuj zprávu pouze když
      // event.origin === apiOrigin") — apiOrigin je vždy naše vlastní
      // Next.js appka (nikdy prázdné/relativní v produkci, viz
      // lib/config/apiOrigin.ts), takže se dá přímo porovnat.
      if (!apiOrigin || event.origin !== apiOrigin) return;
      const data = event.data as { type?: unknown } | null;
      if (data?.type === AUTH_POPUP_SUCCESS_MESSAGE_TYPE) {
        setAuthError(false);
        onAuthenticated();
      } else if (data?.type === AUTH_POPUP_ERROR_MESSAGE_TYPE) {
        setAuthError(true);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedded, onAuthenticated]);

  const openPopup = useCallback(() => {
    setAuthError(false);
    const url = `${getApiOrigin()}/api/auth/login?target=itch`;
    const popup = window.open(url, "discord-auth", "popup=yes,width=520,height=720");
    if (!popup) {
      // Popup blocker (viz zadání "7. Popup blocked fallback") — top-level
      // navigace jako fallback, žádný nekonečný loading. V iframe embedu
      // tohle odnaviguje jen ten iframe; server po dokončení OAuth pošle
      // hráče na AUTH_RETURN_ITCH_URL (target=itch), ne zpátky do iframe.
      setPopupBlocked(true);
      window.location.href = url;
      return;
    }
    setPopupBlocked(false);
  }, []);

  return { embedded, popupBlocked, authError, openPopup };
}
