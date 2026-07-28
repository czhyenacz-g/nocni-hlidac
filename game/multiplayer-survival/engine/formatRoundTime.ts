// Čistá formátovací funkce pro HUD (viz components/multiplayer-survival/
// MultiplayerSurvivalGameView.tsx) — žádné zaokrouhlování dolů pod 0, ať se
// nikdy nezobrazí záporný čas, i kdyby `remainingMs` dorazilo mírně pod 0
// mezi tikem serveru a vykreslením na klientovi.

export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
