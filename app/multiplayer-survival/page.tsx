"use client";

import { useState } from "react";
import { MultiplayerSurvivalGameView } from "@/components/multiplayer-survival/MultiplayerSurvivalGameView";

// Veřejná vstupní stránka pro první hratelnou verzi multiplayer-survival
// prototypu (viz game/multiplayer-survival/README.md) — "otevři odkaz ->
// klikni na připojení -> objev se v domečku -> přežij 5 minut". Žádná
// registrace, Discord login, jméno ani kód místnosti — jedno tlačítko.
//
// Samotné websocket připojení se zakládá až PO kliknutí (mount
// MultiplayerSurvivalGameView), ne hned při načtení stránky — to je to
// tlačítko "Připojit se do hry".
const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_SURVIVAL_WS_URL ?? "http://localhost:4001";

export default function MultiplayerSurvivalPublicPage() {
  const [joining, setJoining] = useState(false);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-6 text-gray-300 font-mono">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-amber-400">Multiplayer Survival</h1>
        <p className="text-sm text-gray-400 mt-2">
          Experimentální multiplayerový prototyp Nočního hlídače. Přežijte 5 minut v domečku, zatímco vás loví monstrum — společně s kamarády, co
          otevřou stejný odkaz.
        </p>
      </div>

      {!joining ? (
        <button onClick={() => setJoining(true)} className="pixel-button px-6 py-3 text-base">
          Připojit se do hry
        </button>
      ) : (
        <MultiplayerSurvivalGameView serverUrl={DEFAULT_SERVER_URL} />
      )}
    </main>
  );
}
