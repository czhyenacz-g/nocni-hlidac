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
 * ghoul_death animace naskočí `preDeathDelayMs + 1500` ms od smrti, PEVNĚ
 * (`DEATH_SEQUENCE_COMPLETE_AFTER_MS` není per-config, je to sdílená
 * konstanta). `whiteFlashAtMs`/`shakeAtMs`/`shakeDurationMs` jsou proto
 * posunuté tak, aby záblesk i shake doběhly TĚSNĚ PŘED touhle pevnou
 * hranicí (1500 ms), ne dřív — jinak zůstává mezi koncem efektů a
 * odhalením ghula viditelná černá pauza (viz zadání "připadá mi, že je tam
 * mezera" — bylo jich reálně ~300 ms).
 *
 * `preDeathDelayMs: 400` (poloviční oproti defaultním 800, na žádost "zkrať
 * tu počáteční tmu" / "třeba na polovinu") — `resolveDarknessOpacity` už na
 * tomhle poli VŮBEC nezávisí (ztmavuje hned od `elapsedMs = 0`, viz
 * deathSequenceTiming.ts), takže tenhle "delay" dnes jen natahoval dobu
 * MEZI plným zčernáním (~600 ms, `blackoutDurationMs`) a začátkem
 * shake/záblesku (dřív dalších ~1350 ms čisté černé pauzy navíc). Na
 * polovině je ta pauza ~950 ms, pořád citelný "nádech" před úderem, ale ne
 * zbytečně natažený.
 */
export function getLiveDeathSequenceConfig(reason: DeathReason | null): DeathSequenceConfig {
  return clampDeathSequenceConfig({
    ...DEATH_SEQUENCE_DEFAULT_CONFIG,
    deathImageEnabled: false,
    gameOverOverlayEnabled: false,
    preDeathDelayMs: 400,
    gameOverAtMs: 0,
    whiteFlashAtMs: 1400,
    shakeAtMs: 1150,
    shakeDurationMs: 350,
    deathSoundPlaybackRate: 2.2,
    roarVolume: 0,
    impactVolume: 0,
    glitchVolume: 0,
  });
}
