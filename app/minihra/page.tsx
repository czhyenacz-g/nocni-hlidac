import MiniGameCanvas from "@/components/minigame/MiniGameCanvas";

// Izolovaný prototyp minihry (nouzová obchůzka / boj s monstrem) — NENAPOJENÝ
// na hlavní hru (/play). Žádná herní logika, žádný stav a žádná komponenta
// odsud se s hlavní hrou nesdílí (viz game/minigame/*, components/minigame/*).
export default function MinihraPage() {
  return (
    <main className="relative min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-500">Nouzová obchůzka — prototyp</h1>
          <p className="text-xs text-gray-500 mt-1">WASD / šipky: pohyb · mezerník: výstřel · R: restart</p>
        </div>

        <MiniGameCanvas />
      </div>
    </main>
  );
}
