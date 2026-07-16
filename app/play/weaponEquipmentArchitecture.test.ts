import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Statická kontrola zdrojového textu app/play/page.tsx — regresní pojistka
// pro equipment systém (viz zadání "profilový kontrakt V2 + equipment" —
// "KAŽDÁ TRVALÁ ZMĚNA VLASTNICTVÍ ZBRANĚ V HARDCORE MUSÍ BÝT EXPLICITNĚ
// POTVRZENA SERVEREM V OKAMŽIKU, KDY K NÍ DOJDE, mise vždy startuje s tím,
// co říká profil"). Stejný "zamkni zdrojový text, komponenta sama nejde
// snadno testovat bez jsdom" vzor jako
// app/play/bulbInventoryArchitecture.test.ts — funkční pokrytí samotné
// rozhodovací logiky (persistence mode, fresh-run odvození, migrace) mají
// vlastní čisté unit testy v game/equipment/*.test.ts a
// game/core/shotgunEquipment.test.ts; tenhle soubor jen ověřuje, že
// page.tsx tuhle logiku SKUTEČNĚ volá na správných místech, a že se tam
// nevrátil starý bug (přímé čtení lokální odměny jako autority pro
// Hardcore).
const pageSource = readFileSync(join(__dirname, "page.tsx"), "utf8");

describe("app/play/page.tsx — weapon ownership is server-confirmed equipment, not a local reward flag (bug fix)", () => {
  it("both fresh-run branches (START_SHIFT and RESTART_SHIFT) derive starting shotgun equipment via resolveFreshRunShotgunEquipment", () => {
    const occurrences = pageSource.match(/resolveFreshRunShotgunEquipment\(/g) ?? [];
    // Jedno volání pro RESTART_SHIFT (fresh run po smrti) a jedno pro
    // START_SHIFT (nový run z menu) — přesně tahle dvě místa dřív volala
    // createFreshRunShotgunEquipment(getMonsterDefeatReward().doubleBarrelUnlocked)
    // přímo, což byl přesně nahlášený bug (Hardcore hráč přišel o brokovnici).
    expect(occurrences.length).toBe(2);
  });

  it("createFreshRunShotgunEquipment (the local-only fallback) is no longer called directly in page.tsx — only indirectly via the resolver", () => {
    expect(pageSource).not.toMatch(/[^.]createFreshRunShotgunEquipment\(/);
  });

  it("the single-shotgun pickup path (handleEmergencyMiniGameComplete) calls unlockWeapon(\"single_shotgun\") for the server-confirmed path", () => {
    const start = pageSource.indexOf("function handleEmergencyMiniGameComplete(");
    const end = pageSource.indexOf("function handleMonsterHit()");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = pageSource.slice(start, end);
    expect(block).toContain('unlockWeapon("single_shotgun")');
    // Guarded by the pending ref — never fires a second overlapping unlock request.
    expect(block).toContain("weaponAcquisitionPendingRef.current");
  });

  it("the double-barrel true-ending path (handleMonsterDefeatedCinematicComplete) calls unlockWeapon(\"double_barrel_shotgun\"), only inside the Hardcore branch", () => {
    const start = pageSource.indexOf("function handleMonsterDefeatedCinematicComplete(");
    const end = pageSource.indexOf("function handleToggleDoor()");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = pageSource.slice(start, end);
    const hardcoreGuardIndex = block.indexOf('if (state.gameMode !== "hardcore") return;');
    const unlockIndex = block.indexOf('unlockWeapon("double_barrel_shotgun")');
    expect(hardcoreGuardIndex).toBeGreaterThan(-1);
    expect(unlockIndex).toBeGreaterThan(hardcoreGuardIndex);
  });

  it("the existing-player migration effect exists and attempts at most once via its own ref", () => {
    expect(pageSource).toContain("resolveExistingPlayerWeaponMigrationAction");
    expect(pageSource).toContain("existingPlayerWeaponMigrationAttemptedRef");
  });

  it("old parallel local reward (MonsterDefeatReward.doubleBarrelUnlocked) is only read as the non-Hardcore/no-profile fallback argument, never assigned directly to hasShotgun/hasDoubleBarrelShotgun state", () => {
    // The only remaining call sites read it to pass into a resolver
    // function (as `localDoubleBarrelUnlocked`/migration check), never
    // `dispatch({ ..., hasDoubleBarrelShotgun: getMonsterDefeatReward()... })`.
    expect(pageSource).not.toMatch(/hasDoubleBarrelShotgun:\s*getMonsterDefeatReward\(\)/);
  });
});
