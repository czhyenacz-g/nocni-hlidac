import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { readGuardRunRequestBody } from "./requestGameMode";

function requestWithBody(body: unknown): NextRequest {
  return new NextRequest("https://nocni-hlidac.cz/api/whatever", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("readGuardRunRequestBody", () => {
  it("reads both gameMode and nightNumber from the same body", async () => {
    const result = await readGuardRunRequestBody(requestWithBody({ gameMode: "hardcore", nightNumber: 5 }));
    expect(result).toEqual({ gameMode: "hardcore", nightNumber: 5 });
  });

  it("returns {} for a missing/empty body, never throws", async () => {
    const request = new NextRequest("https://nocni-hlidac.cz/api/whatever", { method: "POST" });
    await expect(readGuardRunRequestBody(request)).resolves.toEqual({});
  });

  it("resolves an invalid gameMode value to 'normal' (server-side guard), not undefined", async () => {
    const result = await readGuardRunRequestBody(requestWithBody({ gameMode: "totally-bogus" }));
    expect(result.gameMode).toBe("normal");
  });

  it("ignores a non-integer/zero/negative nightNumber, leaves it undefined", async () => {
    expect((await readGuardRunRequestBody(requestWithBody({ nightNumber: 0 }))).nightNumber).toBeUndefined();
    expect((await readGuardRunRequestBody(requestWithBody({ nightNumber: -1 }))).nightNumber).toBeUndefined();
    expect((await readGuardRunRequestBody(requestWithBody({ nightNumber: 1.5 }))).nightNumber).toBeUndefined();
    expect((await readGuardRunRequestBody(requestWithBody({ nightNumber: "5" }))).nightNumber).toBeUndefined();
  });

  it("accepts a valid positive integer nightNumber", async () => {
    expect((await readGuardRunRequestBody(requestWithBody({ nightNumber: 12 }))).nightNumber).toBe(12);
  });
});
