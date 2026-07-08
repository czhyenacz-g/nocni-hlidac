import { EmergencyWorldEffect } from "../minigame/types";

// Trvalé vlastnictví brokovnice (viz GameState.hasShotgun/shotgunAmmo) —
// první skutečný krok k budoucímu "true endingu" (viz zadání). Persistuje
// jen v rámci AKTUÁLNÍHO runu (stejná "override při START_SHIFT/RESTART_SHIFT"
// konvence jako gameMode/livesRemaining v game/core/gameMode.ts) — NENÍ to
// campaign hodnota jako roomBulbs/bulbsRemaining; nový run (viz
// app/play/page.tsx#handleBeginShift) vždy začíná bez brokovnice.

/** Zatím napevno 1 (viz zadání "Prozatím max 1 náboj najednou") — budoucí "vem náboj -> vyběhni -> vystřel -> vrať se" smyčka tenhle strop časem zvýší, ne nahradí jiným natvrdo psaným číslem jinde v kódu. */
export const SHOTGUN_MAX_AMMO = 1;

/**
 * Dobíjecí pravidlo (viz zadání) — MVP je záměrně "blunt": s brokovnicí vždy
 * přesně SHOTGUN_MAX_AMMO, bez brokovnice vždy 0, bez ohledu na aktuální
 * hodnotu (žádné postupné doplňování/hromadění zatím). `currentAmmo` je
 * součástí signatury už teď (na žádost zadání), ať budoucí jemnější pravidlo
 * (víc než 1 max, dobíjení po částech) nemusí měnit volající kód.
 */
export function getRechargedShotgunAmmo(hasShotgun: boolean, currentAmmo: number): number {
  return hasShotgun ? SHOTGUN_MAX_AMMO : 0;
}

export interface AppliedShotgunReturnResult {
  hasShotgun: boolean;
  shotgunAmmo: number;
}

/**
 * Aplikuje `shotgun_acquired` z worldEffects + dobíjecí pravidlo výše na
 * aktuální stav brokovnice — volá se při KAŽDÉM bezpečném návratu do
 * kanceláře z emergency výpravy (viz
 * app/play/page.tsx#handleEmergencyMiniGameComplete), bez ohledu na to, co
 * přesně hráč přinesl (baterie/brokovnice/nic) a kolik nábojů cestou
 * spotřeboval — MVP pravidlo je "vždy 1 náboj po bezpečném návratu, pokud má
 * brokovnici" (viz zadání). Sebrání samotné v minihře sem nikdy nedorazí bez
 * úspěšného návratu (smrt/nedokončená výprava worldEffects vůbec nevytvoří,
 * viz game/minigame/logic.ts#createReturnedResult) — proto tahle funkce
 * nemusí řešit "hráč zemřel s brokovnicí v ruce", to už je vyloučené dřív.
 */
export function applyShotgunEmergencyReturn(
  hasShotgun: boolean,
  shotgunAmmo: number,
  effects: EmergencyWorldEffect[] | undefined,
): AppliedShotgunReturnResult {
  const shotgunAcquired = (effects ?? []).some((effect) => effect.type === "shotgun_acquired");
  const nextHasShotgun = hasShotgun || shotgunAcquired;
  return { hasShotgun: nextHasShotgun, shotgunAmmo: getRechargedShotgunAmmo(nextHasShotgun, shotgunAmmo) };
}
