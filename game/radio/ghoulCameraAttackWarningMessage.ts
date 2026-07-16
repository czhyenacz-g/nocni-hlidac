/**
 * Text varování PŘED útokem Ghoula na kameru (viz zadání "než zaútočí a
 * zničí kameru, ať se předtím zobrazí zpráva") — přesně jeden, pevný text
 * (na rozdíl od cameraDisabledRadioMessage.ts/monsterRepelRadioMessages.ts
 * tu není žádný namluvený pool k výběru, jen krátký varovný nápis).
 * Zobrazuje se PŘESNĚ v okamžiku, kdy útok začíná (viz
 * GameState.cameraAttackStartedSeq, gameReducer.ts#attemptGhoulCameraAttack)
 * — tedy ještě PŘED pětisekundovým přechodem a samotným vyřazením obrazu
 * (viz GameState.cameraOfflineSeq, useCameraDisabledRadioMessage.ts), ne po
 * něm.
 */
export const GHOUL_CAMERA_ATTACK_WARNING_TEXT = "To ne! Sonické dělo přilákalo ghoula!";

/**
 * Jak dlouho (ms) zůstane varování vidět — stejný řád velikosti jako
 * ostatní krátké rádiové texty (viz monsterRepelRadioMessages.ts
 * OVERLAY_TAIL_MS/resolveMonsterRepelOverlayDurationMs), tady bez vázané
 * audio stopy (žádný namluvený soubor), takže pevná konstanta místo
 * odvození z délky nahrávky.
 */
export const GHOUL_CAMERA_ATTACK_WARNING_DURATION_MS = 2500;
