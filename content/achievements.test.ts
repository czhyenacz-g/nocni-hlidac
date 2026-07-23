import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, getAchievement } from "./achievements";
import { COPY_CS } from "./copy";

describe("achievements config", () => {
  it("contains meet_hynek", () => {
    expect(ACHIEVEMENTS.meet_hynek).toBeDefined();
  });

  it("meet_hynek's translated title is 'Setkání s Hynkem' (viz content/copy.ts#achievementDefinitions)", () => {
    expect(COPY_CS.achievementDefinitions.meet_hynek.title).toBe("Setkání s Hynkem");
  });

  it("meet_hynek's translated description is 'Úmrtí hned první den.'", () => {
    expect(COPY_CS.achievementDefinitions.meet_hynek.description).toBe("Úmrtí hned první den.");
  });

  it("getAchievement returns the exact same data as ACHIEVEMENTS", () => {
    expect(getAchievement("meet_hynek")).toEqual(ACHIEVEMENTS.meet_hynek);
  });
});
