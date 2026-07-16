import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// "16/17. TESTY" — /database se zatím nesmí objevit v hlavní navigaci ani
// footeru (viz zadání "Stránka má být přístupná pouze po ručním zadání URL
// /database"). Čte zdrojové soubory přímo (žádný render), ať test zachytí i
// budoucí přidání odkazu, ne jen dnešní stav.

const ROOT = join(__dirname, "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

describe("/database is not linked from navigation, footer, or the game screens (16/17)", () => {
  it("16. MainMenuScreen.tsx (main menu navigation) does not reference /database", () => {
    expect(readSource("components/screens/MainMenuScreen.tsx")).not.toContain("/database");
  });

  it("17. Footer.tsx does not reference /database", () => {
    expect(readSource("components/Footer.tsx")).not.toContain("/database");
  });

  it("GameScreen.tsx (in-game screens) does not reference /database", () => {
    expect(readSource("components/screens/GameScreen.tsx")).not.toContain("/database");
  });

  it("the homepage (app/page.tsx) does not reference /database", () => {
    expect(readSource("app/page.tsx")).not.toContain("/database");
  });
});
