"use client";

import { getApiOrigin } from "@/lib/config/apiOrigin";
import { useAuthStatus } from "./useAuthStatus";

/**
 * Nenápadná dev-only diagnostika cross-origin auth flow (viz zadání "13. Dev
 * diagnostika") — NIKDY cookie hodnotu/HMAC/OAuth token/Discord secret/
 * session payload, jen origins + stav. Volající (DebugPanel.tsx) ji
 * renderuje jen mimo produkci (`process.env.NODE_ENV !== "production"`),
 * stejná podmínka jako ostatní dev-only sekce v tom souboru — běžný hráč v
 * produkčním buildu ji nikdy neuvidí.
 */
export default function AuthDebugDiagnostics() {
  const state = useAuthStatus();
  const pageOrigin = typeof window !== "undefined" ? window.location.origin : "(server)";
  const apiOrigin = getApiOrigin() || "(relative — same origin)";

  return (
    <div className="text-gray-400">
      <div>Page origin: {pageOrigin}</div>
      <div>API origin: {apiOrigin}</div>
      <div>Auth status: {state.status}</div>
    </div>
  );
}
