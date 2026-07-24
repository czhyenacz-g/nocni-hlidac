import { describe, expect, it } from "vitest";
import { resolveTitanDoorOverrideSrc, ResolveTitanDoorOverrideSrcInput } from "./titanDoorOverride";
import { TITAN_AT_DOOR_SRC, TITAN_ATTACK_SRC, TITAN_BREACH_SRC, TITAN_OVERLOAD_DEATH_SRC } from "./titanDoorAssets";

// Regresní testy pro "3. Priorita zobrazení" a "2. Poslední obrázek mrtvého
// Titana" (viz zadání) — vyňato z DoorView.tsx, viz komentář v
// titanDoorOverride.ts.

function baseInput(overrides: Partial<ResolveTitanDoorOverrideSrcInput> = {}): ResolveTitanDoorOverrideSrcInput {
  return {
    isDoorDeathReveal: false,
    isTitanAttack: false,
    isTitanGraveyard: false,
    doorGeneratorOverloadActive: false,
    titanOverloadFrameSrc: null,
    doorDestroyed: false,
    doorMonsterOverlay: null,
    ...overrides,
  };
}

describe("resolveTitanDoorOverrideSrc — doorDeathReveal has the highest priority", () => {
  it("doorDeathReveal + isTitanAttack -> TITAN_ATTACK_SRC, regardless of anything else", () => {
    const result = resolveTitanDoorOverrideSrc(
      baseInput({ isDoorDeathReveal: true, isTitanAttack: true, isTitanGraveyard: true, doorGeneratorOverloadActive: true }),
    );
    expect(result).toBe(TITAN_ATTACK_SRC);
  });

  it("doorDeathReveal without isTitanAttack -> null (Imp's own deathReveal frame applies instead, unaffected here)", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ isDoorDeathReveal: true, isTitanAttack: false }))).toBeNull();
  });
});

describe("resolveTitanDoorOverrideSrc — isTitanGraveyard is the permanent 'Titan killed this night' image", () => {
  it("shows TITAN_OVERLOAD_DEATH_SRC while graveyarded, even with no active overload/banner", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ isTitanGraveyard: true }))).toBe(TITAN_OVERLOAD_DEATH_SRC);
  });

  // Bug fix regression (viz zadání "2. Poslední obrázek mrtvého Titana") —
  // dřív se poslední obrázek řídil VÝHRADNĚ dočasným
  // `isTitanOverloadDeathReveal` (3s okno) a po jeho vypršení spadl zpátky
  // na generickou zničenou scénu. `isTitanGraveyard` (permanentní,
  // enemyStage === "graveyard") teď drží obrázek navždy, i "po zmizení
  // gratulačního oznámení" (které tenhle test simuluje tím, že vůbec
  // nedostává `isTitanOverloadDeathReveal` jako vstup — ta komponenta ho
  // řídí čistě přes banner, ne přes obrázek).
  it("still shows TITAN_OVERLOAD_DEATH_SRC even though doorDestroyed is also true (the generic destroyed frame must NOT win)", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ isTitanGraveyard: true, doorDestroyed: true }))).toBe(
      TITAN_OVERLOAD_DEATH_SRC,
    );
  });

  it("takes priority over a (theoretically impossible, but defensively ordered) still-active overload countdown", () => {
    expect(
      resolveTitanDoorOverrideSrc(
        baseInput({ isTitanGraveyard: true, doorGeneratorOverloadActive: true, titanOverloadFrameSrc: "some-frame.webp" }),
      ),
    ).toBe(TITAN_OVERLOAD_DEATH_SRC);
  });

  it("takes priority over a (theoretically impossible) at_door/breach overlay", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ isTitanGraveyard: true, doorMonsterOverlay: "titan_breach" }))).toBe(
      TITAN_OVERLOAD_DEATH_SRC,
    );
  });
});

describe("resolveTitanDoorOverrideSrc — the in-progress overload countdown sequence", () => {
  it("shows the countdown frame passed in via titanOverloadFrameSrc while active", () => {
    expect(
      resolveTitanDoorOverrideSrc(baseInput({ doorGeneratorOverloadActive: true, titanOverloadFrameSrc: "overdrive_0.webp" })),
    ).toBe("overdrive_0.webp");
  });

  it("returns null (falls back to the generic overload frame) if Titan isn't at the door (titanOverloadFrameSrc is null)", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ doorGeneratorOverloadActive: true, titanOverloadFrameSrc: null }))).toBeNull();
  });

  it("does NOT show the countdown frame once doorDestroyed but overload no longer active and Titan not graveyarded (Imp overload regression)", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ doorDestroyed: true }))).toBeNull();
  });
});

describe("resolveTitanDoorOverrideSrc — at_door/breach overlay, only when the door isn't already destroyed", () => {
  it("titan_breach overlay -> TITAN_BREACH_SRC", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ doorMonsterOverlay: "titan_breach" }))).toBe(TITAN_BREACH_SRC);
  });

  it("titan_at_door overlay -> TITAN_AT_DOOR_SRC", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ doorMonsterOverlay: "titan_at_door" }))).toBe(TITAN_AT_DOOR_SRC);
  });

  it("imp_at_door overlay -> null (Imp's own generic frame index handles it, not this function)", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ doorMonsterOverlay: "imp_at_door" }))).toBeNull();
  });

  it("doorDestroyed suppresses the overlay (door is gone, no at_door/breach picture makes sense)", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput({ doorMonsterOverlay: "titan_breach", doorDestroyed: true }))).toBeNull();
  });
});

describe("resolveTitanDoorOverrideSrc — no override at all outside any of the above", () => {
  it("all flags false/null -> null (generic door scene applies)", () => {
    expect(resolveTitanDoorOverrideSrc(baseInput())).toBeNull();
  });
});
