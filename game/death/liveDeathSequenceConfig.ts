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
 * beze změny, jen: vyšší tón/rychlejší death zvuk (2.2×), impact/roar/glitch
 * VYPNUTÉ nastavením hlasitosti na 0 (žádná nová "enabled" pole navíc —
 * `playDeathSequenceSound` je při `volume <= 0` no-op, viz
 * DeathSequenceOverlay.tsx).
 *
 * `deathImageEnabled`/`gameOverOverlayEnabled` jsou VŽDY `false` — na žádost
 * (viz zadání "nepoužívat už death_bg_0.webp") tahle sekvence po dokončení
 * efektů (ticho, bílý záblesk, shake, zvuk) žádný vlastní statický obrázek
 * ani "GAME OVER" text nezobrazuje. Skutečný "reveal" smrti přebírá
 * `DeathScreen.tsx` — jeho `SceneBackground` s `death`/`deathDoorAttack`
 * scénou (4-snímková ghoul_death animace), kterou hráč uvidí hned po téhle
 * sekvenci, ne statický obrázek uprostřed ní.
 *
 * `gameOverAtMs: 0` (defaultně 1200) — na žádost "ghoul by měl vyrazit hned
 * po tom bliknutí": `resolveDeathSequencePhase` označí sekvenci za
 * `"complete"` (= `DeathSequenceOverlay.onComplete`, viz app/play/page.tsx)
 * `DEATH_SEQUENCE_COMPLETE_AFTER_MS` (1500 ms, deathSequenceTiming.ts) PO
 * `gameOverAtMs` — s `0` je to nejdřív, kdy může "complete" nastat, takže
 * ghoul_death animace naskočí `preDeathDelayMs + 1500` ms od smrti, těsně
 * (~300 ms) po konci bílého záblesku (`whiteFlashAtMs + whiteFlashDurationMs`
 * = 1190 ms), ne až o dalších ~1.2 s později. `shakeAtMs`/`shakeDurationMs`
 * jsou zkrácené/posunuté tak, aby shake doběhl PŘED touhle hranicí (ne aby
 * ho `DeathScreen` mount uprostřed usekl).
 */
export function getLiveDeathSequenceConfig(reason: DeathReason | null): DeathSequenceConfig {
  return clampDeathSequenceConfig({
    ...DEATH_SEQUENCE_DEFAULT_CONFIG,
    deathImageEnabled: false,
    gameOverOverlayEnabled: false,
    gameOverAtMs: 0,
    shakeAtMs: 1100,
    shakeDurationMs: 350,
    deathSoundPlaybackRate: 2.2,
    roarVolume: 0,
    impactVolume: 0,
    glitchVolume: 0,
  });
}
