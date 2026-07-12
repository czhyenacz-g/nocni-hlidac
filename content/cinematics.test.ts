import { describe, expect, it } from "vitest";
import { CINEMATIC_SCENES, getCinematicScene } from "./cinematics";

describe("cinematics config", () => {
  it("contains old_guard_first_death_warning", () => {
    expect(CINEMATIC_SCENES.old_guard_first_death_warning).toBeDefined();
  });

  it("old_guard_first_death_warning has an imageSrc", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.imageSrc).toBe("/object_13/story/story_1.webp");
  });

  it("old_guard_first_death_warning has 13 segments", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments).toHaveLength(13);
  });

  it("the first segment is 'Baf.'", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments[0].text).toBe("Baf.");
  });

  it("the last segment's responseLabel is 'Zpátky ke stolu.'", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.at(-1)?.responseLabel).toBe("Zpátky ke stolu.");
  });

  it("includes the technician introduction line", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.some((segment) => segment.text === "Jsem místní technik. Máš kliku, že jsem to já.")).toBe(
      true,
    );
  });

  it("every segment has a responseLabel", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.every((segment) => Boolean(segment.responseLabel))).toBe(true);
  });

  it("every segment has an audioSrc pointing into public/object_13/story/segments/", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.every((segment) => segment.audioSrc?.startsWith("/object_13/story/segments/story_1_"))).toBe(
      true,
    );
  });

  it("each segment's audioSrc filename matches its id", () => {
    const scene = getCinematicScene("old_guard_first_death_warning");
    expect(scene?.segments.every((segment) => segment.audioSrc === `/object_13/story/segments/story_1_${segment.id}.m4a`)).toBe(
      true,
    );
  });

  it("getCinematicScene returns the exact same data as CINEMATIC_SCENES", () => {
    expect(getCinematicScene("old_guard_first_death_warning")).toEqual(
      CINEMATIC_SCENES.old_guard_first_death_warning,
    );
  });
});

describe("think_it_over_warning cinematic", () => {
  it("has an imageSrc pointing at the converted webp", () => {
    const scene = getCinematicScene("think_it_over_warning");
    expect(scene?.imageSrc).toBe("/object_13/story/think_it_over_warning.webp");
  });

  it("the first segment is 'Nedělej to!'", () => {
    const scene = getCinematicScene("think_it_over_warning");
    expect(scene?.segments[0].text).toBe("Nedělej to!");
  });

  it("the last segment mentions ten hits and its responseLabel is 'Zpátky ke stolu a vrhnout se do boje.'", () => {
    const scene = getCinematicScene("think_it_over_warning");
    const last = scene?.segments.at(-1);
    expect(last?.text).toContain("DESETKRÁT");
    expect(last?.responseLabel).toBe("Zpátky ke stolu a vrhnout se do boje.");
  });

  it("every segment has a responseLabel (no audioSrc required — no narration recorded)", () => {
    const scene = getCinematicScene("think_it_over_warning");
    expect(scene?.segments.every((segment) => Boolean(segment.responseLabel))).toBe(true);
    expect(scene?.segments.every((segment) => segment.audioSrc === undefined)).toBe(true);
  });
});

describe("valhala_ending cinematic", () => {
  it("uses the exact wallhala_ending.png asset, unrenamed", () => {
    const scene = getCinematicScene("valhala_ending");
    expect(scene?.imageSrc).toBe("/object_13/story/wallhala_ending.png");
  });

  it("has the UI title VALHALA", () => {
    const scene = getCinematicScene("valhala_ending");
    expect(scene?.title).toBe("VALHALA");
  });

  it("the first segment is 'Ticho.'", () => {
    const scene = getCinematicScene("valhala_ending");
    expect(scene?.segments[0].text).toBe("Ticho.");
  });

  it("includes the thirty-night-or-valhalla line", () => {
    const scene = getCinematicScene("valhala_ending");
    expect(
      scene?.segments.some((segment) => segment.text.includes("třicátou noc") && segment.text.includes("Valhale")),
    ).toBe(true);
  });

  it("the last segment's responseLabel is 'Napiju se.'", () => {
    const scene = getCinematicScene("valhala_ending");
    expect(scene?.segments.at(-1)?.responseLabel).toBe("Napiju se.");
  });

  it("every segment has a responseLabel", () => {
    const scene = getCinematicScene("valhala_ending");
    expect(scene?.segments.every((segment) => Boolean(segment.responseLabel))).toBe(true);
  });

  it("the three Hynek quote segments have audioSrc pointing into public/object_13/story/segments/", () => {
    const scene = getCinematicScene("valhala_ending");
    const withAudio = scene?.segments.filter((segment) => segment.audioSrc !== undefined) ?? [];
    expect(withAudio).toHaveLength(3);
    expect(withAudio.every((segment) => segment.audioSrc?.startsWith("/object_13/story/segments/valhala_"))).toBe(true);
  });
});

describe("warrior_ending cinematic", () => {
  it("uses the exact warior_ending.png asset, unrenamed", () => {
    const scene = getCinematicScene("warrior_ending");
    expect(scene?.imageSrc).toBe("/object_13/story/warior_ending.png");
  });

  it("has the UI title POSLEDNÍ SMĚNA", () => {
    const scene = getCinematicScene("warrior_ending");
    expect(scene?.title).toBe("POSLEDNÍ SMĚNA");
  });

  it("the first segment is 'Třicátý den.'", () => {
    const scene = getCinematicScene("warrior_ending");
    expect(scene?.segments[0].text).toBe("Třicátý den.");
  });

  it("includes the 'you became a warrior' line", () => {
    const scene = getCinematicScene("warrior_ending");
    expect(scene?.segments.some((segment) => segment.text.includes("válečník"))).toBe(true);
  });

  it("every segment has a responseLabel", () => {
    const scene = getCinematicScene("warrior_ending");
    expect(scene?.segments.every((segment) => Boolean(segment.responseLabel))).toBe(true);
  });

  it("the eleven Hynek quote segments have audioSrc pointing into public/object_13/story/segments/", () => {
    const scene = getCinematicScene("warrior_ending");
    const withAudio = scene?.segments.filter((segment) => segment.audioSrc !== undefined) ?? [];
    expect(withAudio).toHaveLength(11);
    expect(
      withAudio.every((segment) => segment.audioSrc?.startsWith("/object_13/story/segments/posledni_smena_")),
    ).toBe(true);
  });
});

describe("no_kill_ending cinematic", () => {
  it("uses the exact no_kill_ending.png asset", () => {
    const scene = getCinematicScene("no_kill_ending");
    expect(scene?.imageSrc).toBe("/object_13/story/no_kill_ending.png");
  });

  it("has the UI title PRVNÍ VÝPLATA", () => {
    const scene = getCinematicScene("no_kill_ending");
    expect(scene?.title).toBe("PRVNÍ VÝPLATA");
  });

  it("the first segment is 'Třicátý den.'", () => {
    const scene = getCinematicScene("no_kill_ending");
    expect(scene?.segments[0].text).toBe("Třicátý den.");
  });

  it("the last segment's responseLabel is 'Zpátky ke stolu.'", () => {
    const scene = getCinematicScene("no_kill_ending");
    expect(scene?.segments.at(-1)?.responseLabel).toBe("Zpátky ke stolu.");
  });

  it("every segment has a responseLabel", () => {
    const scene = getCinematicScene("no_kill_ending");
    expect(scene?.segments.every((segment) => Boolean(segment.responseLabel))).toBe(true);
  });

  it("the three Hynek quote segments have audioSrc pointing into public/object_13/story/segments/", () => {
    const scene = getCinematicScene("no_kill_ending");
    const withAudio = scene?.segments.filter((segment) => segment.audioSrc !== undefined) ?? [];
    expect(withAudio).toHaveLength(3);
    expect(
      withAudio.every((segment) => segment.audioSrc?.startsWith("/object_13/story/segments/prvni_vyplata_")),
    ).toBe(true);
  });
});

// Volitelné "intro" cinematic (viz zadání "Spustit intro" na BriefingScreen
// Noci 1 i na /terms, components/screens/TermsScreen.tsx) — jedna společná
// definice, žádná duplikovaná kopie textu/komponenty.
describe("cinematics config — intro", () => {
  it("has the id 'intro'", () => {
    const scene = getCinematicScene("intro");
    expect(scene?.id).toBe("intro");
  });

  it("uses /object_13/story/intro_bg.webp as its background", () => {
    const scene = getCinematicScene("intro");
    expect(scene?.imageSrc).toBe("/object_13/story/intro_bg.webp");
  });

  it("has the UI title PRACOVNÍ POHOVOR", () => {
    const scene = getCinematicScene("intro");
    expect(scene?.title).toBe("PRACOVNÍ POHOVOR");
  });

  it("has all 10 segments in the exact required order", () => {
    const scene = getCinematicScene("intro");
    const texts = scene?.segments.map((segment) => segment.text) ?? [];
    expect(texts).toEqual([
      "Dobrý den. Děkujeme, že jste přišel.",
      "Váš profil odpovídá tomu, co hledáme. Posledních dvacet let jste pracoval jako noční hlídač v místní chemičce, než závod uzavřeli.",
      "Za celou dobu na vás nebyla jediná vážná stížnost. Jste spolehlivý, dochvilný a zvyklý pracovat v noci.",
      "Také vidím, že nemáte děti ani blízké příbuzné, kteří by na vás byli závislí. Pro tuto pozici je to výhoda.",
      "Ráda vám oznamuji, že jste přijat.",
      "Půjde o hlídání na velmi speciálním místě. A speciální místo samozřejmě znamená i speciální odměny.",
      "Práce je nadstandardně placená a při dobrých výsledcích můžete získat mimořádné bonusy. Současně vás ale musím upozornit, že pozice je spojena s určitým rizikem.",
      "Vaším úkolem bude sledovat kamery, kontrolovat vybavení a řídit se služebními postupy.",
      "Pokud budete dodržovat pokyny, neměl by nastat žádný problém. Vítejte v Objektu 13.",
      "P.S.: Výplata je standardně každých 30 dní.",
    ]);
  });

  it("every segment has a responseLabel (all clickable through to completion)", () => {
    const scene = getCinematicScene("intro");
    expect(scene?.segments.every((segment) => Boolean(segment.responseLabel))).toBe(true);
  });

  it("has no audioSrc on any segment (no audio requested for this cinematic)", () => {
    const scene = getCinematicScene("intro");
    expect(scene?.segments.every((segment) => segment.audioSrc === undefined)).toBe(true);
  });
});
