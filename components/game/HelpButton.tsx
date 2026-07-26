import { useEffect, useState } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
import ConsoleIcon from "./ConsoleIcon";

// Ikonové tlačítko vedle MapButton.tsx/AudioToggle.tsx (viz zadání) —
// "?" otevře krátkou nápovědu, čistě lokální open/close stav téhle
// komponenty (stejný vzor jako ObjectMapView.tsx lightbox), žádné GameState
// pole ani herní logika. Zavírá se klikem na pozadí, tlačítkem "Zavřít"
// nebo Escape.
export default function HelpButton() {
  const COPY = useCopy();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="pixel-button console-button console-icon-block tap-target"
        onClick={() => setIsOpen(true)}
        aria-label={COPY.game.helpButtonLabel}
        title={COPY.game.helpButtonLabel}
      >
        <ConsoleIcon id="help" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="pixel-panel max-w-sm p-4 text-sm text-gray-200"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400">
              {COPY.game.helpButtonLabel}
            </h2>
            <p className="whitespace-pre-line leading-relaxed">{COPY.game.helpModalText}</p>
            <button
              type="button"
              className="pixel-button console-button mt-4 w-full px-3 py-2 text-xs"
              onClick={() => setIsOpen(false)}
            >
              {COPY.game.helpModalCloseLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
