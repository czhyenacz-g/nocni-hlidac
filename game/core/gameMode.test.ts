import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_MODE } from "./gameMode";

describe("DEFAULT_GAME_MODE", () => {
  it("defaults to normal", () => {
    expect(DEFAULT_GAME_MODE).toBe("normal");
  });
});
