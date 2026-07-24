import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthReturnOrigin, getAuthReturnUrl, resolveAuthReturnTarget, withAuthErrorQuery } from "./returnTargets";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveAuthReturnTarget", () => {
  it("recognizes 'itch' explicitly", () => {
    expect(resolveAuthReturnTarget("itch")).toBe("itch");
  });

  it("falls back to 'web' for any unknown/missing/malicious value (no open redirect)", () => {
    expect(resolveAuthReturnTarget("web")).toBe("web");
    expect(resolveAuthReturnTarget(null)).toBe("web");
    expect(resolveAuthReturnTarget(undefined)).toBe("web");
    expect(resolveAuthReturnTarget("https://evil.example")).toBe("web");
    expect(resolveAuthReturnTarget("javascript:alert(1)")).toBe("web");
    expect(resolveAuthReturnTarget("../../etc/passwd")).toBe("web");
  });
});

describe("getAuthReturnUrl", () => {
  it("returns the configured web URL, trailing slash stripped", () => {
    vi.stubEnv("AUTH_RETURN_WEB_URL", "https://nocni-hlidac.cz/");
    expect(getAuthReturnUrl("web")).toBe("https://nocni-hlidac.cz");
  });

  it("falls back to the default production web URL when unconfigured", () => {
    vi.stubEnv("AUTH_RETURN_WEB_URL", "");
    expect(getAuthReturnUrl("web")).toBe("https://nocni-hlidac.cz");
  });

  it("returns the configured itch URL when set", () => {
    vi.stubEnv("AUTH_RETURN_ITCH_URL", "https://example-user.itch.io/object-13");
    expect(getAuthReturnUrl("itch")).toBe("https://example-user.itch.io/object-13");
  });

  it("falls back to the web URL when AUTH_RETURN_ITCH_URL is not configured", () => {
    vi.stubEnv("AUTH_RETURN_ITCH_URL", "");
    vi.stubEnv("AUTH_RETURN_WEB_URL", "https://nocni-hlidac.cz");
    expect(getAuthReturnUrl("itch")).toBe("https://nocni-hlidac.cz");
  });

  it("falls back to the safe default web URL when a configured URL is malformed", () => {
    vi.stubEnv("AUTH_RETURN_WEB_URL", "not a valid url");
    expect(getAuthReturnUrl("web")).toBe("https://nocni-hlidac.cz");
  });

  it("rejects a non-http(s) configured scheme (e.g. javascript:) and falls back safely", () => {
    vi.stubEnv("AUTH_RETURN_WEB_URL", "javascript:alert(1)");
    expect(getAuthReturnUrl("web")).toBe("https://nocni-hlidac.cz");
  });
});

describe("getAuthReturnOrigin", () => {
  it("strips the path from a web/itch return URL, leaving only protocol+host", () => {
    vi.stubEnv("AUTH_RETURN_WEB_URL", "https://nocni-hlidac.cz");
    expect(getAuthReturnOrigin("web")).toBe("https://nocni-hlidac.cz");
  });

  it("strips path/query/hash from an itch return URL with a path — this is the value that must be safe as a postMessage targetOrigin", () => {
    vi.stubEnv("AUTH_RETURN_ITCH_URL", "https://example-user.itch.io/object-13?foo=bar#section");
    expect(getAuthReturnOrigin("itch")).toBe("https://example-user.itch.io");
  });

  it("never includes a trailing path even when the configured URL is just an origin with a trailing slash", () => {
    vi.stubEnv("AUTH_RETURN_WEB_URL", "https://nocni-hlidac.cz/");
    expect(getAuthReturnOrigin("web")).toBe("https://nocni-hlidac.cz");
  });
});

describe("withAuthErrorQuery", () => {
  it("appends ?auth=error via the URL API, preserving an existing path", () => {
    expect(withAuthErrorQuery("https://nocni-hlidac.cz/some/path")).toBe("https://nocni-hlidac.cz/some/path?auth=error");
  });

  it("preserves existing query params alongside the new one", () => {
    expect(withAuthErrorQuery("https://nocni-hlidac.cz/?foo=bar")).toBe("https://nocni-hlidac.cz/?foo=bar&auth=error");
  });
});
