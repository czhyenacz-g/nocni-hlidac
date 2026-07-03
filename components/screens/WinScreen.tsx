import { COPY } from "@/content/copy";

interface WinScreenProps {
  onRetry: () => void;
}

export default function WinScreen({ onRetry }: WinScreenProps) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 bg-gray-900 bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(/win1_background.webp)" }}
    >
      <div className="w-full max-w-md text-center pixel-panel p-8">
        <h1 className="text-2xl font-bold mb-2 text-green-400">{COPY.win.title}</h1>
        <p className="text-sm text-gray-400 mb-8">{COPY.win.subtitle}</p>
        <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={onRetry}>
          {COPY.win.retryButton}
        </button>
      </div>
    </main>
  );
}
