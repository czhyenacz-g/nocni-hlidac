import { describe, expect, it } from "vitest";
import { resolveDatabaseTodoBadgeKey } from "./databaseTypes";

describe("resolveDatabaseTodoBadgeKey", () => {
  it("15. 'planned' status gets the distinct PLÁNOVANÁ FUNKCE badge", () => {
    expect(resolveDatabaseTodoBadgeKey("planned")).toBe("planned");
  });

  it.each(["concept", "data-not-connected", "future"] as const)(
    "15. '%s' status falls back to the generic TODO badge",
    (status) => {
      expect(resolveDatabaseTodoBadgeKey(status)).toBe("todo");
    },
  );
});
