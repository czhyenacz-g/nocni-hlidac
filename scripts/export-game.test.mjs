import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isExcludedPublicFile, buildFilteredPublicDir } from "./export-game.mjs";

// isExcludedPublicFile/buildFilteredPublicDir (viz zadání "buildni to bez
// nepoužívaných png a jiných multimediálních souborů") — reálné soubory na
// disku (existsSync na skutečnou cestu k .webp sourozenci), proto testy
// pracují nad dočasným adresářem, ne nad mockovaným fs.

describe("isExcludedPublicFile", () => {
  let dir;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "export-game-test-"));
    mkdirSync(path.join(dir, "camera"), { recursive: true });
    mkdirSync(path.join(dir, "sound", "camera_destroid", "source"), { recursive: true });
    writeFileSync(path.join(dir, "camera", "outdoor_01.png"), "png");
    writeFileSync(path.join(dir, "camera", "outdoor_01.webp"), "webp");
    writeFileSync(path.join(dir, "camera", "orphan.png"), "png"); // no .webp sibling
    writeFileSync(path.join(dir, "camera", "outdoor_01.mp3"), "mp3"); // unrelated ext, has "sibling" only by coincidence of basename prefix
    writeFileSync(path.join(dir, "sound", "camera_destroid", "source", "ghoul_appear_raw.wav"), "raw");
    writeFileSync(path.join(dir, ".DS_Store"), "junk");
    mkdirSync(path.join(dir, "camera (backup)"), { recursive: true });
    writeFileSync(path.join(dir, "camera (backup)", "outdoor_01.webp"), "webp");
    mkdirSync(path.join(dir, "sound", "release_monster", "original_backup"), { recursive: true });
    writeFileSync(path.join(dir, "sound", "release_monster", "original_backup", "take1.m4a"), "m4a");
    mkdirSync(path.join(dir, "Bez názvu"), { recursive: true });
    writeFileSync(path.join(dir, "Bez názvu", "screenshot.png"), "png");
    writeFileSync(path.join(dir, "camera", "sonic_cannon_v2.wav"), "wav");
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("excludes a .png that has a same-name .webp sibling", () => {
    expect(isExcludedPublicFile(path.join(dir, "camera", "outdoor_01.png"))).toBe(true);
  });

  it("keeps a .png with no .webp sibling (e.g. story ending images)", () => {
    expect(isExcludedPublicFile(path.join(dir, "camera", "orphan.png"))).toBe(false);
  });

  it("keeps the .webp itself", () => {
    expect(isExcludedPublicFile(path.join(dir, "camera", "outdoor_01.webp"))).toBe(false);
  });

  it("keeps unrelated extensions even if a same-stem .webp exists", () => {
    expect(isExcludedPublicFile(path.join(dir, "camera", "outdoor_01.mp3"))).toBe(false);
  });

  it("excludes anything directly inside a folder literally named 'source'", () => {
    expect(isExcludedPublicFile(path.join(dir, "sound", "camera_destroid", "source", "ghoul_appear_raw.wav"))).toBe(true);
  });

  it("excludes .DS_Store", () => {
    expect(isExcludedPublicFile(path.join(dir, ".DS_Store"))).toBe(true);
  });

  it("excludes anything inside a folder whose name contains 'backup' (case-insensitive)", () => {
    expect(isExcludedPublicFile(path.join(dir, "camera (backup)", "outdoor_01.webp"))).toBe(true);
    expect(isExcludedPublicFile(path.join(dir, "sound", "release_monster", "original_backup", "take1.m4a"))).toBe(true);
  });

  it("excludes anything inside a folder literally named 'Bez názvu'", () => {
    expect(isExcludedPublicFile(path.join(dir, "Bez názvu", "screenshot.png"))).toBe(true);
  });

  it("excludes known-unused basenames outside any junk folder", () => {
    expect(isExcludedPublicFile(path.join(dir, "camera", "sonic_cannon_v2.wav"))).toBe(true);
  });
});

describe("buildFilteredPublicDir", () => {
  let srcDir;
  let destDir;

  beforeAll(() => {
    const root = mkdtempSync(path.join(tmpdir(), "export-game-filter-test-"));
    srcDir = path.join(root, "public");
    destDir = path.join(root, "public-out");
    mkdirSync(path.join(srcDir, "camera"), { recursive: true });
    mkdirSync(path.join(srcDir, "sound", "source"), { recursive: true });
    writeFileSync(path.join(srcDir, "camera", "a.png"), "png");
    writeFileSync(path.join(srcDir, "camera", "a.webp"), "webp");
    writeFileSync(path.join(srcDir, "camera", "b.webp"), "webp");
    writeFileSync(path.join(srcDir, "sound", "source", "raw.wav"), "raw");
    writeFileSync(path.join(srcDir, ".DS_Store"), "junk");
  });

  afterAll(() => {
    rmSync(path.dirname(srcDir), { recursive: true, force: true });
  });

  it("mirrors non-excluded files as symlinks and reports counts/bytes for excluded ones", () => {
    const result = buildFilteredPublicDir(srcDir, destDir);
    // Kept: camera/a.webp, camera/b.webp (2). Excluded: camera/a.png, sound/source/raw.wav, .DS_Store (3).
    expect(result.keptCount).toBe(2);
    expect(result.excludedCount).toBe(3);
    expect(result.excludedBytes).toBeGreaterThan(0);
  });
});
