import { MutableRefObject, useEffect, useRef } from "react";
import { GameAction } from "./gameActions";
import { GAME_TICK_MS } from "../balancing/constants";

interface UseGameLoopOptions {
  isRunning: boolean;
  enemyTickMs: number;
  dispatch: (action: GameAction) => void;
  /**
   * Aktuální plynulá stress hodnota (0..1, viz game/audio/useHeartbeatStress.ts)
   * čtená přes ref, ne prop přímo — ať se `tickInterval` nemusí kvůli
   * changující se hodnotě (mění se ~10×/s) pořád rušit a znovu zakládat.
   * Volitelné — bez ref běží čas normální rychlostí (viz stressTimeScale.ts).
   */
  stressLevelRef?: MutableRefObject<number>;
}

/** Řídí herní smyčku: pravidelný TICK (čas, energie) a samostatný ENEMY_ADVANCE tick nepřítele. */
export function useGameLoop({ isRunning, enemyTickMs, dispatch, stressLevelRef }: UseGameLoopOptions): void {
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = null;
      return;
    }

    const tickInterval = setInterval(() => {
      const now = performance.now();
      const last = lastTickRef.current ?? now;
      const deltaMs = now - last;
      lastTickRef.current = now;
      dispatch({ type: "TICK", deltaMs, stressLevel: stressLevelRef?.current });
    }, GAME_TICK_MS);

    const enemyInterval = setInterval(() => {
      dispatch({ type: "ENEMY_ADVANCE" });
    }, enemyTickMs);

    return () => {
      clearInterval(tickInterval);
      clearInterval(enemyInterval);
      lastTickRef.current = null;
    };
  }, [isRunning, enemyTickMs, dispatch]);
}
