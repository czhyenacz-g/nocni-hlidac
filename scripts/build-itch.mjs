#!/usr/bin/env node
/**
 * `npm run build:itch` — tenký wrapper kolem existujícího `npm run export:game`
 * (`scripts/export-game.mjs`), NE nový build systém (viz zadání "Nevytvářej
 * nový build systém, pokud to není nutné"). Jen:
 *
 * 1. zavolá `export-game.mjs --target=itch` neinteraktivně (export-game.mjs
 *    samo dělá celou práci — symlinkovaný `.export-build-tmp/`, statický
 *    `next build` s `output: "export"`, jen exportovatelné `app/` cesty,
 *    napevno `NEXT_PUBLIC_API_ORIGIN=https://nocni-hlidac.cz`, zip s
 *    `index.html` v kořeni), výstup přistane v `dist-game/itch.zip`,
 * 2. zkopíruje/přejmenuje ten ZIP na `dist/object-13-first-shift-itch.zip`
 *    (přesný název/cesta ze zadání) — kopie, ne přesun, ať `dist-game/itch.zip`
 *    zůstane i pro `printCorsGuidance`/`BUILD_INFO.txt` odkazy v konzoli beze
 *    změny.
 *
 * `--public-url` je pro samotný ZIP jen informativní (viz export-game.mjs —
 * nikdy se nepropíše do `buildEnv`/klientského bundlu, jen do vytištěné CORS
 * hlášky a BUILD_INFO.txt) — skutečná itch.io URL vznikne až PO prvním
 * nahrání ZIPu (itch.io ji přidělí), takže se tu záměrně používá zjevný
 * placeholder. Po prvním nahrání spusť `export:game --target=itch
 * --public-url=<skutečná URL>` ručně, ať BUILD_INFO.txt/CORS hláška
 * odpovídají realitě.
 */

import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ZIP = path.join(REPO_ROOT, "dist-game", "itch.zip");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const TARGET_ZIP = path.join(DIST_DIR, "object-13-first-shift-itch.zip");

const PLACEHOLDER_ITCH_URL = "https://TODO-tvuj-ucet.itch.io/object-13-first-shift";

function buildVersion() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

console.log("npm run build:itch — volám existující export:game --target=itch...\n");

const result = spawnSync(
  "node",
  ["scripts/export-game.mjs", "--target=itch", `--public-url=${PLACEHOLDER_ITCH_URL}`, `--build-version=${buildVersion()}`],
  { cwd: REPO_ROOT, stdio: "inherit" },
);

if (result.status !== 0) {
  console.error("\nexport:game selhal — dist/object-13-first-shift-itch.zip nevznikl.");
  process.exit(result.status ?? 1);
}

if (!existsSync(SOURCE_ZIP)) {
  console.error(`\nexport:game proběhl, ale ${path.relative(REPO_ROOT, SOURCE_ZIP)} neexistuje — zkontroluj, jestli je nainstalovaný příkaz 'zip'.`);
  process.exit(1);
}

mkdirSync(DIST_DIR, { recursive: true });
copyFileSync(SOURCE_ZIP, TARGET_ZIP);

console.log(`\nHotovo: ${path.relative(REPO_ROOT, TARGET_ZIP)}`);
console.log("\nPOZOR: URL použitá pro tenhle build je placeholder (itch.io přidělí skutečnou URL až po prvním nahrání).");
console.log("Po prvním nahrání ZIPu na itch.io spusť ručně:");
console.log("  npm run export:game -- --target=itch --public-url=<skutečná itch.io URL>");
console.log("ať BUILD_INFO.txt a CORS hláška v konzoli odpovídají realitě.");
