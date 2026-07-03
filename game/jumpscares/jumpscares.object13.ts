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
};
