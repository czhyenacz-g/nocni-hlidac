import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { applyCorsHeaders, corsPreflightResponse, getAllowedOrigins, isOriginAllowed, isTrustedWriteOrigin, withCors } from "./cors";

afterEach(() => {
  vi.unstubAllEnvs();
});

function requestWithOrigin(origin: string | null, method = "GET"): NextRequest {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new NextRequest("https://nocni-hlidac.cz/api/whatever", { headers, method });
}

describe("getAllowedOrigins / isOriginAllowed", () => {
  it("allows exactly the origins configured in AUTH_ALLOWED_ORIGINS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz, https://example-itch-origin.com");
    expect(getAllowedOrigins()).toEqual(["https://nocni-hlidac.cz", "https://example-itch-origin.com"]);
    expect(isOriginAllowed("https://nocni-hlidac.cz")).toBe(true);
    expect(isOriginAllowed("https://example-itch-origin.com")).toBe(true);
  });

  it("rejects an origin not on the whitelist (no substring matching)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
    expect(isOriginAllowed("https://evil-itch.io")).toBe(false);
    expect(isOriginAllowed("https://notnocni-hlidac.cz")).toBe(false);
  });

  it("adds the localhost dev fallback outside production, never in production", () => {
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAllowedOrigins()).toContain("http://localhost:3000");

    vi.stubEnv("NODE_ENV", "production");
    expect(getAllowedOrigins()).not.toContain("http://localhost:3000");
  });

  it("rejects null/missing origin and malformed values", () => {
    expect(isOriginAllowed(null)).toBe(false);
    expect(isOriginAllowed("not-a-url")).toBe(false);
    expect(isOriginAllowed("javascript:alert(1)")).toBe(false);
  });
});

describe("applyCorsHeaders / withCors", () => {
  it("sets Allow-Origin + Allow-Credentials + Vary for an allowed origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
    const response = await withCors(requestWithOrigin("https://nocni-hlidac.cz"), () => NextResponse.json({ ok: true }));
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://nocni-hlidac.cz");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  it("never sets a wildcard Allow-Origin anywhere", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
    const response = await withCors(requestWithOrigin("https://nocni-hlidac.cz"), () => NextResponse.json({ ok: true }));
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("omits Allow-Origin/Allow-Credentials for a disallowed origin, but still sets Vary", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
    const response = await withCors(requestWithOrigin("https://evil.example"), () => NextResponse.json({ ok: true }));
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    expect(response.headers.get("Vary")).toBe("Origin");
  });
});

describe("corsPreflightResponse (OPTIONS)", () => {
  it("responds for an allowed origin with methods/headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
    const response = corsPreflightResponse(requestWithOrigin("https://nocni-hlidac.cz"));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://nocni-hlidac.cz");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
  });
});

describe("isTrustedWriteOrigin", () => {
  it("does not apply to read-only methods — GET/HEAD/OPTIONS are always trusted regardless of Origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
    expect(isTrustedWriteOrigin(requestWithOrigin(null, "GET"))).toBe(true);
    expect(isTrustedWriteOrigin(requestWithOrigin("https://evil.example", "GET"))).toBe(true);
    expect(isTrustedWriteOrigin(requestWithOrigin(null, "HEAD"))).toBe(true);
    expect(isTrustedWriteOrigin(requestWithOrigin(null, "OPTIONS"))).toBe(true);
  });

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    it(`rejects a production ${method} with no Origin header at all (SameSite=None requires this)`, () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
      expect(isTrustedWriteOrigin(requestWithOrigin(null, method))).toBe(false);
    });

    it(`trusts a production ${method} with an allowed Origin header`, () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
      expect(isTrustedWriteOrigin(requestWithOrigin("https://nocni-hlidac.cz", method))).toBe(true);
    });

    it(`rejects a production ${method} with a disallowed Origin header (no substring/wildcard match)`, () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://nocni-hlidac.cz");
      expect(isTrustedWriteOrigin(requestWithOrigin("https://evil.example", method))).toBe(false);
      expect(isTrustedWriteOrigin(requestWithOrigin("https://notnocni-hlidac.cz", method))).toBe(false);
    });
  }

  it("rejects a development POST with no Origin — dev must go through the same explicit-whitelist path, not a blanket exemption", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "");
    expect(isTrustedWriteOrigin(requestWithOrigin(null, "POST"))).toBe(false);
  });

  it("trusts a development POST from localhost only because it's explicitly in the dev whitelist (getAllowedOrigins), not because the check is disabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "");
    expect(isTrustedWriteOrigin(requestWithOrigin("http://localhost:3000", "POST"))).toBe(true);
  });

  it("rejects a development POST from a non-whitelisted origin — localhost fallback is not a blanket dev exemption", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "");
    expect(isTrustedWriteOrigin(requestWithOrigin("https://random.example", "POST"))).toBe(false);
  });
});
