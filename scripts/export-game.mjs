#!/usr/bin/env node
/**
 * `npm run export:game` — statický export samostatně hostovatelného herního
 * klienta (viz zadání "Vytvoř malý interaktivní exportní proces"). Next.js
 * `output: "export"` je all-or-nothing pro celý `app/` strom — appka ale má
 * server-only stránky (`/admin`, `/leaderboard`, `/database`) a `/api/**`
 * route handlery (cookies/session/VPS), které se staticky exportovat nedají
 * (viz report). Řešení: DOČASNÝ adresář (`.export-build-tmp/`, gitignored)
 * se symlinky na sdílený kód (`components/`, `game/`, `lib/`, `content/`,
 * `styles/`, `public/`, `node_modules/`, configy) a jen na EXPORTOVATELNÉ
 * `app/` cesty (`/`, `/play`, `/about`, `/terms`, `/profile`) + vlastní
 * `next.config.mjs` s `output: "export"`. Žádná kopie zdrojového kódu —
 * symlinky, takže nulové riziko driftu. Normální `npm run build`
 * (`next.config.ts` v kořeni repozitáře) zůstává úplně beze změny.
 *
 * `NEXT_PUBLIC_API_ORIGIN` je VŽDY natvrdo `https://nocni-hlidac.cz` — tenhle
 * skript záměrně nikdy nedovolí sestavit veřejný build proti jinému API
 * serveru (viz zadání "Nevytvářej dotaz, který dovolí sestavit veřejný build
 * proti libovolnému API serveru").
 */

import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync, cpSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP_BUILD_DIR = path.join(REPO_ROOT, ".export-build-tmp");
const DIST_ROOT = path.join(REPO_ROOT, "dist-game");

// Nikdy konfigurovatelné z venku — viz zadání "API origin musí pro tento
// úkol zůstat natvrdo".
const FIXED_API_ORIGIN = "https://nocni-hlidac.cz";

const TARGETS = /** @type {const} */ (["itch", "local", "custom"]);

/** Symlinkovaná sdílená vrstva (žádná kopie zdrojového kódu). */
const SHARED_SYMLINKS = ["components", "game", "content", "lib", "styles", "public", "node_modules", "tsconfig.json", "postcss.config.mjs", "tailwind.config.ts"];

/** Jen exportovatelné app/ cesty — vynechává /admin, /leaderboard, /database (server-only), /api/** (route handlery), a dev-only /minihra, /dev-sound, /death-test (nejsou součástí distribuovatelné hry). */
const EXPORTABLE_APP_ENTRIES = ["layout.tsx", "globals.css", "favicon.ico", "icon.svg", "page.tsx", "config", "play", "about", "terms", "profile"];

/**
 * Cíl exportu -> `NEXT_PUBLIC_GAME_CLIENT` (viz lib/activity/activityClient.ts
 * — enum se záměrně nerozšiřuje, "custom" mapuje na nejbližší existující
 * hodnotu "web", protože jde o skutečný veřejně hostovaný web build, ne o
 * lokální test ani o itch.io embed).
 */
function gameClientForTarget(target) {
  if (target === "itch") return "itch";
  if (target === "local") return "local-export";
  return "web"; // custom
}

export function buildDefaultVersion(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function sanitizeBuildVersionForExport(raw) {
  const trimmed = String(raw ?? "").trim().slice(0, 64);
  return trimmed.length > 0 ? trimmed : buildDefaultVersion();
}

/** Jednoduchý CLI arg parser (`--key=value`) — žádná nová závislost. */
export function parseCliArgs(argv) {
  const result = {};
  for (const arg of argv) {
    const match = /^--([a-zA-Z-]+)=(.*)$/.exec(arg);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

/** `raw` je libovolný uživatelský/CLI vstup pro cíl — normalizuje na "itch"/"local"/"custom", nebo `null` pro neplatnou hodnotu. */
export function resolveExportTarget(raw) {
  const value = String(raw ?? "").toLowerCase();
  if (value === "itch" || value === "itch.io") return "itch";
  if (value === "local" || value === "local-test" || value === "local-export") return "local";
  if (value === "custom" || value === "web" || value === "other") return "custom";
  return null;
}

/**
 * Validace veřejné URL podle cíle (viz zadání "Přidej přiměřené testy pro...
 * odmítnutí neplatné nebo nebezpečné URL"). Lokální test dovoluje `http:`,
 * itch/custom vyžaduje `https:` (skutečná veřejná URL) — nikdy
 * `javascript:`/`data:`/relativní cestu.
 */
export function validatePublicUrl(target, raw) {
  const value = String(raw ?? "").trim();
  if (!value) return { ok: false, error: "URL nesmí být prázdná." };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "Neplatná URL." };
  }
  if (target === "local") {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Lokální test vyžaduje http:// nebo https:// URL." };
    }
    return { ok: true, url: parsed.toString().replace(/\/+$/, "") };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Veřejná URL musí být https://." };
  }
  return { ok: true, url: parsed.toString().replace(/\/+$/, "") };
}

export function buildInfoContents({ target, publicUrl, apiOrigin, client, buildVersion, builtAt }) {
  return `Noční hlídač — export herního klienta
=======================================
Target:         ${target}
Veřejná URL:    ${publicUrl}
API origin:     ${apiOrigin}
Client label:   ${client}
Build version:  ${buildVersion}
Sestaveno:      ${builtAt}
`;
}

async function promptWizard() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("Noční hlídač — export herního klienta\n");
    console.log("Kam bude tenhle build nasazen?");
    console.log("  1) itch.io");
    console.log("  2) lokální test");
    console.log("  3) vlastní web / jiný statický hosting");
    let target = null;
    while (!target) {
      const answer = (await rl.question("Zvol 1/2/3: ")).trim();
      target = { "1": "itch", "2": "local", "3": "custom" }[answer] ?? null;
      if (!target) console.log("Neplatná volba, zkus znovu.");
    }

    const defaultUrl = target === "local" ? "http://localhost:8080" : "";
    let publicUrl = null;
    while (!publicUrl) {
      const promptLabel =
        target === "itch"
          ? "URL stránky hry na itch.io (https://tvuj-ucet.itch.io/nazev-hry): "
          : target === "local"
            ? `Veřejná URL pro lokální test [${defaultUrl}]: `
            : "Plná HTTPS URL vlastního hostingu: ";
      const answer = (await rl.question(promptLabel)).trim() || defaultUrl;
      const validated = validatePublicUrl(target, answer);
      if (!validated.ok) {
        console.log(`Neplatná URL: ${validated.error}`);
        continue;
      }
      publicUrl = validated.url;
    }

    const suggestedVersion = buildDefaultVersion();
    const versionAnswer = (await rl.question(`Build version [${suggestedVersion}]: `)).trim();
    const buildVersion = sanitizeBuildVersionForExport(versionAnswer || suggestedVersion);

    return { target, publicUrl, buildVersion };
  } finally {
    rl.close();
  }
}

function rmIfExists(target) {
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

/** Vytvoří dočasný build adresář se symlinky (viz modul-level komentář) — nikdy nekopíruje zdrojový kód. */
function prepareTempBuildDir() {
  rmIfExists(TMP_BUILD_DIR);
  mkdirSync(TMP_BUILD_DIR, { recursive: true });

  for (const name of SHARED_SYMLINKS) {
    const src = path.join(REPO_ROOT, name);
    if (!existsSync(src)) continue;
    symlinkSync(src, path.join(TMP_BUILD_DIR, name));
  }

  mkdirSync(path.join(TMP_BUILD_DIR, "app"), { recursive: true });
  for (const entry of EXPORTABLE_APP_ENTRIES) {
    const src = path.join(REPO_ROOT, "app", entry);
    if (!existsSync(src)) continue;
    symlinkSync(src, path.join(TMP_BUILD_DIR, "app", entry));
  }

  // Export-specific Next config — `output: "export"` + `images.unoptimized`
  // (povinné pro statický export). Samostatný soubor, nikdy nezasahuje do
  // kořenového next.config.ts (ten používá normální `npm run build`).
  writeFileSync(
    path.join(TMP_BUILD_DIR, "next.config.mjs"),
    `const nextConfig = {\n  output: "export",\n  images: { unoptimized: true },\n};\nexport default nextConfig;\n`,
  );

  // next-env.d.ts jen odkazuje na typy, next build si ho případně sám
  // přegeneruje — prázdný stub stačí, ať `next build` neváhá nad chybějícím
  // souborem.
  writeFileSync(path.join(TMP_BUILD_DIR, "next-env.d.ts"), `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`);

  // package.json jen s "type" polem, ať Next pozná ESM/CJS stejně jako v
  // kořeni — zbytek (scripts/deps) tady nepotřebujeme, next běží přímo přes
  // spawn níže.
  const rootPackageJson = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  writeFileSync(
    path.join(TMP_BUILD_DIR, "package.json"),
    JSON.stringify({ name: "nocni-hlidac-export", version: "0.0.0", private: true, type: rootPackageJson.type }, null, 2),
  );
}

function printCorsGuidance(target, publicUrl) {
  console.log("\n— CORS / origin whitelist —");
  if (target === "itch") {
    let originGuess = "(nepodařilo se odvodit)";
    try {
      originGuess = new URL(publicUrl).origin;
    } catch {
      /* ignore */
    }
    console.log(`Zadaná URL stránky (${originGuess}) NEMUSÍ být skutečný origin, ze kterého itch.io embed volá API —`);
    console.log("itch.io hry běží v iframu servírovaném z jiné domény (např. html-classic.itch.zone), ne z veřejné adresy stránky.");
    console.log("Po prvním nahrání ZIPu na itch.io otevři hru, otevři DevTools -> Network, klikni na Discord login a podívej se na");
    console.log("skutečnou hodnotu hlavičky 'Origin' odchozího requestu na nocni-hlidac.cz — TOHLE přidej do AUTH_ALLOWED_ORIGINS");
    console.log("a AUTH_RETURN_ITCH_URL na produkčním nasazení nocni-hlidac.cz, ne odvozenou hodnotu z veřejné URL výše.");
  } else if (target === "local") {
    let originGuess = "(neplatná URL)";
    try {
      originGuess = new URL(publicUrl).origin;
    } catch {
      /* ignore */
    }
    console.log(`Origin ${originGuess} musíš dočasně přidat do AUTH_ALLOWED_ORIGINS na produkčním nocni-hlidac.cz —`);
    console.log("lokální dev fallback (localhost povolený automaticky) platí jen když BACKEND běží v NODE_ENV=development,");
    console.log("produkční nocni-hlidac.cz běží v produkci, takže localhost tam není povolený, dokud ho výslovně nepřidáš.");
  } else {
    let originGuess = "(neplatná URL)";
    try {
      originGuess = new URL(publicUrl).origin;
    } catch {
      /* ignore */
    }
    console.log(`Přidej přesně tenhle origin do AUTH_ALLOWED_ORIGINS na produkčním nocni-hlidac.cz: ${originGuess}`);
  }
  console.log("Origin kontrola (lib/http/cors.ts) se tímhle skriptem nijak neoslabuje ani nemění — žádné wildcardy se nepřidávají.\n");
}

async function main() {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  const interactive = !(cliArgs.target && cliArgs["public-url"]);

  let target;
  let publicUrl;
  let buildVersion;

  if (interactive) {
    ({ target, publicUrl, buildVersion } = await promptWizard());
  } else {
    target = resolveExportTarget(cliArgs.target);
    if (!target) {
      console.error(`Neplatný --target=${cliArgs.target ?? ""} (povolené: ${TARGETS.join(", ")})`);
      process.exit(1);
    }
    const validated = validatePublicUrl(target, cliArgs["public-url"]);
    if (!validated.ok) {
      console.error(`Neplatná --public-url: ${validated.error}`);
      process.exit(1);
    }
    publicUrl = validated.url;
    buildVersion = sanitizeBuildVersionForExport(cliArgs["build-version"]);
  }

  const client = gameClientForTarget(target);
  const outputDir = path.join(DIST_ROOT, target);

  console.log(`\nTarget:        ${target}`);
  console.log(`Veřejná URL:   ${publicUrl}`);
  console.log(`Client label:  ${client}`);
  console.log(`Build version: ${buildVersion}`);
  console.log(`API origin:    ${FIXED_API_ORIGIN} (natvrdo, nelze změnit)`);

  prepareTempBuildDir();

  const buildEnv = {
    ...process.env,
    NEXT_PUBLIC_GAME_CLIENT: client,
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
    NEXT_PUBLIC_API_ORIGIN: FIXED_API_ORIGIN,
  };

  console.log("\nSpouštím next build (statický export)...\n");
  const result = spawnSync("npx", ["next", "build"], { cwd: TMP_BUILD_DIR, env: buildEnv, stdio: "inherit" });

  if (result.status !== 0) {
    rmIfExists(TMP_BUILD_DIR);
    console.error("\nExport build selhal — .export-build-tmp odstraněn, npm run build zůstává beze změny.");
    process.exit(result.status ?? 1);
  }

  const exportedOutDir = path.join(TMP_BUILD_DIR, "out");
  if (!existsSync(exportedOutDir)) {
    rmIfExists(TMP_BUILD_DIR);
    console.error("next build proběhl, ale adresář 'out' nevznikl — zkontroluj next.config.mjs output:\"export\".");
    process.exit(1);
  }

  rmIfExists(outputDir);
  mkdirSync(outputDir, { recursive: true });
  cpSync(exportedOutDir, outputDir, { recursive: true });

  const builtAt = new Date().toISOString();
  writeFileSync(
    path.join(outputDir, "BUILD_INFO.txt"),
    buildInfoContents({ target, publicUrl, apiOrigin: FIXED_API_ORIGIN, client, buildVersion, builtAt }),
  );

  const zipPath = path.join(DIST_ROOT, `${target}.zip`);
  rmIfExists(zipPath);
  const zipResult = spawnSync("zip", ["-r", zipPath, "."], { cwd: outputDir, stdio: "inherit" });
  if (zipResult.status !== 0) {
    console.warn("Vytvoření ZIPu selhalo (chybí 'zip' příkaz?) — statická složka je i tak hotová.");
  }

  rmIfExists(TMP_BUILD_DIR);

  printCorsGuidance(target, publicUrl);

  console.log("Hotovo!");
  console.log(`Statická složka: ${path.relative(REPO_ROOT, outputDir)}/`);
  if (zipResult.status === 0) console.log(`ZIP:             ${path.relative(REPO_ROOT, zipPath)}`);
  console.log(`\nLokální test:    cd ${path.relative(REPO_ROOT, outputDir)} && npx serve -l 8080`);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
