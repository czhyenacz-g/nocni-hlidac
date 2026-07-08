import { MONSTER_DOOR_BANG_REPEAT_MAX_DELAY_MS, MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS } from "../balancing/constants";

// Čistá, testovatelná část "kolik úderů a jak rozestupených" pro
// monster_door_bang (viz app/play/page.tsx) — samotný COOLDOWN mezi
// jednotlivými přehráními (proti spamu, když doorBangSeq roste tik za
// tikem) zůstává v React ref vrstvě v app/play/page.tsx, protože potřebuje
// reálný čas (performance.now()) a životní cyklus komponenty (cleanup na
// unmount) — nemá smysl to sem tahat jako "čistou" funkci.

export interface DoorBangPlaybackPlan {
  count: 1 | 2;
  /** Jen když count === 2 — kolik ms počkat před druhým úderem. */
  repeatDelayMs?: number;
}

/**
 * Rozhodne, jestli zablokovaný útok zní jako 1 nebo 2 údery do dveří, a
 * pokud 2, s jakým (náhodným, přirozeně znějícím) zpožděním mezi nimi —
 * viz MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS/MAX_DELAY_MS. `random` je
 * injectovatelný (default `Math.random`) čistě kvůli testovatelnosti.
 */
export function chooseDoorBangPlaybackPlan(random: () => number = Math.random): DoorBangPlaybackPlan {
  const count: 1 | 2 = random() < 0.5 ? 1 : 2;
  if (count === 1) return { count };

  const repeatDelayMs =
    MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS + random() * (MONSTER_DOOR_BANG_REPEAT_MAX_DELAY_MS - MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS);
  return { count, repeatDelayMs };
}
