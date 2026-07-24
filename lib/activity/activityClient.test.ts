import { describe, expect, it } from "vitest";
import { resolveActivityClient, sanitizeBuildVersion } from "./activityClient";

describe("resolveActivityClient", () => {
  it("accepts the three known client values", () => {
    expect(resolveActivityClient("web")).toBe("web");
    expect(resolveActivityClient("itch")).toBe("itch");
    expect(resolveActivityClient("local-export")).toBe("local-export");
  });

  it("falls back to 'unknown' for an unrecognized value, never throws/rejects the request", () => {
    expect(resolveActivityClient("something-else")).toBe("unknown");
    expect(resolveActivityClient("")).toBe("unknown");
  });

  it("falls back to 'unknown' for non-string/missing input", () => {
    expect(resolveActivityClient(undefined)).toBe("unknown");
    expect(resolveActivityClient(null)).toBe("unknown");
    expect(resolveActivityClient(123)).toBe("unknown");
    expect(resolveActivityClient({})).toBe("unknown");
  });
});

describe("sanitizeBuildVersion", () => {
  it("passes through a normal short string", () => {
    expect(sanitizeBuildVersion("1.2.3")).toBe("1.2.3");
  });

  it("truncates to a maximum of 64 characters", () => {
    const long = "x".repeat(100);
    const result = sanitizeBuildVersion(long);
    expect(result).not.toBeNull();
    expect(result?.length).toBe(64);
  });

  it("returns null for missing/empty/non-string values", () => {
    expect(sanitizeBuildVersion(undefined)).toBeNull();
    expect(sanitizeBuildVersion(null)).toBeNull();
    expect(sanitizeBuildVersion("")).toBeNull();
    expect(sanitizeBuildVersion("   ")).toBeNull();
    expect(sanitizeBuildVersion(123)).toBeNull();
  });
});
