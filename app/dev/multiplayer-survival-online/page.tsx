"use client";

import { MultiplayerSurvivalGameView } from "@/components/multiplayer-survival/MultiplayerSurvivalGameView";

// Skutečný (websocketový) multiplayer dev route — NENÍ totéž jako
// /dev/multiplayer-survival (ta zůstává lokální 2-hráčová 1-tabová verze
// beze změny, viz README.md). Tahle stránka je JEDEN klient, connectuje se
// OKAMŽITĚ při mountu (na rozdíl od veřejné /multiplayer-survival, kde
// připojení spouští tlačítko "Připojit se do hry") — pro rychlé lokální
// testování dvou oken proti `npm run dev:mp-survival-server`. Veškerá round
// lifecycle / HUD / restart logika žije v components/multiplayer-survival/
// MultiplayerSurvivalGameView.tsx, sdílená s tou veřejnou stránkou.
const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_SURVIVAL_WS_URL ?? "http://localhost:4001";

export default function MultiplayerSurvivalOnlineDevPage() {
  return (
    <main className="min-h-screen bg-black p-4 flex flex-col items-center gap-3 text-gray-300 font-mono">
      <div className="text-center">
        <h1 className="text-lg font-bold">Multiplayer Survival — ONLINE dev prototyp</h1>
        <p className="text-xs text-gray-500 mt-1">
          Otevři tuhle stránku ve druhém okně (nejlépe anonymní), ať se připojíš jako druhý hráč. Server: <code>npm run dev:mp-survival-server</code>.
        </p>
      </div>
      <MultiplayerSurvivalGameView serverUrl={DEFAULT_SERVER_URL} />
    </main>
  );
}
