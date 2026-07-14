import { GameState, NightDefinition } from "./types";
import { NightScaling } from "../difficulty/nightScaling";
import { isSonicCannonRunning } from "./sonicCannon";

/**
 * Rozpad spotřeby/dobíjení energie za sekundu — jediné místo pravdy, které
 * používá jak `gameReducer.ts#applyPowerDelta` (skutečný přepočet `power`),
 * tak `DebugPanel.tsx` (diagnostický "Power drain breakdown"). Držet tohle
 * na jednom místě je záměrné: kdyby debug panel počítal drain nezávisle
 * vlastní kopií vzorce, mohl by se tiše rozejít od skutečného chování hry a
 * lhát o tom, co energii doopravdy žere (přesně proto, proč byl tenhle audit
 * potřeba — viz TECH_DESIGN.md "Power drain diagnostika").
 *
 * Dvě neslučitelné větve (stejné jako v `applyPowerDelta`):
 * - `sonicCannonActive` (viz `isSonicCannonRunning` — aktivní sonické dělo v
 *   detailu kamery na stole): jen drain (idle + cameraOpen rate +
 *   generatorExtra), žádné dobíjení. BĚŽNÉ sledování kamery (detail otevřený,
 *   dělo VYPNUTÉ) do týhle větve NESPADÁ (na žádost "sledování kamer je
 *   zdarma a bez vlivu na monstrum") — drain z pouhého sledování byl PŘESUNUT
 *   sem, na aktivní dělo, beze změny samotné sazby.
 * - jinak: drain jen z toho, co je skutečně aktivní (zavřené dveře/rozsvícené
 *   světlo/kritický generátor), proti tomu dobíjení `rechargePerSecondWhenIdle`
 *   — teď včetně "detail kamery otevřený, ale sonické dělo vypnuté".
 */
export interface PowerDrainBreakdown {
  sonicCannonActive: boolean;
  /** rates.idle — jen ve `sonicCannonActive` větvi, jinak 0 (mimo ni žádný "idle" drain neexistuje). */
  idleDrain: number;
  /** rates.cameraOpen — jen když je sonické dělo skutečně aktivní (viz sonicCannonActive výše). */
  cameraDrain: number;
  /** rates.doorClosed — jen když jsou dveře skutečně zavřené. */
  doorDrain: number;
  /** rates.lightOn — jen když je světlo skutečně zapnuté. */
  lightDrain: number;
  /** Pevná extra spotřeba během criticalBeeping/restarting (2x doorClosed + lightOn), bez ohledu na to, jestli jsou dveře/světlo skutečně aktivní. */
  generatorExtraDrain: number;
  /** Night scaling multiplikátor (viz game/difficulty/nightScaling.ts) — aplikovaný přesně jednou, na součet drainu, nikdy na recharge. */
  nightScalingMultiplier: number;
  /** Součet všech drain složek NAD multiplikátorem (idle+camera+door+light+generatorExtra), před vynásobením. */
  drainBeforeMultiplier: number;
  /** `drainBeforeMultiplier * nightScalingMultiplier` — skutečná spotřeba za sekundu. */
  totalDrainPerSecond: number;
  /** `night.rechargePerSecondWhenIdle`, pokud se vůbec může uplatnit (mimo sonicCannonActive), jinak 0. */
  rechargePerSecondWhenIdle: number;
  /** Výsledná změna power za sekundu — kladná = dobíjení, záporná = čistý úbytek. */
  netPerSecond: number;
}

export function computePowerDrainBreakdown(
  state: GameState,
  night: NightDefinition,
  nightScaling: NightScaling,
): PowerDrainBreakdown {
  const rates = night.powerDrainPerSecond;
  const sonicCannonActive = isSonicCannonRunning(state);
  const generatorExtraDrain =
    state.generatorState === "criticalBeeping" || state.generatorState === "restarting"
      ? 2 * rates.doorClosed + rates.lightOn
      : 0;
  const multiplier = nightScaling.energyDrainMultiplier;

  if (sonicCannonActive) {
    const idleDrain = rates.idle;
    const cameraDrain = rates.cameraOpen;
    const drainBeforeMultiplier = idleDrain + cameraDrain + generatorExtraDrain;
    const totalDrainPerSecond = drainBeforeMultiplier * multiplier;
    return {
      sonicCannonActive: true,
      idleDrain,
      cameraDrain,
      doorDrain: 0,
      lightDrain: 0,
      generatorExtraDrain,
      nightScalingMultiplier: multiplier,
      drainBeforeMultiplier,
      totalDrainPerSecond,
      rechargePerSecondWhenIdle: 0,
      netPerSecond: -totalDrainPerSecond,
    };
  }

  const doorDrain = state.doorClosed ? rates.doorClosed : 0;
  const lightDrain = state.lightOn ? rates.lightOn : 0;
  const drainBeforeMultiplier = doorDrain + lightDrain + generatorExtraDrain;
  const totalDrainPerSecond = drainBeforeMultiplier * multiplier;
  const rechargePerSecondWhenIdle = night.rechargePerSecondWhenIdle;

  return {
    sonicCannonActive: false,
    idleDrain: 0,
    cameraDrain: 0,
    doorDrain,
    lightDrain,
    generatorExtraDrain,
    nightScalingMultiplier: multiplier,
    drainBeforeMultiplier,
    totalDrainPerSecond,
    rechargePerSecondWhenIdle,
    netPerSecond: rechargePerSecondWhenIdle - totalDrainPerSecond,
  };
}
