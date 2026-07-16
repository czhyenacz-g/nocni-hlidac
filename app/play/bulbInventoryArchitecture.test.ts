import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Statická kontrola zdrojového textu app/play/page.tsx — regresní pojistka
// pro architektonickou opravu z zadání "profilový kontrakt V1" ("KAŽDÁ
// TRVALÁ INVENTÁŘOVÁ ZMĚNA V HARDCORE MUSÍ BÝT EXPLICITNĚ POTVRZENA
// SERVEREM V OKAMŽIKU, KDY K NÍ DOJDE — ne na konci směny, ne souhrnnou
// deltou"). Komponenta samotná nejde nezávisle otestovat bez jsdom (viz
// report), tenhle test aspoň zamkne "co tam NENÍ" a "co tam smí být, jen na
// přesně určeném místě" — přímou inspekcí zdroje, ne renderem.
const pageSource = readFileSync(join(__dirname, "page.tsx"), "utf8");

describe("app/play/page.tsx — no end-of-shift delta commit (architectural fix)", () => {
  it("9. commitBulbsRemaining (the old summary delta commit function) no longer exists anywhere", () => {
    expect(pageSource).not.toContain("commitBulbsRemaining");
  });

  it("shiftStartBulbsRemainingRef (the old delta-tracking ref) no longer exists anywhere", () => {
    expect(pageSource).not.toContain("shiftStartBulbsRemainingRef");
  });

  it("7. the death-transition block never calls consumeBulbs/addBulbs — death is not an inventory event", () => {
    const start = pageSource.indexOf('if (state.screen === "death") {');
    const end = pageSource.indexOf('if (state.screen === "win") {');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const deathBlock = pageSource.slice(start, end);
    expect(deathBlock).not.toMatch(/\.consumeBulbs\(/);
    expect(deathBlock).not.toMatch(/\.addBulbs\(/);
  });

  it("8. the win-transition block never calls addBulbs, and its only consumeBulbs call is the per-event daily-service repair (not a delta/summary commit)", () => {
    const start = pageSource.indexOf('if (state.screen === "win") {');
    const end = pageSource.indexOf("}, [state.screen, state.deathReason]);");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const winBlock = pageSource.slice(start, end);

    // Denní servis (viz applyDailyBulbService) je schválená výjimka — servis
    // sám spotřebovává náhradní žárovku stejně jako ruční výměna u dveří, a
    // proto je to TAKÉ potvrzená serverová událost v Hardcore (viz report).
    // Musí ale jít o přesně JEDNU spotřebu na jednu (dnes jedinou možnou)
    // prasklou místnostní žárovku, ne o výpočet rozdílu/sumy za celou směnu.
    expect(winBlock).not.toMatch(/\.addBulbs\(/);
    const consumeCalls = winBlock.match(/\.consumeBulbs\(/g) ?? [];
    expect(consumeCalls.length).toBeLessThanOrEqual(1);
    if (consumeCalls.length === 1) {
      expect(winBlock).toContain("applyDailyBulbService");
    }

    // Žádný výpočet rozdílu mezi počátečním a konečným stavem směny.
    expect(winBlock).not.toMatch(/delta/i);
  });
});
