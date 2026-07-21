import { describe, expect, it } from "vitest";
import { resolveDeathScreenScene } from "./deathScreenScene";

// Regresní testy pro "Death flow pro minihru a vybitou energii" (viz
// zadání) — přesně reprodukuje preferovaný princip ze zadání:
//
//   switch (deathReason) {
//     case MINI_GAME_DEATH:
//     case POWER_DEPLETED:
//       return BACKGROUND_SCENES.genericDeath;
//     case TITAN_DOOR_BREACH:
//       return BACKGROUND_SCENES.titanDeath;
//     case IMP_ATTACK:
//       return BACKGROUND_SCENES.impDeath;
//   }
//
// (MINI_GAME_DEATH = "emergency_run", POWER_DEPLETED = "blackout_timeout",
// IMP_ATTACK = "door_open_at_attack"/"bulb_replacement_attack", impDeath =
// "deathDoorAttack" v současné architektuře, viz komentář v
// deathScreenScene.ts.)

describe("resolveDeathScreenScene — minihra a vybitá energie NEJSOU útok konkrétního monstra", () => {
  it("emergency_run (smrt v minihře) -> genericDeath, nikdy Ghoul/Imp/Titan scéna", () => {
    expect(resolveDeathScreenScene("emergency_run")).toBe("genericDeath");
  });

  it("blackout_timeout (smrt vybitím energie) -> genericDeath, nikdy Ghoul/Imp/Titan scéna", () => {
    expect(resolveDeathScreenScene("blackout_timeout")).toBe("genericDeath");
  });
});

describe("resolveDeathScreenScene — skutečné útoky monster zachovávají svůj vlastní obrázek", () => {
  it("titan_door_breach -> titanDeath", () => {
    expect(resolveDeathScreenScene("titan_door_breach")).toBe("titanDeath");
  });

  it("door_open_at_attack -> deathDoorAttack (Impův/Ghoulův útok u dveří)", () => {
    expect(resolveDeathScreenScene("door_open_at_attack")).toBe("deathDoorAttack");
  });

  it("bulb_replacement_attack -> deathDoorAttack (stejná sekvence jako door_open_at_attack)", () => {
    expect(resolveDeathScreenScene("bulb_replacement_attack")).toBe("deathDoorAttack");
  });
});

describe("resolveDeathScreenScene — fallback pro nepokryté reasony", () => {
  it("titan_ambush_emergency_run (mimo explicitní zadání) -> generická Ghoul death animace, beze změny", () => {
    expect(resolveDeathScreenScene("titan_ambush_emergency_run")).toBe("death");
  });

  it("null -> generická Ghoul death animace (bezpečný fallback, nikdy nespadne)", () => {
    expect(resolveDeathScreenScene(null)).toBe("death");
  });
});

describe("resolveDeathScreenScene — čistá, deterministická funkce", () => {
  it("stejný vstup vždy vrátí stejný výstup", () => {
    expect(resolveDeathScreenScene("emergency_run")).toBe(resolveDeathScreenScene("emergency_run"));
    expect(resolveDeathScreenScene("blackout_timeout")).toBe(resolveDeathScreenScene("blackout_timeout"));
  });
});
