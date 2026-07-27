import { afterEach, describe, expect, it, vi } from "vitest";
import { assetPath } from "./assetPath";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assetPath", () => {
  it("returns the path unchanged when NEXT_PUBLIC_GAME_CLIENT is not itch", () => {
    vi.stubEnv("NEXT_PUBLIC_GAME_CLIENT", "web");
    expect(assetPath("/object_13/background/menu_bg_0.webp")).toBe("/object_13/background/menu_bg_0.webp");
  });

  it("returns the path unchanged when NEXT_PUBLIC_GAME_CLIENT is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_GAME_CLIENT", undefined);
    expect(assetPath("/object_13/background/menu_bg_0.webp")).toBe("/object_13/background/menu_bg_0.webp");
  });

  it("rewrites a root-relative path to a dot-relative one for the itch build", () => {
    vi.stubEnv("NEXT_PUBLIC_GAME_CLIENT", "itch");
    expect(assetPath("/object_13/background/menu_bg_0.webp")).toBe("./object_13/background/menu_bg_0.webp");
  });

  it("leaves an already-relative path untouched for the itch build", () => {
    vi.stubEnv("NEXT_PUBLIC_GAME_CLIENT", "itch");
    expect(assetPath("object_13/background/menu_bg_0.webp")).toBe("object_13/background/menu_bg_0.webp");
  });
});
