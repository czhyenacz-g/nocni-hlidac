import { describe, expect, it } from "vitest";
import { evaluateOfficeThreatOnReturn } from "./officeThreat";
import { Wall } from "./types";

const OFFICE_ZONE: Wall = { x: 400, y: 400, width: 100, height: 100 };
const NEAR_PLAYER_RADIUS = 100;
const NEAR_OFFICE_RADIUS = 100;

function evaluate(overrides: Partial<Parameters<typeof evaluateOfficeThreatOnReturn>[0]> = {}) {
  return evaluateOfficeThreatOnReturn({
    enemyMode: "investigating",
    enemyPosition: { x: 0, y: 0 },
    playerPosition: { x: 450, y: 450 },
    officeZone: OFFICE_ZONE,
    nearPlayerRadiusPx: NEAR_PLAYER_RADIUS,
    nearOfficeRadiusPx: NEAR_OFFICE_RADIUS,
    ...overrides,
  });
}

describe("evaluateOfficeThreatOnReturn — no threat", () => {
  it("returns undefined when the monster is far away and not chasing", () => {
    const result = evaluate({ enemyMode: "waiting", enemyPosition: { x: 0, y: 0 } });
    expect(result).toBeUndefined();
  });
});

describe("evaluateOfficeThreatOnReturn — chasing", () => {
  it("is active when the monster mode was 'chasing', even if far away", () => {
    const result = evaluate({ enemyMode: "chasing", enemyPosition: { x: 0, y: 0 } });
    expect(result?.active).toBe(true);
    expect(result?.reason).toBe("monster_chasing");
  });

  it("chasing + near office => intensity 'high'", () => {
    const result = evaluate({ enemyMode: "chasing", enemyPosition: { x: 450, y: 450 } });
    expect(result?.intensity).toBe("high");
  });

  it("chasing but far from office and far from player => intensity 'medium'", () => {
    const result = evaluate({ enemyMode: "chasing", enemyPosition: { x: -1000, y: -1000 }, playerPosition: { x: -1000, y: -900 } });
    expect(result?.active).toBe(true);
    expect(result?.intensity).toBe("medium");
  });
});

describe("evaluateOfficeThreatOnReturn — near office (not chasing)", () => {
  it("is active when the monster is near the office zone, even without chasing", () => {
    // Inside the office zone bounds -> distance to rect is 0.
    const result = evaluate({ enemyMode: "waiting", enemyPosition: { x: 450, y: 450 }, playerPosition: { x: -1000, y: -1000 } });
    expect(result?.active).toBe(true);
    expect(result?.reason).toBe("monster_near_office");
    expect(result?.intensity).toBe("medium");
  });
});

describe("evaluateOfficeThreatOnReturn — near player only (low)", () => {
  it("is active with intensity 'low' when only near the player (not chasing, not near office)", () => {
    const result = evaluate({
      enemyMode: "investigating",
      enemyPosition: { x: 500, y: 500 },
      playerPosition: { x: 520, y: 500 },
      officeZone: { x: 0, y: 0, width: 10, height: 10 },
    });
    expect(result?.active).toBe(true);
    expect(result?.reason).toBe("monster_near_player");
    expect(result?.intensity).toBe("low");
  });
});

describe("evaluateOfficeThreatOnReturn — wounded/investigating monster far from both", () => {
  it("does not activate for 'wounded' mode alone, far from player/office", () => {
    const result = evaluate({ enemyMode: "wounded", enemyPosition: { x: -5000, y: -5000 } });
    expect(result).toBeUndefined();
  });
});
