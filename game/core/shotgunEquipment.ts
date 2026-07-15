import { EmergencyWorldEffect } from "../minigame/types";

// Trvalé vlastnictví brokovnice (viz GameState.hasShotgun/hasDoubleBarrelShotgun/
// shotgunAmmo) — první skutečný krok k true endingu (viz zadání). Persistuje
// jen v rámci AKTUÁLNÍHO runu (stejná "override při START_SHIFT/RESTART_SHIFT"
// konvence jako gameMode/livesRemaining v game/core/gameMode.ts) — NENÍ to
// campaign hodnota jako roomBulbs/bulbsRemaining. Výjimka: na ÚPLNĚM ZAČÁTKU
// nového runu (createFreshRunShotgunEquipment níže) může už rovnou začít s
// dvouhlavňovkou, POKUD ji hráč trvale odemkl (viz
// game/core/monsterDefeatReward.ts#doubleBarrelUnlocked, true ending) —
// jinak (většina hráčů, žádný true ending zatím) beze změny "nový run vždy
// začíná bez brokovnice".
//
// Menší, bezpečnější rozšíření místo plného refactoru na `shotgunType: "none"
// | "single" | "double"` (zvažováno, viz report u zadání) — `hasShotgun`
// zůstává "má vůbec nějakou brokovnici" (true pro single i double),
// `hasDoubleBarrelShotgun` je jen dodatečný "je to konkrétně ta lepší
// varianta" příznak navrch. Čtěte přes helpery níže (hasAnyShotgun/
// isDoubleBarrelShotgun/getShotgunMaxAmmo), ne přímo pole zvlášť, ať se
// podmínky nerozsypou po celém kódu.

/** Max náboje běžné (jednohlavňové) brokovnice. */
export const SHOTGUN_MAX_AMMO = 1;

/** Max náboje dvouhlavňovky — dva výstřely (a tedy až dva potvrzené zásahy) před nutným návratem, viz zadání. */
export const DOUBLE_BARREL_SHOTGUN_MAX_AMMO = 2;

/** Minimální tvar potřebný pro rozhodnutí o brokovnici — `Pick<GameState, ...>` v praxi, ale bez importu GameState (stejná nezávislost jako zbytek souboru). */
export interface ShotgunEquipmentState {
  hasShotgun: boolean;
  hasDoubleBarrelShotgun: boolean;
}

/** Má hráč VŮBEC nějakou brokovnici (jednohlavňovou nebo dvouhlavňovku) — nerozlišuje typ. */
export function hasAnyShotgun(state: Pick<ShotgunEquipmentState, "hasShotgun">): boolean {
  return state.hasShotgun;
}

/** Konkrétně dvouhlavňovka — `hasDoubleBarrelShotgun` samo o sobě nesmí nikdy platit bez `hasShotgun` (viz createFreshRunShotgunEquipment/applyShotgunEmergencyReturn), ale kontrolujeme oba, ať helper nezávisí na tomhle invariantu. */
export function isDoubleBarrelShotgun(state: ShotgunEquipmentState): boolean {
  return state.hasShotgun && state.hasDoubleBarrelShotgun;
}

/** 0 bez brokovnice, SHOTGUN_MAX_AMMO s běžnou, DOUBLE_BARREL_SHOTGUN_MAX_AMMO s dvouhlavňovkou. Jediné místo, které tenhle strop počítá. */
export function getShotgunMaxAmmo(state: ShotgunEquipmentState): number {
  if (!state.hasShotgun) return 0;
  return state.hasDoubleBarrelShotgun ? DOUBLE_BARREL_SHOTGUN_MAX_AMMO : SHOTGUN_MAX_AMMO;
}

/**
 * Dobíjecí pravidlo (viz zadání) — MVP je záměrně "blunt": s brokovnicí vždy
 * přesně na max (podle typu, viz getShotgunMaxAmmo), bez brokovnice vždy 0,
 * bez ohledu na aktuální hodnotu (žádné postupné doplňování/hromadění
 * zatím). Volá se po KAŽDÉM bezpečném návratu z emergency výpravy i na
 * začátku každé nové noci (viz app/play/page.tsx#handleBeginShift/
 * handleEmergencyMiniGameComplete).
 */
export function getRechargedShotgunAmmo(state: ShotgunEquipmentState): number {
  return getShotgunMaxAmmo(state);
}

/**
 * Munice, kterou hráč aktuálně má oproti kapacitě AKTUÁLNÍ zbraně (viz
 * getShotgunMaxAmmo) — `false` bez brokovnice (dávkovač nemá co dávkovat) i
 * na plné kapacitě (žádné "přeplnění"). Jediné místo, které rozhoduje, jestli
 * dávkovač na LeftWallView smí přidat náboj (viz requestSingleAmmo,
 * app/play/page.tsx#handleRequestAmmo).
 */
export function canRequestAmmo(state: ShotgunEquipmentState & { shotgunAmmo: number }): boolean {
  return state.hasShotgun && state.shotgunAmmo < getShotgunMaxAmmo(state);
}

/**
 * Jedno kliknutí na "ZAŽÁDAT O MUNICI" = přesně jeden náboj navíc, nikdy nad
 * kapacitu aktuální zbraně (viz zadání "dvouhlavňovku musí hráč nabít dvěma
 * kliknutími"). Bez brokovnice nebo na plné kapacitě vrací munici beze změny
 * — volající (canRequestAmmo) rozhoduje, jestli má kliknutí vůbec smysl
 * (jinak jen zvuk odmítnutí), tahle funkce sama o sobě nikdy nepřekročí strop.
 */
export function requestSingleAmmo(state: ShotgunEquipmentState & { shotgunAmmo: number }): number {
  if (!canRequestAmmo(state)) return state.shotgunAmmo;
  return state.shotgunAmmo + 1;
}

export interface AppliedShotgunReturnResult {
  hasShotgun: boolean;
  hasDoubleBarrelShotgun: boolean;
  shotgunAmmo: number;
}

/**
 * Aplikuje `shotgun_acquired`/`ammo_acquired` z worldEffects na aktuální stav
 * brokovnice — volá se při KAŽDÉM bezpečném návratu do kanceláře z emergency
 * výpravy (viz app/play/page.tsx#handleEmergencyMiniGameComplete). NA ROZDÍL
 * od dřívějšího chování (getRechargedShotgunAmmo) se munice po návratu už
 * NEDOBÍJÍ na max — hráč se vrací s tím, co mu reálně zbylo (`shotgunAmmo`
 * před výpravou, minus `shotsUsed` vystřelené v EmergencyMiniGame.tsx#fireShot,
 * plus případný `ammo_acquired` loot), clampnuté do 0..kapacita AKTUÁLNÍ
 * zbraně (viz zadání "to je záměrné nové herní chování"). `shotgun_acquired`
 * worldEffect vždy znamená BĚŽNOU brokovnici (loot v minihře nikdy
 * nenabízí dvouhlavňovku, viz canStartShotgunEmergencyRun — ta se
 * nespawnuje, jakmile `hasShotgun` už je `true`, ať už jednohlavňová nebo
 * dvouhlavňová) — `hasDoubleBarrelShotgun` se tu proto nikdy NEnastavuje,
 * jen se přenáší beze změny (jedinou cestou k dvouhlavňovce je
 * createFreshRunShotgunEquipment na začátku runu). Sebrání samotné v
 * minihře sem nikdy nedorazí bez úspěšného návratu (smrt/nedokončená
 * výprava worldEffects vůbec nevytvoří, viz
 * game/minigame/logic.ts#createReturnedResult).
 */
export function applyShotgunEmergencyReturn(
  current: ShotgunEquipmentState,
  shotgunAmmoBeforeRun: number,
  shotsUsed: number,
  effects: EmergencyWorldEffect[] | undefined,
): AppliedShotgunReturnResult {
  const shotgunAcquired = (effects ?? []).some((effect) => effect.type === "shotgun_acquired");
  const ammoAcquired = (effects ?? [])
    .filter((effect): effect is Extract<EmergencyWorldEffect, { type: "ammo_acquired" }> => effect.type === "ammo_acquired")
    .reduce((sum, effect) => sum + effect.amount, 0);
  const nextHasShotgun = current.hasShotgun || shotgunAcquired;
  const next: ShotgunEquipmentState = { hasShotgun: nextHasShotgun, hasDoubleBarrelShotgun: current.hasDoubleBarrelShotgun };
  const capacity = getShotgunMaxAmmo(next);
  const nextAmmo = Math.max(0, Math.min(capacity, shotgunAmmoBeforeRun - shotsUsed + ammoAcquired));
  return { ...next, shotgunAmmo: nextAmmo };
}

export interface FreshRunShotgunEquipment {
  hasShotgun: boolean;
  hasDoubleBarrelShotgun: boolean;
  shotgunAmmo: number;
}

/**
 * Výchozí výbava brokovnice na ÚPLNĚM ZAČÁTKU nového runu (noc 1) — volá se
 * jen z "fresh run" větve START_SHIFT/RESTART_SHIFT (viz
 * app/play/page.tsx#handleBeginShift), NIKDY při pokračování běžícího runu
 * (ten si nese `state.hasShotgun`/`state.hasDoubleBarrelShotgun`/
 * `state.shotgunAmmo` beze změny). Bez odemčené dvouhlavňovky (viz
 * game/core/monsterDefeatReward.ts#doubleBarrelUnlocked) přesně jako dřív
 * (žádná zbraň) — s odemčenou dvouhlavňovkou rovnou nabitá na
 * DOUBLE_BARREL_SHOTGUN_MAX_AMMO od první noci, žádná běžná brokovnice se
 * navíc nenabízí (canStartShotgunEmergencyRun to už samo blokuje, jakmile
 * je `hasShotgun` true).
 */
export function createFreshRunShotgunEquipment(doubleBarrelUnlocked: boolean): FreshRunShotgunEquipment {
  if (!doubleBarrelUnlocked) return { hasShotgun: false, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 };
  const equipment: ShotgunEquipmentState = { hasShotgun: true, hasDoubleBarrelShotgun: true };
  return { ...equipment, shotgunAmmo: getShotgunMaxAmmo(equipment) };
}
