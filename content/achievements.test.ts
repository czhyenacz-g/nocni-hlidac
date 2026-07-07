import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, getAchievement } from "./achievements";

describe("achievements config", () => {
  it("contains meet_hynek", () => {
    expect(ACHIEVEMENTS.meet_hynek).toBeDefined();
  });

  it("meet_hynek has the title 'Setkání s Hynkem'", () => {
    expect(getAchievement("meet_hynek")?.title).toBe("Setkání s Hynkem");
  });

  it("meet_hynek has the description 'Úmrtí hned první den.'", () => {
    expect(getAchievement("meet_hynek")?.description).toBe("Úmrtí hned první den.");
  });

  it("getAchievement returns the exact same data as ACHIEVEMENTS", () => {
    expect(getAchievement("meet_hynek")).toEqual(ACHIEVEMENTS.meet_hynek);
  });
});
