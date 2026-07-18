import { describe, expect, it } from "vitest";
import { getMonsterDefinition, IMP, monsterHasAbility } from "./monsterDefinitions";
import { IMP_ENEMY } from "./imp";
import { IMP_PRESENTATION } from "./monsterPresentation";
import { CAMERA_ASSETS, getCameraImageSrc } from "../cameras/cameraAssets.object13";
import { NIGHT_01 } from "../nights/night01";
import { CameraId, EnemyMoveDecision, EnemyStage } from "../core/types";

describe("IMP", () => {
  it("1. has id 'imp', displayName 'Imp', and the summon_ghoul_camera_attack ability", () => {
    expect(IMP.id).toBe("imp");
    expect(IMP.displayName).toBe("Imp");
    expect(IMP.abilities).toContain("summon_ghoul_camera_attack");
  });

  it("2. is a single complete definition — abilities, presentation, and gameplay all present", () => {
    expect(IMP.abilities.length).toBeGreaterThan(0);
    expect(IMP.presentation).toBeDefined();
    expect(IMP.gameplay).toBeDefined();
  });

  it("presentation is the same IMP_PRESENTATION object — no separate presentation registry", () => {
    expect(IMP.presentation).toBe(IMP_PRESENTATION);
  });

  it("2. 'movement' no longer exists on MonsterDefinition at the type level (renamed to 'gameplay')", () => {
    // @ts-expect-error — movement was renamed to gameplay; this must fail to compile.
    expect(IMP.movement).toBeUndefined();
  });

  it("6. gameplay carries the exact same route/probability/repel/name values as before this rename", () => {
    expect(IMP.gameplay.name).toBe("Neznámá postava");
    expect(IMP.gameplay.routeVariants).toEqual([
      ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
      ["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "attack"],
    ]);
    expect(IMP.gameplay.advanceChance).toBe(0.16);
    expect(IMP.gameplay.retreatChance).toBe(0.1);
    expect(IMP.gameplay.doorHoldRangeMs).toEqual({ min: 6000, max: 8000 });
    expect(IMP.gameplay.doorLightRepelRequiredMs).toBe(1500);
    expect(IMP.gameplay.doorHallwayUvRepelRequiredMs).toBe(7000);
    expect(IMP.gameplay.forcedRetreatAfterLightRepel).toEqual({ durationMs: 11_000, chance: 1 });
    expect(IMP.gameplay.forcedRetreatAfterUvRepel).toEqual({ durationMs: 6_500, chance: 0.6 });
    expect(IMP.gameplay.forcedRetreatAfterGaveUp).toEqual({ durationMs: 10_000, chance: 0.4 });
    expect(IMP.gameplay.monsterRetreatStage).toBe("outside");
  });

  it("displayName ('Imp') and gameplay.name ('Neznámá postava') are intentionally different — dev-facing vs. player-facing name", () => {
    expect(IMP.displayName).toBe("Imp");
    expect(IMP.gameplay.name).toBe("Neznámá postava");
    expect(IMP.displayName).not.toBe(IMP.gameplay.name);
  });
});

describe("getMonsterDefinition", () => {
  it("resolves 'imp' to the IMP definition", () => {
    expect(getMonsterDefinition("imp")).toBe(IMP);
  });

  it("7. resolves the active monster's definition via NightDefinition.enemy.id — the sole identity source", () => {
    expect(getMonsterDefinition(NIGHT_01.enemy.id)).toBe(IMP);
  });

  it("3. presentation reachable through the single registry contains the same camera assets and outcome sequences as before", () => {
    const presentation = getMonsterDefinition("imp")?.presentation;
    expect(presentation?.camera).toBe(CAMERA_ASSETS);
    expect(presentation?.outcomes.playerKill.default).toBe("death");
    expect(presentation?.outcomes.monsterDeath).toBe("monsterDefeated");
  });

  it("4. no separate presentation registry module export exists anymore", async () => {
    const presentationModule: Record<string, unknown> = await import("./monsterPresentation");
    expect(presentationModule.MONSTER_PRESENTATION_REGISTRY).toBeUndefined();
    expect(presentationModule.getMonsterPresentation).toBeUndefined();
    expect(presentationModule.getMonsterCameraAssets).toBeUndefined();
  });

  it("returns undefined for an unregistered id, never throws", () => {
    expect(getMonsterDefinition("titan")).toBeUndefined();
    expect(getMonsterDefinition("")).toBeUndefined();
  });
});

describe("monsterHasAbility", () => {
  it("true for imp + summon_ghoul_camera_attack", () => {
    expect(monsterHasAbility("imp", "summon_ghoul_camera_attack")).toBe(true);
  });

  it("8. Ghoul's camera attack still gates on the active monster's ability, via NightDefinition.enemy.id", () => {
    expect(monsterHasAbility(NIGHT_01.enemy.id, "summon_ghoul_camera_attack")).toBe(true);
  });

  it("false for an unregistered monster id, never throws", () => {
    expect(monsterHasAbility("titan", "summon_ghoul_camera_attack")).toBe(false);
    expect(monsterHasAbility("basic_intruder", "summon_ghoul_camera_attack")).toBe(false);
  });
});

describe("5. IMP_ENEMY (game/enemies/imp.ts) is derived from IMP.gameplay, no duplicated values", () => {
  it("equals { id: IMP.id, ...IMP.gameplay } exactly", () => {
    expect(IMP_ENEMY).toEqual({ id: IMP.id, ...IMP.gameplay });
  });

  it("id matches IMP.id", () => {
    expect(IMP_ENEMY.id).toBe("imp");
  });

  it("NightDefinition.enemy is exactly IMP_ENEMY — unchanged runtime shape", () => {
    expect(NIGHT_01.enemy).toBe(IMP_ENEMY);
  });
});

describe("7. getCameraImageSrc — resolving through Imp's definition produces identical output to the pre-change direct call", () => {
  const cases: Array<[CameraId, boolean, boolean, number, EnemyStage?, EnemyMoveDecision?, number?]> = [
    ["door_hallway", false, false, 0, "at_door"],
    ["door_hallway", false, true, 0, "at_door"],
    ["door_hallway", true, false, 0, "door_hallway"],
    ["outer_yard", true, false, 0, "outer_yard"],
    ["left_hallway", true, false, 0, "left_hallway", "retreat"],
    ["right_hallway", true, false, 1234, "right_hallway", "advance", 3],
  ];

  it.each(cases)("same result with and without an explicit monsterId-resolved assets map (%s)", (...args) => {
    const withoutPresentation = getCameraImageSrc(...args);
    const presentation = getMonsterDefinition("imp")?.presentation;
    const withPresentation = getCameraImageSrc(...args, presentation?.camera);
    expect(withPresentation).toBe(withoutPresentation);
  });
});

describe("10. no new monster identity source", () => {
  it("createInitialGameState-produced state has no monsterId/monsterDefinition/presentation/gameplay field", async () => {
    const { createInitialGameState } = await import("../core/gameState");
    const state = createInitialGameState(NIGHT_01) as unknown as Record<string, unknown>;
    expect("monsterId" in state).toBe(false);
    expect("monsterDefinition" in state).toBe(false);
    expect("presentation" in state).toBe(false);
    expect("gameplay" in state).toBe(false);
  });
});
