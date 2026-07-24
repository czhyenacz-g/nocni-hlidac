import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { clearAuthCookie, getAuthCookieOptions } from "./cookieConfig";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthCookieOptions", () => {
  it("uses SameSite=None + Secure=true in production (required for cross-site itch.io fetch)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const options = getAuthCookieOptions(60);
    expect(options.sameSite).toBe("none");
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(60);
  });

  it("falls back to a safe SameSite=Lax + Secure=false for local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const options = getAuthCookieOptions();
    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(false);
    expect(options.httpOnly).toBe(true);
  });

  it("omits maxAge entirely when not provided (session cookie)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const options = getAuthCookieOptions();
    expect("maxAge" in options).toBe(false);
  });
});

describe("clearAuthCookie", () => {
  it("clears the cookie using the exact same attributes as getAuthCookieOptions, with maxAge 0", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = NextResponse.json({ ok: true });
    clearAuthCookie(response, "nocni-hlidac-session");
    const setCookieHeader = response.headers.get("set-cookie") ?? "";
    expect(setCookieHeader).toContain("nocni-hlidac-session=");
    expect(setCookieHeader.toLowerCase()).toContain("samesite=none");
    expect(setCookieHeader.toLowerCase()).toContain("secure");
    expect(setCookieHeader.toLowerCase()).toContain("max-age=0");
  });
});
