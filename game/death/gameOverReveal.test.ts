import { describe, expect, it } from "vitest";
import { resolveGameOverImageSrc } from "./gameOverReveal";
import { TITAN_ATTACK_SRC } from "../visuals/titanDoorAssets";
import { BACKGROUND_SCENES } from "../visuals/backgroundImages";
import { GAME_OVER_REVEAL_DURATION_MS } from "../balancing/constants";

const IMP_FINAL_DEATH_REVEAL_SRC = BACKGROUND_SCENES.door.frames[BACKGROUND_SCENES.door.frames.length - 1].src;
const GENERIC_DEATH_SRC = BACKGROUND_SCENES.genericDeath.frames[0].src;

describe("resolveGameOverImageSrc — deterministic, pure image selection, primarily by deathReason", () => {
  it("a real Imp attack (door_open_at_attack/bulb_replacement_attack) uses Imp's final door death-reveal image", () => {
    expect(resolveGameOverImageSrc("door_open_at_attack", "imp")).toBe(IMP_FINAL_DEATH_REVEAL_SRC);
    expect(resolveGameOverImageSrc("door_open_at_attack", "imp")).toBe("/object_13/background/door_open_death_0.webp");
    expect(resolveGameOverImageSrc("bulb_replacement_attack", "imp")).toBe(IMP_FINAL_DEATH_REVEAL_SRC);
  });

  it("titan_door_breach uses titan_attacks_broken_door.webp regardless of monsterId", () => {
    expect(resolveGameOverImageSrc("titan_door_breach", "titan")).toBe(TITAN_ATTACK_SRC);
    expect(resolveGameOverImageSrc("titan_door_breach", "titan")).toContain("titan_attacks_broken_door.webp");
  });

  // Regresní testy — "Death flow pro minihru a vybitou energii" (viz
  // zadání): tyhle dva death reasony NEJSOU útokem konkrétního monstra, musí
  // dostat generický death_bg_0.webp, NIKDY Imp/Ghoul/Titan obrázek — a to i
  // kdyby aktivní monstrum bylo zrovna Titan (deathReason má PŘEDNOST před
  // monsterId, viz zadání "Nepoužívej fallback typu activeMonsterId === ...").
  describe("emergency_run (smrt v minihře) — generic death image, never Imp/Ghoul/Titan", () => {
    it("uses the generic death_bg_0.webp image", () => {
      expect(resolveGameOverImageSrc("emergency_run", "imp")).toBe(GENERIC_DEATH_SRC);
      expect(resolveGameOverImageSrc("emergency_run", "imp")).toBe("/object_13/background/death_bg_0.webp");
    });

    it("stays generic even when activeMonsterId is titan (deathReason wins over monsterId)", () => {
      expect(resolveGameOverImageSrc("emergency_run", "titan")).toBe(GENERIC_DEATH_SRC);
      expect(resolveGameOverImageSrc("emergency_run", "titan")).not.toBe(TITAN_ATTACK_SRC);
    });

    it("never returns the Imp final door death-reveal image", () => {
      expect(resolveGameOverImageSrc("emergency_run", "imp")).not.toBe(IMP_FINAL_DEATH_REVEAL_SRC);
    });
  });

  describe("blackout_timeout (smrt vybitím energie) — generic death image, never Imp/Ghoul/Titan", () => {
    it("uses the generic death_bg_0.webp image", () => {
      expect(resolveGameOverImageSrc("blackout_timeout", "imp")).toBe(GENERIC_DEATH_SRC);
    });

    it("stays generic even when activeMonsterId is titan (deathReason wins over monsterId)", () => {
      expect(resolveGameOverImageSrc("blackout_timeout", "titan")).toBe(GENERIC_DEATH_SRC);
      expect(resolveGameOverImageSrc("blackout_timeout", "titan")).not.toBe(TITAN_ATTACK_SRC);
    });

    it("never returns the Imp final door death-reveal image", () => {
      expect(resolveGameOverImageSrc("blackout_timeout", "imp")).not.toBe(IMP_FINAL_DEATH_REVEAL_SRC);
    });
  });

  it("an unknown/future monster id with a real-attack deathReason falls back to the generic (Imp) image — never crashes, never returns empty", () => {
    const fallback = resolveGameOverImageSrc("door_open_at_attack", "some_future_monster");
    expect(fallback).toBe(IMP_FINAL_DEATH_REVEAL_SRC);
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("a null deathReason falls back to monsterId-based resolution (Titan attack image, or generic Imp fallback)", () => {
    expect(resolveGameOverImageSrc(null, "titan")).toBe(TITAN_ATTACK_SRC);
    expect(resolveGameOverImageSrc(null, "imp")).toBe(IMP_FINAL_DEATH_REVEAL_SRC);
  });

  it("is a pure function — same input always returns the same output", () => {
    expect(resolveGameOverImageSrc("titan_door_breach", "titan")).toBe(resolveGameOverImageSrc("titan_door_breach", "titan"));
    expect(resolveGameOverImageSrc("emergency_run", "imp")).toBe(resolveGameOverImageSrc("emergency_run", "imp"));
  });

  // Stejná ochrana jako u dřívější Titan opravy ("dvojitý Game Over") —
  // deathReason samo o sobě je stabilní pole GameState (nikdy se po smrti
  // nepřepisuje, viz gameReducer.ts), a monsterId sem chodí už jako
  // SNAPSHOT (app/play/page.tsx#deathMonsterId, zapsaný PŘED
  // survivedNights/titanEncounterNights resetem). Tenhle test jen dokládá,
  // že samotná funkce nedělá nic, co by mohlo výsledek "přehodit" mezi
  // dvěma voláními se stejnými vstupy — např. kdyby pozdější reset noci
  // změnil `activeMonsterId` na jiné monstrum, `deathReason` zůstane stejné
  // a výsledek se nezmění, dokud se nezmění některý ze dvou vstupů.
  it("later monsterId changes never flip a generic-death-reason result back to a monster image", () => {
    const beforeReset = resolveGameOverImageSrc("blackout_timeout", "imp");
    const afterHypotheticalReset = resolveGameOverImageSrc("blackout_timeout", "titan");
    expect(beforeReset).toBe(GENERIC_DEATH_SRC);
    expect(afterHypotheticalReset).toBe(GENERIC_DEATH_SRC);
    expect(beforeReset).toBe(afterHypotheticalReset);
  });
});

describe("GAME_OVER_REVEAL_DURATION_MS", () => {
  it("is exactly 4 seconds", () => {
    expect(GAME_OVER_REVEAL_DURATION_MS).toBe(4000);
  });
});
