import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveImpAdvance } from "./resolveImpAdvance";
import { createInitialGameState } from "../core/gameState";
import { NIGHT_01 } from "../nights/night01";
import { IMP } from "./monsterDefinitions";
import { GameState } from "../core/types";

// Stejná fixture konvence jako game/core/gameReducer.cameraDamage.test.ts —
// pravá větev natvrdo (viz IMP.gameplay.routeVariants), enemyLocationEnteredAtMs
// daleko v minulosti, ať MONSTER_MIN_LOCATION_STAY_MS nikdy nezablokuje
// testovaný hod (min-stay se testuje samostatně v monsterMinStay.test.ts).
function stateWith(overrides: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    enemyRoute: ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
    enemyLocationEnteredAtMs: -1_000_000,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveImpAdvance — advance/retreat/stay probability roll", () => {
  it("2. roll below advanceChance -> advance, uses IMP.gameplay.advanceChance (0.16) unmodified", () => {
    const state = stateWith({ enemyStage: "outer_yard" });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.1, // 0.1 < 0.16
    });
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.lastEnemyDecision).toBe("advance");
  });

  it("3. roll in the retreat bucket -> retreat, uses IMP.gameplay.retreatChance (0.1) unmodified", () => {
    const state = stateWith({ enemyStage: "right_hallway" });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.2, // 0.16 <= 0.2 < 0.16+0.1 = 0.26
    });
    expect(result.enemyStage).toBe("outer_yard");
    expect(result.lastEnemyDecision).toBe("retreat");
  });

  it("roll at/above advanceChance+retreatChance -> stay, no stage change", () => {
    const state = stateWith({ enemyStage: "right_hallway" });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.5,
    });
    expect(result.enemyStage).toBeUndefined(); // no override -> reducer keeps current stage
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("retreat that would move index below the route start degrades to 'stay' (matches pre-extraction boundary handling)", () => {
    const state = stateWith({ enemyStage: "outside" });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.2, // retreat bucket, but already at index 0
    });
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("14. random is called exactly once for a plain movement roll", () => {
    const state = stateWith({ enemyStage: "right_hallway" });
    const randomSpy = vi.fn(() => 0.99);
    resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: randomSpy,
    });
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });
});

describe("resolveImpAdvance — 4. routeVariants used unmodified (left-hallway branch)", () => {
  it("advances along whatever route is on state.enemyRoute, not a hardcoded one", () => {
    const state = stateWith({
      enemyStage: "outer_yard",
      enemyRoute: ["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "attack"],
    });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.1,
    });
    expect(result.enemyStage).toBe("left_hallway");
  });
});

describe("resolveImpAdvance — 5. door encounter (closed door)", () => {
  it("first tick at a closed door -> 'waiting_at_door', rolls the hold target via the injected random", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: true, enemyAtDoorSinceMs: 1000, elapsedMs: 1000 });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.5, // mid-range hold target: min + 0.5*(max-min)
    });
    expect(result.lastEnemyDecision).toBe("waiting_at_door");
    expect(result.enemyDoorHoldTargetMs).toBe(
      IMP.gameplay.doorHoldRangeMs.min + 0.5 * (IMP.gameplay.doorHoldRangeMs.max - IMP.gameplay.doorHoldRangeMs.min),
    );
    expect(result.doorBangSeq).toBe(1);
  });

  it("10. progress reaching the hold target -> 'gave_up', steps back one stage, sets forcedRetreatAfterGaveUp fields unmodified", () => {
    const state = stateWith({
      enemyStage: "at_door",
      doorClosed: true,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: 100,
      enemyDoorHoldProgressMs: 100,
      elapsedMs: 5000,
    });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0,
    });
    expect(result.lastEnemyDecision).toBe("gave_up");
    expect(result.enemyStage).toBe("door_hallway");
    expect(result.monsterRetreatedTo).toBe("door_hallway");
    expect(result.enemyForcedRetreatUntilMs).toBe(5000 + IMP.gameplay.forcedRetreatAfterGaveUp.durationMs);
    expect(result.enemyForcedRetreatChance).toBe(IMP.gameplay.forcedRetreatAfterGaveUp.chance);
  });

  it("11. monsterRetreatVerified honors requireMonsterRetreatVerification exactly (false when verification required)", () => {
    const state = stateWith({
      enemyStage: "at_door",
      doorClosed: true,
      enemyDoorHoldTargetMs: 100,
      enemyDoorHoldProgressMs: 100,
      elapsedMs: 5000,
    });
    const verificationRequired = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: true,
      random: () => 0,
    });
    expect(verificationRequired.monsterRetreatVerified).toBe(false);

    const verificationNotRequired = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0,
    });
    expect(verificationNotRequired.monsterRetreatVerified).toBe(true);
  });

  it("grace period active -> 'office_threat_grace', no movement", () => {
    const state = stateWith({
      enemyStage: "at_door",
      doorClosed: false,
      enemyDoorAttackGraceUntilMs: 10_000,
      elapsedMs: 5000,
    });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
    });
    expect(result.lastEnemyDecision).toBe("office_threat_grace");
    expect(result.enemyStage).toBeUndefined();
  });
});

describe("resolveImpAdvance — 12. door open, office/death entry", () => {
  it("open door + playerView 'door' -> reveal death (doorDeathRevealUntilMs, no instant death flags)", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: false, playerView: "door", elapsedMs: 1000 });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
    });
    expect(result.enemyStage).toBe("attack");
    expect(result.lastEnemyDecision).toBe("attack");
    expect(result.deathReason).toBe("door_open_at_attack");
    expect(result.doorDeathRevealUntilMs).toBe(1000 + 500);
    expect(result.isRunning).toBeUndefined();
    expect(result.screen).toBeUndefined();
  });

  it("open door + bulb replacement active + playerView 'door' -> deathReason bulb_replacement_attack", () => {
    const state = stateWith({
      enemyStage: "at_door",
      doorClosed: false,
      playerView: "door",
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 0 },
    });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
    });
    expect(result.deathReason).toBe("bulb_replacement_attack");
  });

  it("open door + player not looking at door -> instant death, livesRemaining via resolveLivesRemainingAfterDeath", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: false, playerView: "desk", gameMode: "normal", livesRemaining: 3 });
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
    });
    expect(result.isRunning).toBe(false);
    expect(result.screen).toBe("death");
    expect(result.deathReason).toBe("door_open_at_attack");
    expect(result.livesRemaining).toBe(2);
  });
});

describe("resolveImpAdvance — 8/9. forced-retreat window honored unmodified", () => {
  it("forced retreat active but next step not due -> 'stay', no random call at all", () => {
    const state = stateWith({
      enemyStage: "right_hallway",
      enemyForcedRetreatUntilMs: 10_000,
      enemyForcedRetreatNextStepAtMs: 9_000,
      elapsedMs: 5_000,
    });
    const randomSpy = vi.fn(() => 0.5);
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: randomSpy,
    });
    expect(result.lastEnemyDecision).toBe("stay");
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it("forced retreat active and step due -> uses state.enemyForcedRetreatChance as retreatChance, advanceChance forced to 0", () => {
    const state = stateWith({
      enemyStage: "right_hallway",
      enemyForcedRetreatUntilMs: 10_000,
      enemyForcedRetreatNextStepAtMs: 4_000,
      enemyForcedRetreatChance: 1,
      elapsedMs: 5_000,
    });
    // A roll that would normally be "advance" (very low) must NOT advance,
    // because forced-retreat forces advanceChance to 0 and the full roll
    // range goes to retreat (chance 1).
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.01,
    });
    expect(result.lastEnemyDecision).toBe("retreat");
    expect(result.enemyStage).toBe("outer_yard");
  });
});

describe("resolveImpAdvance — 6/7. min-stay blocking (delegates to monsterMinStay.ts unmodified)", () => {
  it("blocks the roll entirely while inside the minimum-stay window", () => {
    const state = stateWith({ enemyStage: "right_hallway", elapsedMs: 1000, enemyLocationEnteredAtMs: 999 });
    const randomSpy = vi.fn(() => 0.01);
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: randomSpy,
    });
    expect(result.lastEnemyDecision).toBe("stay");
    expect(randomSpy).not.toHaveBeenCalled();
  });
});

describe("resolveImpAdvance — 15. Ghoul camera attack trigger stays Imp's decision, 16. execution stays in the camera subsystem", () => {
  it("a guaranteed camera-attack roll (debug override) overrides the movement result and steps Imp back one stage", () => {
    const state = stateWith({
      enemyStage: "door_hallway",
      cameraOpen: true,
      cameraViewMode: "detail",
      playerView: "desk",
      power: 50,
      activeCameraId: "door_hallway",
      sonicCannonActive: true,
      elapsedMs: 1000,
      debugGhoulCameraAttackChanceOverride: 1,
    });
    // Movement roll (via injected random) — value doesn't matter for the
    // outcome once the camera attack triggers, but must be a valid roll.
    vi.spyOn(Math, "random").mockReturnValue(0); // rollGhoulCameraAttack's own Math.random() call, forced to hit via chanceOverride: 1
    const result = resolveImpAdvance({
      state,
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.99,
    });
    expect(result.lastEnemyDecision).toBe("ghoul_camera_attack");
    // stepBackOneStage from "door_hallway" (index 3) -> index 2 -> "right_hallway".
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.cameraDamage?.activeAttack).not.toBeNull();
    expect(result.enemyForcedRetreatChance).toBe(0);
  });
});

describe("resolveImpAdvance — 13. lastEnemyDecision reflects the branch taken", () => {
  it("plain advance/retreat/stay decisions surface via lastEnemyDecision, matching the pre-extraction reducer output", () => {
    const advancing = resolveImpAdvance({
      state: stateWith({ enemyStage: "outer_yard" }),
      night: NIGHT_01,
      currentNightNumber: 1,
      requireMonsterRetreatVerification: false,
      random: () => 0.01,
    });
    expect(advancing.lastEnemyDecision).toBe("advance");
  });
});
