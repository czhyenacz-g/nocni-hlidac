import { COPY } from "@/content/copy";
import { DeathReason } from "@/game/core/types";

interface DeathScreenProps {
  reason: DeathReason | null;
  onRetry: () => void;
}

export default function DeathScreen({ reason, onRetry }: DeathScreenProps) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="jumpscare-overlay" />
      <div className="w-full max-w-md text-center pixel-panel p-8 relative z-10">
        <h1 className="text-2xl font-bold mb-2 text-red-500">{COPY.death.title}</h1>
        <p className="text-sm text-gray-400 mb-8">
          {reason ? COPY.death.reasons[reason] : ""}
        </p>
        <button className="pixel-button px-6 py-3 text-sm w-full" onClick={onRetry}>
          {COPY.death.retryButton}
        </button>
      </div>
    </main>
  );
}
