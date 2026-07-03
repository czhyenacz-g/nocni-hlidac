import { COPY } from "@/content/copy";
import { GeneratorState } from "@/game/core/types";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface GeneratorViewProps {
  generatorState: GeneratorState;
  /** Zvyšuje se při každém pípnutí (state.generatorBeepSeq) — synchronizuje bliknutí kontrolky se zvukem. */
  beepSeq: number;
  onRestartGenerator: () => void;
  onLookAtDesk: () => void;
}

// Pohled na generátor: jediné místo, odkud jde restartovat po poruše. Hráč se
// sem musí nejdřív otočit z DeskView (viz gameActions.ts LOOK_AT_GENERATOR).
// Vizuální stav je jen pomocný — hlavní signál poruchy je zvuk (ticho, pak
// rychlé pípání), viz AUDIO_DESIGN.md.
export default function GeneratorView({ generatorState, beepSeq, onRestartGenerator, onLookAtDesk }: GeneratorViewProps) {
  // Kontrolka v "normal" stavu je jinak statická zelená — key na beepSeq ji
  // při každém pípnutí remountne, což znovu spustí jednorázovou pixel-flash
  // animaci (viz styles/pixel.css) přesně v okamžiku zvuku.
  const indicatorKey = generatorState === "normal" ? beepSeq : generatorState;

  return (
    <div className="flex flex-col gap-3">
      <ViewSwitchArrow label={COPY.game.lookAtDeskLabel} onClick={onLookAtDesk} align="left" />

      <button
        className="pixel-button pixel-screen-static tap-target-critical h-48 w-full flex flex-col items-center justify-center gap-3 text-sm"
        data-active={generatorState !== "normal"}
        onClick={onRestartGenerator}
        aria-label="Restartovat generátor"
      >
        <span
          key={indicatorKey}
          className="pixel-indicator"
          data-state={generatorState}
          data-flash={generatorState === "normal"}
        />
        <span>{COPY.game.generatorStateLabels[generatorState]}</span>
        <span className="text-[10px] text-gray-400">{COPY.game.generatorViewHint}</span>
      </button>
    </div>
  );
}
