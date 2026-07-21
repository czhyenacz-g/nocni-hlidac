import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveTitanOverloadFrameSrc,
  TITAN_AT_DOOR_SRC,
  TITAN_ATTACK_SRC,
  TITAN_BREACH_SRC,
  TITAN_DOOR_ASSETS,
  TITAN_OVERLOAD_DEATH_SRC,
} from "./titanDoorAssets";
import { GENERATOR_OVERLOAD_DOOR_DURATION_MS } from "../balancing/constants";

// Zdrojové PNG (10 souborů, viz zadání "napoj kompletní dveřní vizuální
// sekvenci Titana") mají přesně tyhle rozměry (ověřeno `/usr/bin/file` při
// konverzi) — testy níže ověřují, že odpovídající WebP (cwebp -q 87) mají
// STEJNÉ rozměry, žádná deformace.
const EXPECTED_DIMENSIONS: Record<string, { width: number; height: number }> = {
  titan_attacks_broken_door: { width: 1536, height: 1024 },
  titan_doors_breakthrough_0: { width: 1672, height: 941 },
  titan_doors_breakthrough_1: { width: 1536, height: 1024 },
  titan_doors_breakthrough_2: { width: 1672, height: 941 },
  titan_doors_overdrive_0: { width: 1672, height: 940 },
  titan_doors_overdrive_1: { width: 1672, height: 940 },
  titan_doors_overdrive_2: { width: 1672, height: 941 },
  titan_doors_overdrive_3: { width: 1672, height: 941 },
  titan_doors_overdrive_4: { width: 1672, height: 941 },
  titan_doors_overdrive_5: { width: 1672, height: 941 },
  titan_at_door: { width: 1403, height: 1121 },
};

// Minimální ruční parser PNG IHDR (bajty 16-23: width/height, big-endian) —
// žádná externí knihovna (image-size/sharp) není v projektu závislostí, viz
// package.json.
function readPngDimensions(absolutePath: string): { width: number; height: number } {
  const buffer = readFileSync(absolutePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// Minimální ruční parser lossy WebP (RIFF/WEBP/"VP8 " chunk, viz RFC 9649 /
// libwebp bitstream spec) — cwebp bez --lossless/-alpha vždy produkuje tenhle
// jednoduchý "VP8 " chunk (ověřeno `xxd` na skutečných výstupech), takže
// nepotřebujeme plný VP8L/VP8X parser. Frame tag (3B) + start code (3B, `9d
// 01 2a`) předchází dvěma 16bitovým LE hodnotám (dolních 14 bitů = rozměr).
function readWebpDimensions(absolutePath: string): { width: number; height: number } {
  const buffer = readFileSync(absolutePath);
  const chunkType = buffer.toString("ascii", 12, 16);
  expect(chunkType, `unexpected WebP chunk type in ${absolutePath}`).toBe("VP8 ");
  const width = buffer.readUInt16LE(26) & 0x3fff;
  const height = buffer.readUInt16LE(28) & 0x3fff;
  return { width, height };
}

describe("Titan door assets — WebP source files", () => {
  const filenames = Object.keys(EXPECTED_DIMENSIONS);

  it("every expected WebP file exists under public/", () => {
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

  it("each WebP has exactly the same pixel dimensions as its PNG source (no deformation)", () => {
    for (const name of filenames) {
      const dir = join(process.cwd(), "public", "object_13", "monster", "titan");
      const pngDims = readPngDimensions(join(dir, `${name}.png`));
      const webpDims = readWebpDimensions(join(dir, `${name}.webp`));
      expect(webpDims, `dimension mismatch for ${name}`).toEqual(pngDims);
      expect(pngDims).toEqual(EXPECTED_DIMENSIONS[name]);
    }
  });
});

describe("TITAN_DOOR_ASSETS registry", () => {
  it("uses only .webp paths, never .png, anywhere in the registry", () => {
    const allSrcs = [
      ...TITAN_DOOR_ASSETS.breakthrough,
      ...TITAN_DOOR_ASSETS.overdrive,
      TITAN_DOOR_ASSETS.attack,
      TITAN_DOOR_ASSETS.atDoorOpen,
    ];
    for (const src of allSrcs) {
      expect(src.endsWith(".webp"), `expected .webp, got: ${src}`).toBe(true);
      expect(src.endsWith(".png")).toBe(false);
    }
  });

  it("breakthrough has exactly 3 frames, overdrive exactly 6", () => {
    expect(TITAN_DOOR_ASSETS.breakthrough).toHaveLength(3);
    expect(TITAN_DOOR_ASSETS.overdrive).toHaveLength(6);
  });

  it("at_door (door open) maps to its own dedicated titan_at_door.webp asset, breach maps to breakthrough_2", () => {
    expect(TITAN_AT_DOOR_SRC).toBe("/object_13/monster/titan/titan_at_door.webp");
    expect(TITAN_BREACH_SRC).toBe("/object_13/monster/titan/titan_doors_breakthrough_2.webp");
  });

  it("breakthrough[0] remains registered (reserved, per file header) but is no longer TITAN_AT_DOOR_SRC", () => {
    expect(TITAN_DOOR_ASSETS.breakthrough[0]).toBe("/object_13/monster/titan/titan_doors_breakthrough_0.webp");
    expect(TITAN_AT_DOOR_SRC).not.toBe(TITAN_DOOR_ASSETS.breakthrough[0]);
  });

  it("attack maps to titan_attacks_broken_door.webp", () => {
    expect(TITAN_ATTACK_SRC).toBe("/object_13/monster/titan/titan_attacks_broken_door.webp");
  });

  it("successful-kill reveal maps to overdrive_5", () => {
    expect(TITAN_OVERLOAD_DEATH_SRC).toBe("/object_13/monster/titan/titan_doors_overdrive_5.webp");
  });

  // breakthrough_1 (different aspect ratio, 1536x1024 vs. 1672x941 for its
  // siblings) is converted and registered, but explicitly not exported as
  // an AT_DOOR/BREACH constant nor referenced by DoorView.tsx — see file
  // header comment.
  it("breakthrough_1 is present in the registry (converted, ready) but is not exposed via any *_SRC constant", () => {
    expect(TITAN_DOOR_ASSETS.breakthrough[1]).toBe("/object_13/monster/titan/titan_doors_breakthrough_1.webp");
    expect(TITAN_AT_DOOR_SRC).not.toBe(TITAN_DOOR_ASSETS.breakthrough[1]);
    expect(TITAN_BREACH_SRC).not.toBe(TITAN_DOOR_ASSETS.breakthrough[1]);
  });
});

describe("resolveTitanOverloadFrameSrc — deterministic 5-bucket countdown", () => {
  const total = GENERATOR_OVERLOAD_DOOR_DURATION_MS; // 10_000ms

  // Hraniční hodnoty (přesně 2000/4000/6000/8000ms) záměrně NEtestujeme —
  // `progressRatio` počítaný z `1 - remainingMs/totalDurationMs` má na
  // těchto přesných zlomcích (0.2, 0.4, ...) floating-point zaokrouhlovací
  // chybu (např. 1 - 8000/10000 vychází jako 0.19999999999999996, ne
  // přesně 0.2), takže by test byl křehký na binární reprezentaci, ne na
  // logice funkce. Hodnoty níže jsou vždy bezpečně UVNITŘ pásma.
  it("0-20% progress -> overdrive[0]", () => {
    expect(resolveTitanOverloadFrameSrc(0, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[0]);
    expect(resolveTitanOverloadFrameSrc(1900, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[0]);
  });

  it("20-40% progress -> overdrive[1]", () => {
    expect(resolveTitanOverloadFrameSrc(2100, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[1]);
    expect(resolveTitanOverloadFrameSrc(3900, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[1]);
  });

  it("40-60% progress -> overdrive[2]", () => {
    expect(resolveTitanOverloadFrameSrc(4100, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[2]);
    expect(resolveTitanOverloadFrameSrc(5900, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[2]);
  });

  it("60-80% progress -> overdrive[3]", () => {
    expect(resolveTitanOverloadFrameSrc(6100, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[3]);
    expect(resolveTitanOverloadFrameSrc(7900, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[3]);
  });

  it("80-100% progress -> overdrive[4]", () => {
    expect(resolveTitanOverloadFrameSrc(8100, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[4]);
    expect(resolveTitanOverloadFrameSrc(9999, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[4]);
  });

  it("exactly 100% progress stays clamped at overdrive[4] (not out of bounds)", () => {
    expect(resolveTitanOverloadFrameSrc(10000, total, total)).toBe(TITAN_DOOR_ASSETS.overdrive[4]);
  });

  it("is a pure function of the timestamps, not a local counter — same inputs always give the same frame", () => {
    const a = resolveTitanOverloadFrameSrc(5000, total, total);
    const b = resolveTitanOverloadFrameSrc(5000, total, total);
    expect(a).toBe(b);
  });
});
