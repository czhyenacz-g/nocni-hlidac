import { DeathReason } from "../core/types";

export interface JumpscareDefinition {
  id: string;
  reason: DeathReason;
  title: string;
  message: string;
  /** Délka ticha (ms) před lekačkou. */
  silenceBeforeMs: number;
  /** Délka samotného jumpscare efektu (ms). */
  effectDurationMs: number;
}

// Lekačky pro Objekt 13. Další kapitoly budou mít vlastní soubor v této složce.
export const OBJECT13_JUMPSCARES: Record<DeathReason, JumpscareDefinition> = {
  door_open_at_attack: {
    id: "intruder_attack",
    reason: "door_open_at_attack",
    title: "Nestihl jsi zavřít dveře.",
    message: "Postava byla u dveří a ty jsi ji nechal projít.",
    silenceBeforeMs: 800,
    effectDurationMs: 600,
  },
  blackout_timeout: {
    id: "blackout_timeout",
    reason: "blackout_timeout",
    title: "Nouzová baterie padla na nulu.",
    message: "Magnetický zámek povolil.",
    silenceBeforeMs: 1000,
    effectDurationMs: 600,
  },
  bulb_replacement_attack: {
    id: "bulb_replacement_attack",
    reason: "bulb_replacement_attack",
    title: "Výměna žárovky se nestihla dokončit.",
    message: "Otevřené dveře nepočkaly, až budeš hotový.",
    silenceBeforeMs: 800,
    effectDurationMs: 600,
  },
  emergency_run: {
    id: "emergency_run",
    reason: "emergency_run",
    title: "Nouzová výprava mimo kancelář se nezdařila.",
    message: "Nestihl jsi to zpátky.",
    silenceBeforeMs: 800,
    effectDurationMs: 600,
  },
  titan_ambush_emergency_run: {
    id: "titan_ambush_emergency_run",
    reason: "titan_ambush_emergency_run",
    title: "Pokus o útěk se nezdařil.",
    message: "Dveře se zasekly a Titan tě dostihl.",
    silenceBeforeMs: 800,
    effectDurationMs: 600,
  },
  titan_door_breach: {
    id: "titan_door_breach",
    reason: "titan_door_breach",
    title: "Titan prorazil bezpečnostní dveře.",
    message: "Nic ho nezastavilo.",
    silenceBeforeMs: 800,
    effectDurationMs: 600,
  },
};
