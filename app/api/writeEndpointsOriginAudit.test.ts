import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Auditní test (viz zadání "2. Prověř všechny zápisové route handlery",
 * "5. Testy — všechny credentialed write route jsou zahrnuté v auditním
 * testu nebo explicitním seznamu") — projde VŠECHNY `app/api/**\/route.ts`
 * soubory (ne jen dosud upravených 7/8), a pro každý exportovaný
 * POST/PUT/PATCH/DELETE handler ověří, že zdrojový kód volá
 * `isTrustedWriteOrigin` (viz lib/http/cors.ts). Statická kontrola zdrojáku,
 * ne skutečné zavolání route handleru (ten potřebuje `next/headers`
 * request kontext, který tenhle projekt v testech nemá, viz
 * lib/playerProfile/object13PlayerProfileClient.test.ts komentář o
 * chybějícím jsdom/testing-library) — cílem je regresní pojistka: kdyby
 * někdo přidal nový zápisový endpoint bez origin kontroly, tenhle test
 * spadne.
 *
 * Přidání endpointu do `ORIGIN_CHECK_EXEMPT` musí být VÝSLOVNÉ a
 * zdůvodněné (viz zadání "pokud endpoint skutečně potřebuje server-to-server
 * požadavky bez Origin, nevytvářej obecnou výjimku, řeš jej samostatně")
 * — dnes je seznam prázdný, žádný endpoint výjimku nepotřebuje (viz report).
 */
const API_ROOT = __dirname;
const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
const ORIGIN_CHECK_EXEMPT: Record<string, readonly string[]> = {};

function findRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(findRouteFiles(full));
    } else if (entry === "route.ts" || entry === "route.tsx") {
      files.push(full);
    }
  }
  return files;
}

const routeFiles = findRouteFiles(API_ROOT);

describe("write endpoint audit — every credentialed state-changing route must call isTrustedWriteOrigin", () => {
  it("scan sanity check — finds all known API route files (fails loudly if the scan itself breaks)", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(15);
  });

  for (const file of routeFiles) {
    const relative = path.relative(process.cwd(), file);
    const source = readFileSync(file, "utf8");
    const exportedWriteMethods = WRITE_METHODS.filter((method) =>
      new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(source),
    );
    if (exportedWriteMethods.length === 0) continue;

    const exempt = ORIGIN_CHECK_EXEMPT[relative] ?? [];
    const methodsRequiringCheck = exportedWriteMethods.filter((method) => !exempt.includes(method));
    if (methodsRequiringCheck.length === 0) continue;

    it(`${relative} — exports ${methodsRequiringCheck.join("/")}, must call isTrustedWriteOrigin`, () => {
      expect(source).toContain("isTrustedWriteOrigin");
    });
  }
});

describe("write endpoint audit — full inventory (report table)", () => {
  it("lists every route file with its exported methods, for manual cross-check against the report", () => {
    const inventory = routeFiles
      .map((file) => {
        const relative = path.relative(process.cwd(), file);
        const source = readFileSync(file, "utf8");
        const methods = ["GET", ...WRITE_METHODS].filter((method) =>
          new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(source),
        );
        return { relative, methods };
      })
      .sort((a, b) => a.relative.localeCompare(b.relative));

    // Snapshot-free explicit assertion — new/removed routes require a
    // conscious update here, not a silent snapshot diff.
    expect(inventory).toEqual([
      { relative: "app/api/auth/callback/route.ts", methods: ["GET"] },
      { relative: "app/api/auth/login/route.ts", methods: ["GET"] },
      { relative: "app/api/auth/logout/route.ts", methods: ["POST"] },
      { relative: "app/api/auth/me/route.ts", methods: ["GET"] },
      { relative: "app/api/leaderboard/route.ts", methods: ["GET"] },
      { relative: "app/api/og/route.tsx", methods: ["GET"] },
      { relative: "app/api/player/activity/game-start/route.ts", methods: ["POST"] },
      { relative: "app/api/player/death/route.ts", methods: ["POST"] },
      { relative: "app/api/player/hardcore-profile/route.ts", methods: ["GET"] },
      { relative: "app/api/player/hardcore-profile/sync/route.ts", methods: ["POST"] },
      { relative: "app/api/player/profile/equipment/weapon/unlock/route.ts", methods: ["POST"] },
      { relative: "app/api/player/profile/inventory/bulb/add/route.ts", methods: ["POST"] },
      { relative: "app/api/player/profile/inventory/bulb/consume/route.ts", methods: ["POST"] },
      { relative: "app/api/player/profile/route.ts", methods: ["GET", "PUT"] },
      { relative: "app/api/player/survive-night/route.ts", methods: ["POST"] },
    ]);
  });
});
