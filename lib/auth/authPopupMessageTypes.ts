/**
 * Sdílené konstanty typu popup auth signálu — VLASTNÍ malý modul bez
 * jakéhokoliv importu (žádné `next/server`/`crypto`), ať ho může bezpečně
 * importovat i klientský kód (viz components/auth/useDiscordAuthPopup.ts).
 * `lib/auth/popupCloseHtml.ts` (server-only, staví `NextResponse` + generuje
 * nonce přes `node:crypto`) tenhle soubor re-exportuje pro server stranu —
 * kdyby klientský kód importoval přímo z popupCloseHtml.ts, webpack by do
 * client bundlu vtáhl i jeho server-only závislosti (viz zadání — reálně
 * způsobilo skok `/play` bundlu z ~43 kB na ~199 kB, dokud se tenhle modul
 * neoddělil).
 */
export const AUTH_POPUP_SUCCESS_MESSAGE_TYPE = "OBJECT13_AUTH_SUCCESS";
export const AUTH_POPUP_ERROR_MESSAGE_TYPE = "OBJECT13_AUTH_ERROR";
