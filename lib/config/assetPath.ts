/**
 * itch.io hostuje statický export hry z neznámé (a při každém novém uploadu jiné)
 * podsložky domény (`html-classic.itch.zone/html/<id>/...`), takže kořenově
 * absolutní cesty (`/object_13/...`) na assety se tam vždy resolvnou od kořene
 * CELÉ domény, ne od složky s hrou — viz `scripts/export-game.mjs` (`assetPrefix:
 * "."` řeší jen Next.js `_next/...` chunky, ne vlastní `public/` assety). Export
 * skript nastavuje `NEXT_PUBLIC_GAME_CLIENT=itch` jen pro tenhle build (viz
 * `gameClientForTarget`), takže je to spolehlivý build-time signál — na
 * normálním webu (`nocni-hlidac.cz`, kořen domény) zůstává absolutní cesta
 * beze změny.
 */
export function assetPath(path: string): string {
  if (process.env.NEXT_PUBLIC_GAME_CLIENT === "itch" && path.startsWith("/")) {
    return `.${path}`;
  }
  return path;
}
