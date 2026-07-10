// Napojení death sekvence (viz deathSequenceConfig.ts, DeathSequenceOverlay.tsx)
// na SKUTEČNOU hru (viz zadání "chci to i na live, když někdo zemře") — sám
// deathSequenceConfig.ts zůstává gameplay-agnostický (jen /death-test lab),
// tenhle soubor je jediné místo, kde se death sekvence potkává s
// `DeathReason` ze skutečné hry.

import { DeathReason } from "@/game/core/types";
import { clampDeathSequenceConfig, DEATH_SEQUENCE_DEFAULT_CONFIG, DeathSequenceConfig } from "./deathSequenceConfig";

const DOOR_ATTACK_REASONS: DeathReason[] = ["door_open_at_attack", "bulb_replacement_attack"];

/** Stejné rozlišení jako `BACKGROUND_SCENES.deathDoorAttack` v DeathScreen.tsx — sdílené i s `DeathSequenceOverlay`'s `variant` prop v app/play/page.tsx, ať obojí vždy souhlasí. */
export function isDoorAttackDeath(reason: DeathReason | null): boolean {
  return reason !== null && DOOR_ATTACK_REASONS.includes(reason);
}

/**
 * Vyladěno na /death-test (viz zadání "teď se mi to líbí s
 * deathSoundPlaybackRate: 2.2; všichni jinak v defaultu... impact, roar a
 * glitch zvuky vůbec nepoužívat") — vychází z `DEATH_SEQUENCE_DEFAULT_CONFIG`
 * beze změny, jen: vyšší tón/rychlejší death zvuk (2.2×), a impact/roar/
 * glitch VYPNUTÉ nastavením hlasitosti na 0 (žádná nová "enabled" pole
 * navíc — `playDeathSequenceSound` je při `volume <= 0` no-op, viz
 * DeathSequenceOverlay.tsx). Death image se vybírá stejně jako dosavadní
 * `SceneBackground` v DeathScreen.tsx (deathDoorAttack vs death).
 */
export function getLiveDeathSequenceConfig(reason: DeathReason | null): DeathSequenceConfig {
  return clampDeathSequenceConfig({
    ...DEATH_SEQUENCE_DEFAULT_CONFIG,
    deathImageId: isDoorAttackDeath(reason) ? "door_open_death" : "death_bg",
    deathSoundPlaybackRate: 2.2,
    roarVolume: 0,
    impactVolume: 0,
    glitchVolume: 0,
  });
}
