import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiOrigin } from "./apiOrigin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getApiOrigin", () => {
  it("uses NEXT_PUBLIC_API_ORIGIN when configured, trailing slash stripped", () => {
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://nocni-hlidac.cz/");
    expect(getApiOrigin()).toBe("https://nocni-hlidac.cz");
  });

  it("falls back to localhost in development when unconfigured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getApiOrigin()).toBe("http://localhost:3000");
  });

  it("never guesses from window.location — returns empty string in production when unconfigured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getApiOrigin()).toBe("");
  });
});
