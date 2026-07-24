import { describe, expect, it } from "vitest";
import { AUTH_POPUP_ERROR_MESSAGE_TYPE, AUTH_POPUP_SUCCESS_MESSAGE_TYPE, buildPopupCloseResponse } from "./popupCloseHtml";

describe("buildPopupCloseResponse — security headers", () => {
  it("sets Content-Type text/html; charset=utf-8", async () => {
    const response = buildPopupCloseResponse({
      success: true,
      targetOrigin: "https://example-user.itch.io",
      fallbackUrl: "https://example-user.itch.io/object-13",
    });
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  });

  it("sets Cache-Control: no-store — a one-time OAuth result must never be served from cache", async () => {
    const response = buildPopupCloseResponse({
      success: true,
      targetOrigin: "https://example-user.itch.io",
      fallbackUrl: "https://example-user.itch.io/object-13",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("sets Referrer-Policy: no-referrer", async () => {
    const response = buildPopupCloseResponse({
      success: true,
      targetOrigin: "https://example-user.itch.io",
      fallbackUrl: "https://example-user.itch.io/object-13",
    });
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("sets a restrictive Content-Security-Policy scoped to a per-response nonce, no wide script-src", async () => {
    const response = buildPopupCloseResponse({
      success: true,
      targetOrigin: "https://example-user.itch.io",
      fallbackUrl: "https://example-user.itch.io/object-13",
    });
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toMatch(/script-src 'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("script-src *");
  });

  it("uses a different nonce on every response (not a static/shared value)", async () => {
    const a = buildPopupCloseResponse({ success: true, targetOrigin: "https://a.example", fallbackUrl: "https://a.example" });
    const b = buildPopupCloseResponse({ success: true, targetOrigin: "https://a.example", fallbackUrl: "https://a.example" });
    const cspA = a.headers.get("Content-Security-Policy");
    const cspB = b.headers.get("Content-Security-Policy");
    expect(cspA).not.toBe(cspB);
  });
});

describe("buildPopupCloseResponse — postMessage target origin safety", () => {
  it("strips path/query/hash from targetOrigin even if the caller passed a full URL by mistake", async () => {
    const response = buildPopupCloseResponse({
      success: true,
      targetOrigin: "https://example-user.itch.io/some/path?x=1#y",
      fallbackUrl: "https://example-user.itch.io/some/path",
    });
    const html = await response.text();
    // postMessage 2nd arg must be exactly the bare origin, never with path/query/hash
    // (the fallback <a href> is allowed to keep the path — only the postMessage call itself must not).
    expect(html).toContain('postMessage({"type":"OBJECT13_AUTH_SUCCESS"}, "https://example-user.itch.io")');
    expect(html).not.toContain('postMessage({"type":"OBJECT13_AUTH_SUCCESS"}, "https://example-user.itch.io/some/path?x=1#y")');
  });

  it("uses the static success message type constant, never a request-derived string", async () => {
    const response = buildPopupCloseResponse({
      success: true,
      targetOrigin: "https://example-user.itch.io",
      fallbackUrl: "https://example-user.itch.io",
    });
    const html = await response.text();
    expect(html).toContain(JSON.stringify({ type: AUTH_POPUP_SUCCESS_MESSAGE_TYPE }));
  });

  it("uses the static error message type constant on failure", async () => {
    const response = buildPopupCloseResponse({
      success: false,
      targetOrigin: "https://example-user.itch.io",
      fallbackUrl: "https://example-user.itch.io",
    });
    const html = await response.text();
    expect(html).toContain(JSON.stringify({ type: AUTH_POPUP_ERROR_MESSAGE_TYPE }));
  });
});

describe("buildPopupCloseResponse — fallback link escaping", () => {
  it("HTML-escapes the fallback URL used in the href attribute", async () => {
    const response = buildPopupCloseResponse({
      success: true,
      targetOrigin: "https://example.com",
      fallbackUrl: 'https://example.com/"><script>alert(1)</script>',
    });
    const html = await response.text();
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
