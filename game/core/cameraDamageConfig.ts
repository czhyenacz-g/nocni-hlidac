import { CameraId } from "./types";

// Konfigurace vzácného útoku Ghoula na kameru (viz zadání) — hodnoty NEJSOU
// magic numbers v reduceru/komponentě, jen se sem odkazuje (viz CLAUDE.md
// "obtížnost patří do game/difficulty/, nikdy rozeseté podmínky" — stejný
// princip i mimo obtížnost samotnou).
//
// Kdo smí tenhle útok spustit se od kroku "první jednoduchá verze definice
// monster" neřeší hardcoded porovnáním na konkrétní enemy id (bývalé
// GHOUL_ENEMY_ID), ale schopností `monsterHasAbility(night.enemy.id,
// "summon_ghoul_camera_attack")` (viz game/enemies/monsterDefinitions.ts,
// game/core/cameraDamage.ts#canRollGhoulCameraAttack/canDebugTriggerGhoulCameraAttack).
// Ghoul zatím není samostatné hlavní monstrum — tahle schopnost je v první
// verzi přiřazená Impovi (jedinému existujícímu monstru).

/** Šance na útok kamery při KAŽDÉM použití sonického děla na Ghoula (bez ohledu na to, jestli dělo Ghoula odrazilo). */
export const GHOUL_CAMERA_ATTACK_CHANCE = 0.05;

/** Délka postupného ztmavování/zrnění, než kamera přejde do "offline" (viz zadání "cca 5 sekund"). */
export const CAMERA_FAILURE_TRANSITION_MS = 5000;

/** Minimální odstup mezi dvěma spuštěními útoku na kameru (viz zadání "zabránit zničení dvou kamer téměř současně"). */
export const CAMERA_ATTACK_COOLDOWN_MS = 15_000;

/** Jak dlouho Ghoul po ústupu od kamery jen čeká (advance/retreat chance 0), než pokračuje normální AI logikou. */
export const GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS = 7000;

/** Minimální odstup mezi dvěma přehráními zvuku kroků z mikrofonu offline kamery. */
export const DISABLED_CAMERA_FOOTSTEPS_COOLDOWN_MS = 10_000;

/**
 * Délka celé obrázkové sekvence útoku (viz zadání "cca 2,5 sekundy") —
 * `frameDurationMs` jedné animace se odvozuje jako `GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS /
 * frames.length` (viz game/cameras/cameraAttackAnimation.object13.ts), takže
 * počet snímků se může mezi sekvencemi lišit beze změny celkové délky.
 * MUSÍ platit `GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS + GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS
 * <= CAMERA_FAILURE_TRANSITION_MS` (viz zadání "kamera nesmí být offline už
 * na začátku animace") — zbylých ~500ms je krátké závěrečné ztmavnutí/
 * zrnění (fáze "signal-failing"), než TICK přepne kameru na "offline".
 */
export const GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS = 2500;

/** Jak dlouho po dohrání sekvence zůstane poslední snímek vidět (viz zadání "2 sekundy"). */
export const GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS = 2000;

/**
 * Kamery, které tahle mechanika nikdy nesmí vyřadit, protože by to
 * znemožnilo dokončení hry nebo zablokovalo ovládání (viz zadání "zjisti to
 * a bezpečně ji z této mechaniky vyřaď"). Prázdné pole — audit (viz report)
 * nenašel žádnou kameru, na které by přežití/dokončení směny záviselo:
 * repel dveří světlem/UV funguje nezávisle na tom, jestli je JAKÁKOLIV
 * kamera otevřená, přepínání kamer i ovládání zůstává funkční s libovolným
 * počtem offline kamer (mikrofon navíc zůstává funkční), a otevření dveří
 * bez kamerového ověření je penalizace (monstrum se vrátí o krok blíž), ne
 * tvrdá blokace. Pole zůstává připravené, kdyby budoucí mechanika tenhle
 * závěr změnila.
 */
export const PROTECTED_CAMERA_IDS: CameraId[] = [];

/**
 * Limit vyřazených kamer za JEDNU noc podle čísla noci (viz zadání) — pole
 * seřazené SESTUPNĚ podle `minNight`, `getMaxDisabledCamerasForNight` v
 * game/core/cameraDamage.ts najde první práh, který noc splňuje. Nikdy se
 * neukládá do GameState — vždy se dopočítává z aktuálního čísla noci.
 */
export const MAX_DISABLED_CAMERAS_BY_NIGHT: readonly { minNight: number; max: number }[] = [
  { minNight: 20, max: 3 },
  { minNight: 11, max: 2 },
  { minNight: 1, max: 1 },
];
