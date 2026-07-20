import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TITAN_CAMERA_ASSETS } from "./monsterPresentation";

// Zdrojové PNG (5 souborů, viz zadání "Napoj Titanovy kamerové vizuály")
// mají přesně tyhle rozměry (ověřeno `/usr/bin/file` při konverzi) — testy
// níže ověřují, že odpovídající WebP (cwebp -q 87) mají STEJNÉ rozměry,
// žádná deformace. Stejný vzor jako game/visuals/titanDoorAssets.test.ts.
const EXPECTED_DIMENSIONS: Record<string, { width: number; height: number }> = {
  outdoor_titan: { width: 1331, height: 1181 },
  left_hallway_titan: { width: 1254, height: 1254 },
  right_hallway_titan: { width: 1402, height: 1122 },
  titan_door_hallway: { width: 1254, height: 1254 },
  titan_door_hallway_light: { width: 1254, height: 1254 },
};

// Minimální ruční parser PNG IHDR (bajty 16-23: width/height, big-endian) —
// žádná externí knihovna (image-size/sharp) v projektu, viz package.json.
function readPngDimensions(absolutePath: string): { width: number; height: number } {
  const buffer = readFileSync(absolutePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// Minimální ruční parser lossy WebP (RIFF/WEBP/"VP8 " chunk) — cwebp bez
// --lossless/-alpha vždy produkuje tenhle jednoduchý "VP8 " chunk, viz
// stejný vzor v titanDoorAssets.test.ts.
function readWebpDimensions(absolutePath: string): { width: number; height: number } {
  const buffer = readFileSync(absolutePath);
  const chunkType = buffer.toString("ascii", 12, 16);
  expect(chunkType, `unexpected WebP chunk type in ${absolutePath}`).toBe("VP8 ");
  const width = buffer.readUInt16LE(26) & 0x3fff;
  const height = buffer.readUInt16LE(28) & 0x3fff;
  return { width, height };
}

describe("Titan camera assets — WebP source files", () => {
  const filenames = Object.keys(EXPECTED_DIMENSIONS);

  it("1. every expected WebP file exists under public/", () => {
    for (const name of filenames) {
      const absolutePath = join(process.cwd(), "public", "object_13", "monster", "titan", `${name}.webp`);
      expect(existsSync(absolutePath), `missing WebP: ${absolutePath}`).toBe(true);
    }
  });

  it("the original PNG source files still exist (never deleted)", () => {
    for (const name of filenames) {
      const absolutePath = join(process.cwd(), "public", "object_13", "monster", "titan", `${name}.png`);
      expect(existsSync(absolutePath), `missing PNG source: ${absolutePath}`).toBe(true);
    }
  });

  it("2. each WebP has exactly the same pixel dimensions as its PNG source (no deformation)", () => {
    for (const name of filenames) {
      const dir = join(process.cwd(), "public", "object_13", "monster", "titan");
      const pngDims = readPngDimensions(join(dir, `${name}.png`));
      const webpDims = readWebpDimensions(join(dir, `${name}.webp`));
      expect(webpDims, `dimension mismatch for ${name}`).toEqual(pngDims);
      expect(pngDims).toEqual(EXPECTED_DIMENSIONS[name]);
    }
  });
});

describe("TITAN_CAMERA_ASSETS — file paths actually resolve to real files on disk", () => {
  it("every non-empty src in the registry points at an existing file under public/", () => {
    for (const entry of Object.values(TITAN_CAMERA_ASSETS)) {
      for (const set of [entry.default, entry.lightOn]) {
        if (!set) continue;
        for (const src of [...set.normal, ...set.monster, ...set.fleeing]) {
          const absolutePath = join(process.cwd(), "public", src);
          expect(existsSync(absolutePath), `missing file for registry entry: ${absolutePath}`).toBe(true);
        }
      }
    }
  });
});
