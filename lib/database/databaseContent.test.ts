import { describe, expect, it } from "vitest";
import {
  DATABASE_EQUIPMENT,
  DATABASE_MANUALS,
  DATABASE_MANUALS_TAB_TODO_ITEMS,
  DATABASE_PLANNED_SUBJECTS,
  DATABASE_REPORTS_TAB_TODO_ITEMS,
  DATABASE_SAMPLE_REPORT,
  DATABASE_SUBJECTS,
  DATABASE_SUBJECTS_TAB_TODO_ITEMS,
  DATABASE_EQUIPMENT_TAB_TODO_ITEMS,
} from "./databaseContent";

// Statický obsah /database (viz zadání "18. TESTY" #11-14) — čistá data,
// žádné renderování, ale ověřuje přesně to, co má být na stránce vidět.

describe("DATABASE_SUBJECTS", () => {
  it("11. contains the sample Ghoul card (G-01)", () => {
    const ghoul = DATABASE_SUBJECTS.find((s) => s.id === "ghoul");
    expect(ghoul).toBeDefined();
    expect(ghoul?.code).toBe("G-01");
    expect(ghoul?.name).toBe("GHOUL");
    expect(ghoul?.observations.length).toBeGreaterThan(0);
    expect(ghoul?.loadout.length).toBeGreaterThan(0);
  });

  it("DATABASE_PLANNED_SUBJECTS contains Ghost, Titan and Praetorián as future/TODO, not confirmed subjects", () => {
    const ids = DATABASE_PLANNED_SUBJECTS.map((s) => s.id);
    expect(ids).toEqual(["ghost", "titan", "praetorian"]);
    for (const subject of DATABASE_PLANNED_SUBJECTS) {
      expect(subject.plannedTraits.length).toBeGreaterThan(0);
    }
  });
});

describe("DATABASE_EQUIPMENT", () => {
  it("12. contains shotgun, ammo dispenser, sonic cannon, door system and generator", () => {
    const ids = DATABASE_EQUIPMENT.map((e) => e.id);
    expect(ids).toEqual(
      expect.arrayContaining(["single-shotgun", "double-shotgun", "ammo-dispenser", "sonic-cannon", "door-system", "generator"]),
    );
  });

  it("every equipment card has the required fields (name/internalCode/description/status/todos)", () => {
    for (const equipment of DATABASE_EQUIPMENT) {
      expect(equipment.name.length).toBeGreaterThan(0);
      expect(equipment.internalCode.length).toBeGreaterThan(0);
      expect(equipment.description.length).toBeGreaterThan(0);
      expect(equipment.status.length).toBeGreaterThan(0);
      expect(equipment.todos.length).toBeGreaterThan(0);
    }
  });
});

describe("DATABASE_SAMPLE_REPORT", () => {
  it("13. is the fixed demo report (night 7, G-07 Ghoul), never dynamic", () => {
    expect(DATABASE_SAMPLE_REPORT.night).toBe(7);
    expect(DATABASE_SAMPLE_REPORT.subjectCode).toBe("G-07");
    expect(DATABASE_SAMPLE_REPORT.subjectType).toBe("Ghoul");
    expect(DATABASE_SAMPLE_REPORT.events.length).toBeGreaterThan(0);
    expect(DATABASE_SAMPLE_REPORT.outcome).toBe("SMĚNA DOKONČENA");
  });
});

describe("DATABASE_MANUALS", () => {
  it("14. includes at least the seven base emergency manuals", () => {
    expect(DATABASE_MANUALS.length).toBeGreaterThanOrEqual(7);
    const titles = DATABASE_MANUALS.map((m) => m.title);
    expect(titles).toContain("Jak přežít první noc");
    expect(titles).toContain("Použití brokovnice");
  });

  it("every manual has at least one instruction line", () => {
    for (const manual of DATABASE_MANUALS) {
      expect(manual.instructions.length).toBeGreaterThan(0);
    }
  });
});

describe("15. TODO item lists exist for every tab and are non-empty (rendered via DatabaseTodoBlock, never silently empty)", () => {
  it.each([
    ["subjects", DATABASE_SUBJECTS_TAB_TODO_ITEMS],
    ["equipment", DATABASE_EQUIPMENT_TAB_TODO_ITEMS],
    ["reports", DATABASE_REPORTS_TAB_TODO_ITEMS],
    ["manuals", DATABASE_MANUALS_TAB_TODO_ITEMS],
  ])("%s tab has TODO items", (_tab, items) => {
    expect(items.length).toBeGreaterThan(0);
  });
});
