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
 * `NEXT_PUBLIC_API_ORIGIN` je VŽDY natvrdo `https://www.nocni-hlidac.cz` (WWW,
 * ne holý apex — apex dělá 308 redirect na www, který CORS preflight z
 * cross-origin itch.io embedu nesmí následovat, viz TECH_DESIGN.md) — tenhle
 * skript záměrně nikdy nedovolí sestavit veřejný build proti jinému API
 * serveru (viz zadání "Nevytvářej dotaz, který dovolí sestavit veřejný build
 * proti libovolnému API serveru").
 */

import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync, cpSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP_BUILD_DIR = path.join(REPO_ROOT, ".export-build-tmp");
const DIST_ROOT = path.join(REPO_ROOT, "dist-game");

// Nikdy konfigurovatelné z venku — viz zadání "API origin musí pro tento
// úkol zůstat natvrdo".
const FIXED_API_ORIGIN = "https://www.nocni-hlidac.cz";

const TARGETS = /** @type {const} */ (["itch", "local", "custom"]);

/**
 * Symlinkovaná sdílená vrstva (žádná kopie zdrojového kódu) — `"public"`
 * záměrně chybí, protože se sestavuje ZVLÁŠŤ přes `buildFilteredPublicDir`
 * níže (potřebuje filtrovat jednotlivé soubory, ne symlinkovat celý
 * adresář najednou, viz zadání "at je součástí buildu i přesun
 * nepoužívaných png a jiných multimediálních souborů").
 */
const SHARED_SYMLINKS = ["components", "game", "content", "lib", "styles", "node_modules", "tsconfig.json", "postcss.config.mjs", "tailwind.config.ts"];

/**
 * Složky, které jsou samy o sobě vždy pracovní odpad, ne asset appky — nikdy
 * žádná `src`/cesta v kódu na soubor UVNITŘ takové složky neodkazuje (ověřeno
 * `grep -rn <basename>` napříč `game/`, `components/`, `content/`, `lib/`,
 * `app/` v době psaní tohohle pravidla, viz zadání "44 MB nepoužitého
 * balastu"). Case-insensitive substring match na libovolný segment cesty —
 * pokrývá `camera (backup)/`, `sound/.../backup/`,
 * `sound/.../original_backup/` (obsahují "backup") i `object_13/Bez názvu/`
 * (zapomenuté screenshoty/exporty, český název "Bez názvu" = "Untitled").
 */
const JUNK_DIR_MARKERS = ["backup", "bez názvu"];

/**
 * Osamocené soubory MIMO výše uvedené junk složky, které stejným `grep`
 * auditem vyšly jako nikde v appce nepoužité (starší/nahrazené obrázky,
 * nepoužité `.wav` originály vedle skutečně přehrávaných `.mp3`/`.m4a`) — na
 * rozdíl od `JUNK_DIR_MARKERS` jde o jednotlivé přesné názvy, ne vzor, proto
 * samostatný explicitní seznam místo dalšího heuristického pravidla.
 */
const KNOWN_UNUSED_BASENAMES = new Set([
  "sonic_cannon_v2.wav",
  "victory_game_ove.png",
  "play_backound_universal.png",
  "repel_failed.wav",
  "repel_stay.wav",
  "rigth_hallway_fleeing_monster.png",
  "camera_destroid_full.m4a",
  // Zapomenuté surové nahrávky pojmenované podle místa natáčení (Všestary),
  // ne podle obsahu — leftover z původního nahrávání, appka je nikde nehraje.
  "Všestary 3.m4a",
  "Všestary 11.m4a",
  "Všestary 4.m4a",
]);

/**
 * Jestli je `entryPath` (absolutní cesta v `public/`) nechtěný zdrojový/mrtvý
 * soubor, který se do distribuovatelného buildu nikdy nemá dostat (viz
 * zadání "buildni to bez nepoužívaných png a jiných multimediálních
 * souborů" a navazující "44 MB nepoužitého balastu") — audit ukázal, že tyhle
 * kategorie jsou VŽDY jen zmíněné v komentářích ("zdrojový wav", "zkonvertovaný
 * z .png") nebo úplně zapomenuté pracovní kopie, nikdy ve skutečné
 * `src`/cestě, kterou by appka za běhu načetla:
 *
 * 1. `.png`, který má ve STEJNÉ složce sourozence se stejným jménem a
 *    příponou `.webp` — projekt důsledně konvertuje obrázky přes `cwebp`
 *    (viz CLAUDE.md "Povolení: konverze obrázků do WebP") a appka vždycky
 *    natvrdo odkazuje jen `.webp` (viz `cameraAttackAnimation.object13.test.ts`/
 *    `titanDoorAssets.test.ts`/`monsterPresentation.test.ts` — "nikdy .png").
 *    Zdrojový `.png` je tak vždycky jen surovina pro konverzi, ne asset, co
 *    appka sama načítá.
 * 2. cokoliv uvnitř složky doslova pojmenované `source` (např. `sound/.../source/`)
 *    — surové nezpracované nahrávky (`*_raw.wav`/`.m4a`), zmiňované jen v
 *    komentářích jako "zdroj pro budoucí zpracování", appka je nikdy
 *    nepřehrává.
 * 3. `.DS_Store` (macOS metadata, nikdy součást appky).
 * 4. cokoliv uvnitř složky, jejíž název odpovídá `JUNK_DIR_MARKERS`
 *    (zálohy/duplicitní kopie, zapomenuté screenshoty).
 * 5. jednotlivé soubory z `KNOWN_UNUSED_BASENAMES` mimo výše uvedené složky.
 */
export function isExcludedPublicFile(entryPath) {
  const base = path.basename(entryPath);
  if (base === ".DS_Store") return true;
  if (path.basename(path.dirname(entryPath)) === "source") return true;
  if (base.toLowerCase().endsWith(".png")) {
    const webpSibling = entryPath.slice(0, -path.extname(entryPath).length) + ".webp";
    if (existsSync(webpSibling)) return true;
  }
  const segments = entryPath.split(path.sep).map((segment) => segment.toLowerCase());
  if (segments.some((segment) => JUNK_DIR_MARKERS.some((marker) => segment.includes(marker)))) return true;
  if (KNOWN_UNUSED_BASENAMES.has(base)) return true;
  return false;
}

/**
 * Rekurzivně zrcadlí `public/` do `destDir` — SYMLINK na každý JEDNOTLIVÝ
 * soubor (ne kopie, stejný "žádné riziko driftu" princip jako
 * SHARED_SYMLINKS výše), kromě souborů vyloučených přes
 * `isExcludedPublicFile`. Vrací `{ keptCount, excludedCount, excludedBytes }`
 * pro souhrnný výpis (viz `main()` níže) — hráč/vývojář má vidět, kolik se
 * ušetřilo, ne jen tichý výsledek.
 */
export function buildFilteredPublicDir(srcDir, destDir) {
  let keptCount = 0;
  let excludedCount = 0;
  let excludedBytes = 0;

  function walk(currentSrc, currentDest) {
    mkdirSync(currentDest, { recursive: true });
    for (const name of readdirSync(currentSrc)) {
      const entrySrc = path.join(currentSrc, name);
      const entryDest = path.join(currentDest, name);
      const stat = statSync(entrySrc);
      if (stat.isDirectory()) {
        walk(entrySrc, entryDest);
        continue;
      }
      if (isExcludedPublicFile(entrySrc)) {
        excludedCount += 1;
        excludedBytes += stat.size;
        continue;
      }
      symlinkSync(entrySrc, entryDest);
      keptCount += 1;
    }
  }

  walk(srcDir, destDir);
  return { keptCount, excludedCount, excludedBytes };
}

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

  const publicSrc = path.join(REPO_ROOT, "public");
  const publicFilterResult = existsSync(publicSrc)
    ? buildFilteredPublicDir(publicSrc, path.join(TMP_BUILD_DIR, "public"))
    : { keptCount: 0, excludedCount: 0, excludedBytes: 0 };

  mkdirSync(path.join(TMP_BUILD_DIR, "app"), { recursive: true });
  for (const entry of EXPORTABLE_APP_ENTRIES) {
    const src = path.join(REPO_ROOT, "app", entry);
    if (!existsSync(src)) continue;
    symlinkSync(src, path.join(TMP_BUILD_DIR, "app", entry));
  }

  // Export-specific Next config — `output: "export"` + `images.unoptimized`
  // (povinné pro statický export). `assetPrefix: "."` dělá z `_next/...`
  // odkazů RELATIVNÍ cesty místo absolutních `/​_next/...` — bez tohohle
  // itch.io embed (servírovaný z libovolné podsložky, ne z kořene domény)
  // dostává 404 na každý JS chunk, protože `/​_next/...` se vždy resolvne
  // od kořene CELÉ domény (html-classic.itch.zone), ne od složky s hrou.
  // Samostatný soubor, nikdy nezasahuje do kořenového next.config.ts (ten
  // používá normální `npm run build`).
  writeFileSync(
    path.join(TMP_BUILD_DIR, "next.config.mjs"),
    `const nextConfig = {\n  output: "export",\n  images: { unoptimized: true },\n  assetPrefix: ".",\n};\nexport default nextConfig;\n`,
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

  return publicFilterResult;
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

  const { keptCount, excludedCount, excludedBytes } = prepareTempBuildDir();
  const excludedMb = (excludedBytes / 1024 / 1024).toFixed(1);
  console.log(
    `public/ assets:  ${keptCount} zahrnuto, ${excludedCount} vynecháno (nepoužívané .png se .webp sourozencem, ` +
      `zdrojové nahrávky ve složkách "source/", .DS_Store) — ušetřeno ~${excludedMb} MB`,
  );

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

  // Kořenová "/" route je jen `redirect("/play")` (viz app/page.tsx) — na
  // doméně to funguje, ale hostitelé jako itch.io servírují hru z libovolné
  // (neznámé) podsložky, kde by klientský redirect na absolutní "/play"
  // skončil na špatné adrese. Kořenový index.html proto rovnou nahradíme
  // obsahem play.html, ať ZIP jde otevřít/embednout přímo bez mezikroku.
  const playHtmlPath = path.join(outputDir, "play.html");
  if (existsSync(playHtmlPath)) {
    cpSync(playHtmlPath, path.join(outputDir, "index.html"));
  }

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
