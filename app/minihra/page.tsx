import MiniGameCanvas from "@/components/minigame/MiniGameCanvas";

// Izolovaný prototyp minihry (nouzová obchůzka / boj s monstrem) — NENAPOJENÝ
// na hlavní hru (/play). Žádná herní logika, žádný stav a žádná komponenta
// odsud se s hlavní hrou nesdílí (viz game/minigame/*, components/minigame/*).
// Vizuál: zelený taktický radar/stealth HUD (inspirace, ne kopie konkrétního
// loga/assetu/layoutu) — tmavě zelenočerné pozadí, monospace, jemný glow.
export default function MinihraPage() {
  return (
    <main
      className="relative min-h-screen p-4 flex flex-col items-center"
      style={{ background: "#020a05", color: "#7cffb2", fontFamily: "'Courier New', monospace" }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <div className="text-center">
          <h1
            className="text-xl font-bold tracking-wide"
            style={{ color: "#5dffa0", textShadow: "0 0 8px rgba(93,255,160,0.65)" }}
          >
            Nouzová obchůzka — prototyp
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "#4c8a6a" }}>
            WASD / šipky: pohyb · mezerník: výstřel · R: restart
          </p>
        </div>

        <MiniGameCanvas />
      </div>
    </main>
  );
}
