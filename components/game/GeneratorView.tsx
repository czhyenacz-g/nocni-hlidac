import { useEffect, useRef, useState } from "react";
import { COPY } from "@/content/copy";
import { GeneratorState } from "@/game/core/types";
import { GENERATOR_ACCIDENTAL_RESTART_MESSAGE_MS, GENERATOR_OVERLOAD_WINDUP_DURATION_MS } from "@/game/balancing/constants";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface GeneratorViewProps {
  generatorState: GeneratorState;
  /** Zvyšuje se při každém pípnutí (state.generatorBeepSeq) — synchronizuje bliknutí kontrolky se zvukem. */
  beepSeq: number;
  /** Zvyšuje se přesně jednou při zbytečném restartu FUNKČNÍHO generátoru (viz GameState.generatorAccidentalRestartSeq). */
  accidentalRestartSeq: number;
  onRestartGenerator: () => void;
  onLookAtDesk: () => void;
  /**
   * Jestli je "PŘETÍŽIT GENERÁTOR" tuhle noc vůbec vidět (viz zadání
   * "zobrazit od 5. noci", game/difficulty/nightConfig.ts#generatorOverloadEnabled)
   * — jen viditelnost tlačítka, KLIKATELNOST (generatorState/doorDestroyed/
   * probíhající přetížení) řeší canStartGeneratorOverloadWindup v
   * app/play/page.tsx#handleStartGeneratorOverload, ne tenhle prop.
   */
  canOverloadGenerator: boolean;
  /** viz gameReducer.ts#canStartGeneratorOverloadWindup — čistě vizuální ztlumení (stejný vzor jako LeftWallView "Jít ven" + zavřené dveře), autoritativní podmínka zůstává v reduceru/handleru. */
  canStartOverload: boolean;
  /** viz GameState.generatorOverloadWindup — držení tlačítka po potvrzení (window.confirm), stejný vzor jako LeftWallView "Jít ven". */
  overloadWindupActive: boolean;
  overloadWindupProgressMs: number;
  /** Zobrazí window.confirm() a po potvrzení spustí GENERATOR_OVERLOAD_WINDUP_DURATION_MS držení (viz app/play/page.tsx). */
  onStartGeneratorOverload: () => void;
}

// Pohled na generátor: jediné místo, odkud jde restartovat po poruše (a od
// GENERATOR_OVERLOAD_MIN_NIGHT/admin i vědomě přetížit, viz zadání "zničené
// dveře vlastní chybou hráče"). Hráč se sem musí nejdřív otočit z DeskView
// (viz gameActions.ts LOOK_AT_GENERATOR). Vizuální stav je jen pomocný —
// hlavní signál poruchy je zvuk (ticho, pak rychlé pípání), viz AUDIO_DESIGN.md.
export default function GeneratorView({
  generatorState,
  beepSeq,
  accidentalRestartSeq,
  onRestartGenerator,
  onLookAtDesk,
  canOverloadGenerator,
  canStartOverload,
  overloadWindupActive,
  overloadWindupProgressMs,
  onStartGeneratorOverload,
}: GeneratorViewProps) {
  // Kontrolka v "normal" stavu je jinak statická zelená — key na beepSeq ji
  // při každém pípnutí remountne, což znovu spustí jednorázovou pixel-flash
  // animaci (viz styles/pixel.css) přesně v okamžiku zvuku.
  const indicatorKey = generatorState === "normal" ? beepSeq : generatorState;

  // Krátká posměšná hláška po zbytečném restartu — čistě kosmetický lokální
  // timeout v komponentě (ne herní stav), spouští se jen na SKUTEČNOU změnu
  // accidentalRestartSeq, stejný vzor jako showSuccessMessage v DoorView.tsx.
  const [showAccidentalRestartMessage, setShowAccidentalRestartMessage] = useState(false);
  const prevAccidentalRestartSeqRef = useRef(accidentalRestartSeq);
  useEffect(() => {
    if (prevAccidentalRestartSeqRef.current === accidentalRestartSeq) return;
    prevAccidentalRestartSeqRef.current = accidentalRestartSeq;
    setShowAccidentalRestartMessage(true);
    const timeout = setTimeout(() => setShowAccidentalRestartMessage(false), GENERATOR_ACCIDENTAL_RESTART_MESSAGE_MS);
    return () => clearTimeout(timeout);
  }, [accidentalRestartSeq]);

  // Stejný výpočet jako LeftWallView.tsx#windupSeconds/windupPercent — jen
  // jiná konstanta (GENERATOR_OVERLOAD_WINDUP_DURATION_MS).
  const overloadWindupSeconds = Math.max(0, (GENERATOR_OVERLOAD_WINDUP_DURATION_MS - overloadWindupProgressMs) / 1000).toFixed(1);
  const overloadWindupPercent = Math.min(100, (overloadWindupProgressMs / GENERATOR_OVERLOAD_WINDUP_DURATION_MS) * 100);

  return (
    <div className="flex flex-col gap-3">
      <ViewSwitchArrow label={COPY.game.lookAtDeskLabel} onClick={onLookAtDesk} align="left" />

      {/* Stejný "terminál" obal jako MainMenuScreen/LoadingScreen/BriefingScreen
          (viz zadání "udělej ve stejným stylu jako úvodní stránka") — kovový
          rám + 4 šrouby kolem, samotné tlačítko restartu dostane navíc třídu
          .menu-terminal-screen (zapuštěná tmavší obrazovka + zelený CRT
          nádech), beze změny klikatelnosti/data-active/obsahu. */}
      <div className="menu-terminal-frame">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <button
          className="pixel-button pixel-screen-static menu-terminal-screen tap-target-critical h-48 w-full flex flex-col items-center justify-center gap-3 text-sm relative"
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

          {showAccidentalRestartMessage && (
            // pointer-events-none: čistě informativní hláška, nesmí bránit
            // dalším kliknutím na tlačítko pod ní.
            <div
              className="absolute pointer-events-none text-sm text-amber-300 bg-black/70 px-3 py-1 rounded whitespace-nowrap"
              style={{ left: "50%", top: "8%", transform: "translate(-50%, -50%)" }}
            >
              {COPY.game.generatorAccidentalRestartMessage}
            </div>
          )}
        </button>
      </div>

      {/* "PŘETÍŽIT GENERÁTOR" — pod restartem (viz zadání), stejný
          pixel-button/console-button styl jako LeftWallView.tsx "Jít ven".
          Klik jde vždy do onStartGeneratorOverload (window.confirm +
          guard v app/play/page.tsx), tlačítko samo žádnou podmínku
          neduplikuje kromě viditelnosti (canOverloadGenerator). */}
      {canOverloadGenerator && (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            className={`pixel-button console-button tap-target flex items-center gap-2 px-3 py-2 text-xs ${
              !overloadWindupActive && !canStartOverload ? "opacity-50" : ""
            }`}
            style={
              overloadWindupActive
                ? { animation: "pixel-blink 0.35s steps(2) infinite", backgroundColor: "#facc15", color: "#1a1a1a" }
                : undefined
            }
            onClick={onStartGeneratorOverload}
          >
            <span>
              {overloadWindupActive
                ? COPY.game.generatorOverloadHoldingLabel.replace("{seconds}", overloadWindupSeconds)
                : COPY.game.generatorOverloadLabel}
            </span>
          </button>
          {overloadWindupActive && (
            <div className="w-32 h-1 bg-gray-800 border border-gray-700 rounded overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-150" style={{ width: `${overloadWindupPercent}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
