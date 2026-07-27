# game/multiplayer-survival — izolovaná laboratoř

Tohle je **izolovaný experimentální modul** pro budoucí multiplayer survival
režim Nočního hlídače. Necílí na síť ani skutečný multiplayer — cílem téhle
směny bylo jen vytvořit bezpečný, spustitelný základ, který lze dál rozvíjet
nezávisle na ostré hře.

## Proč je dočasná duplicita záměrná

Produkční `components/minigame/EmergencyMiniGame.tsx` a `game/minigame/*`
jsou postavené na jednom hráči a jednom monstru (žádné `players[]`/
`monsters[]` pole, `EmergencyMiniGameInput`/`Result` jsou svázané s
jednohráčovým průběhem výpravy). Přepisovat tenhle produkční kód kvůli
multiplayer prototypu by riskovalo rozbití ostré hry a `/minihra` — proto
tenhle modul žije úplně vedle, s vlastním datovým modelem
(`players: PlayerState[]`, `monsters: MonsterState[]`) od prvního dne, i
když prototyp zatím vykresluje jen jednoho hráče a jedno monstrum.

**`components/minigame/EmergencyMiniGame.tsx`, `game/minigame/*` (kromě
importů popsaných níže), `app/minihra/page.tsx` a ostrá herní route
(`app/play/page.tsx`, `GameScreen.tsx`) se touhle prací NEMĚNÍ.**

## Co se importuje z původní minihry (beze změny)

Čistá geometrie/kolize/AI, přímo z `game/minigame/logic.ts` a
`game/minigame/types.ts` — žádná kopie, žádná duplikace chování:

- `moveWithWallSliding`, `circlesTouch`, `isEnemyHit`, `directionFromVector`,
  `tickEnemyStun`, `distance`, `updateEnemyAi` (`game/multiplayer-survival/ai/monsterAi.ts`,
  `game/multiplayer-survival/engine/tick.ts`)
- typy `Wall`, `Vec2`, `Direction`, `Enemy`, `EnemyAiConfig` (`game/multiplayer-survival/state/types.ts`,
  `game/multiplayer-survival/engine/config.ts`) — `MonsterState` je `Enemy`
  + `id`, žádná duplikace polí.

`updateEnemyAi` je jednohráčová (bere jednoho `player: {x,y}`) —
`ai/monsterAi.ts` kolem ní jen přidává výběr nejbližšího živého hráče z
`players[]`, samotnou AI logiku nepředělává.

## Co bylo zkopírováno (fork) a proč

- `engine/config.ts` — konstanty (rychlosti, dosahy, `EnemyAiConfig`)
  zkopírované z `game/minigame/config.ts` v čase založení modulu. Ten
  soubor mísí obecné fyzikální konstanty s jednohráčovými defaulty
  (equipment, mission timing) — import celého souboru by sem vtáhl i věci,
  co s multiplayer prototypem nesouvisí.

  ```ts
  // Temporary fork from game/minigame/config.ts for multiplayer-survival
  // experimentation. Do not synchronize automatically without explicit review.
  ```

- `Enemy.enraged` one-shot vzor — stejná strukturální konvence jako v
  `game/minigame/types.ts` (jednou `true`, nikdy zpět na `false` mimo
  vytvoření entity). Nekopíruje se žádný kód, jen se replikuje stejné
  pravidlo přes sdílený `Enemy` typ.

## Co modul (zatím) NEDĚLÁ

Žádné websockety, místnosti, reconnect, snapshoty, víc než jedno
monstrum/hráč v prototypu (i když to datový model unese), 30 vln, pickupy,
munice, žárovky, matchmaking, persistentní progres. Jedna pevná mapa
(`maps/prototypeMap.ts`), neomezená munice, jeden typ monstra.

## Struktura

```
game/multiplayer-survival/
  state/types.ts       — PlayerState/MonsterState/MultiplayerSurvivalState (players[]/monsters[] od začátku)
  engine/config.ts      — forknuté konstanty (viz výše)
  engine/tick.ts         — headless tickMultiplayerSurvival(state, inputs, deltaMs), žádné React/DOM
  ai/monsterAi.ts        — multi-entity wrapper okolo updateEnemyAi
  maps/prototypeMap.ts   — jediná pevná mapa
  rendering/renderCanvas.ts — jediné místo, co zná CanvasRenderingContext2D
  debug/keyboardInput.ts — čisté mapování kláves na pohybový vektor
  index.ts                — veřejné rozhraní modulu
```

Engine (`engine/`, `ai/`, `maps/`, `state/`) neimportuje React, nezná route
ani websocket, a jde spustit v testu bez DOM (viz `engine/tick.test.ts`).
React vrstva (`app/dev/multiplayer-survival/page.tsx`) jen drží stav, sbírá
vstup a volá `tickMultiplayerSurvival` + `renderMultiplayerSurvival`.

## Jak spustit

```
npm run dev
# otevři http://localhost:3000/dev/multiplayer-survival
```

WASD/šipky pro pohyb, mezerník pro výstřel. Nenapojené na Discord login,
leaderboard ani žádný jiný produkční stav.

## Další krok (doporučeno)

Až prototyp ověří základní smyčku (pohyb, AI, zásah, enraged), přidat
druhého hráče/monstra do dev route (datový model to už unese) — teprve
POTOM řešit sjednocení s `game/minigame/*`, pokud se ukáže, že dává smysl.
Žádné sjednocování zatím neproběhlo a `EmergencyMiniGame.tsx` se na tenhle
modul nepřepojuje.
