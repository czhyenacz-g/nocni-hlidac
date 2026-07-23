import { beforeEach, describe, expect, it, vi } from "vitest";
import { COPY_CS } from "../../content/copy";
import { COPY_EN } from "../../content/copy.en";
import { TRANSLATIONS } from "./translations";
import { DEFAULT_LANGUAGE, isValidLanguage, LANGUAGES, loadStoredLanguage, LANGUAGE_STORAGE_KEY } from "./language";
import { CINEMATIC_SCENES } from "../../content/cinematics";

// Vitest tu běží v node prostředí (žádné jsdom, viz
// game/core/firstNightWarning.test.ts) — window je jinak undefined, fake
// localStorage přes vi.stubGlobal je stejný vzor jako tam.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

/** Rekurzivně vrátí seřazený seznam dotted-path klíčů pro všechny listové hodnoty (string/number/null/pole se považují za list). */
function collectLeafKeys(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return [prefix];
  }
  return Object.keys(node as Record<string, unknown>)
    .flatMap((key) => collectLeafKeys((node as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe("COPY_CS and COPY_EN have exactly the same set of translation keys", () => {
  it("no keys are missing or extra in either direction", () => {
    const csKeys = collectLeafKeys(COPY_CS);
    const enKeys = collectLeafKeys(COPY_EN);
    expect(enKeys).toEqual(csKeys);
  });
});

describe("no translation value is empty", () => {
  function collectStrings(node: unknown, path: string, out: { path: string; value: string }[]) {
    if (typeof node === "string") {
      out.push({ path, value: node });
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      collectStrings(value, path ? `${path}.${key}` : key, out);
    }
  }

  it("every string leaf in COPY_CS is non-empty", () => {
    const strings: { path: string; value: string }[] = [];
    collectStrings(COPY_CS, "", strings);
    expect(strings.length).toBeGreaterThan(0);
    for (const { path, value } of strings) {
      expect(value.length, `empty CS value at ${path}`).toBeGreaterThan(0);
    }
  });

  it("every string leaf in COPY_EN is non-empty", () => {
    const strings: { path: string; value: string }[] = [];
    collectStrings(COPY_EN, "", strings);
    expect(strings.length).toBeGreaterThan(0);
    for (const { path, value } of strings) {
      expect(value.length, `empty EN value at ${path}`).toBeGreaterThan(0);
    }
  });
});

describe("language storage — invalid/missing stored value safely falls back to the default language", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  it("isValidLanguage rejects garbage values", () => {
    expect(isValidLanguage("de")).toBe(false);
    expect(isValidLanguage("")).toBe(false);
    expect(isValidLanguage(null)).toBe(false);
    expect(isValidLanguage(undefined)).toBe(false);
    expect(isValidLanguage(42)).toBe(false);
  });

  it("isValidLanguage accepts every registered language", () => {
    for (const lang of LANGUAGES) expect(isValidLanguage(lang)).toBe(true);
  });

  it("loadStoredLanguage() falls back to DEFAULT_LANGUAGE when localStorage holds an invalid value", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "klingon");
    expect(loadStoredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it("loadStoredLanguage() falls back to DEFAULT_LANGUAGE when nothing is stored", () => {
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    expect(loadStoredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it("loadStoredLanguage() returns a validly stored language unchanged", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    expect(loadStoredLanguage()).toBe("en");
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  });
});

describe("switching the active language changes the displayed text", () => {
  // No jsdom/testing-library in this project (see comment above) — this
  // exercises the exact mechanism useCopy()/useTranslation() are built on
  // (`TRANSLATIONS[language]`, see ./useTranslation.ts): the returned copy
  // object is a pure function of `language`, so a component re-rendering
  // after LanguageProvider's setLanguage() necessarily sees new text for
  // the same key, with no other state involved.
  it("the same key resolves to different text for cs vs en", () => {
    expect(TRANSLATIONS.cs.menu.title).toBe("Noční hlídač");
    expect(TRANSLATIONS.en.menu.title).toBe("Night Watchman");
    expect(TRANSLATIONS.cs.menu.title).not.toBe(TRANSLATIONS.en.menu.title);
  });

  it("switching back and forth is idempotent (no stale/cached copy)", () => {
    let language: "cs" | "en" = "cs";
    const readTitle = () => TRANSLATIONS[language].menu.title;

    expect(readTitle()).toBe("Noční hlídač");
    language = "en";
    expect(readTitle()).toBe("Night Watchman");
    language = "cs";
    expect(readTitle()).toBe("Noční hlídač");
  });
});

describe("the English full title is exactly the required string", () => {
  it('COPY_EN.franchise.fullTitleObject13 is exactly "Night Watchman: Object 13"', () => {
    expect(COPY_EN.franchise.fullTitleObject13).toBe("Night Watchman: Object 13");
  });

  it("never uses the wrong word order 'Object 13: Night Watchman'", () => {
    expect(COPY_EN.franchise.fullTitleObject13).not.toBe("Object 13: Night Watchman");
  });

  it("the franchise name and the Object 13 campaign name are stored as separate keys", () => {
    expect(TRANSLATIONS.en.franchise.title).toBe("Night Watchman");
    expect(TRANSLATIONS.en.campaign.object13.title).toBe("Object 13");
    // Adding a future campaign only means adding a new key under `campaign`
    // — it never requires touching `franchise.title`.
    expect(TRANSLATIONS.en.franchise.title).not.toContain("Object 13");
  });

  it("Czech keeps the existing name", () => {
    expect(TRANSLATIONS.cs.franchise.title).toBe("Noční hlídač");
    expect(TRANSLATIONS.cs.franchise.fullTitleObject13).toBe("Noční hlídač: Objekt 13");
  });
});

describe("cinematic textKey references (scene.id + segment.id) resolve to real translations in both languages", () => {
  it("every scene/segment id in CINEMATIC_SCENES has a matching cinematics.<scene>.<segment> entry in COPY_CS and COPY_EN", () => {
    for (const scene of Object.values(CINEMATIC_SCENES)) {
      const csScene = COPY_CS.cinematics[scene.id as keyof typeof COPY_CS.cinematics] as {
        segments: Record<string, { text: string; responseLabel: string }>;
      };
      const enScene = COPY_EN.cinematics[scene.id as keyof typeof COPY_EN.cinematics] as {
        segments: Record<string, { text: string; responseLabel: string }>;
      };
      expect(csScene, `missing CS cinematics entry for scene "${scene.id}"`).toBeDefined();
      expect(enScene, `missing EN cinematics entry for scene "${scene.id}"`).toBeDefined();

      for (const segment of scene.segments) {
        const csSegment = csScene.segments[segment.id];
        const enSegment = enScene.segments[segment.id];
        expect(csSegment, `missing CS text for ${scene.id}.${segment.id}`).toBeDefined();
        expect(enSegment, `missing EN text for ${scene.id}.${segment.id}`).toBeDefined();
        expect(csSegment.text.length).toBeGreaterThan(0);
        expect(enSegment.text.length).toBeGreaterThan(0);
        expect(csSegment.responseLabel.length).toBeGreaterThan(0);
        expect(enSegment.responseLabel.length).toBeGreaterThan(0);
      }
    }
  });
});
