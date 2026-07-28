# game/multiplayer-survival — izolovaná laboratoř

Tohle je **izolovaný experimentální modul** pro budoucí multiplayer survival
režim Nočního hlídače — nezávislý na ostré hře (`/play`, `EmergencyMiniGame.tsx`,
`/minihra`). Od skutečného WebSocket serveru (`server/`) modul umí i reálný
síťový multiplayer: první veřejně hratelná verze (viz "Veřejná hratelná
verze" níže) — otevři odkaz, klikni na připojení, přežij 5 minut s kamarády,
kteří otevřou stejný odkaz.

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

30 vln, lobby/matchmaking mezi VÍC místnostmi (je jen jedna pevná dev
místnost), persistentní progres/žebříček, ruční combat balancing, smrt
monstra (jen omráčení — viz `applyShotsToMonster`, `engine/tick.ts`).

## Veřejná hratelná verze (round lifecycle)

Od verze se skutečným WebSocket serverem (`server/`) modul umí celé jedno
5minutové survival kolo, ne jen headless pohyb/AI smyčku:

- **Identita hráče = WebSocket připojení**, nikdy klávesa. Server
  (`server/room.ts#joinRoom`) přidělí `playerId` (`"player-<n>"`) podle
  prvního volného slotu (až `MAX_PLAYERS`, viz `engine/config.ts`) a vrátí
  klientovi `token` pro jednoduchý rejoin po refreshi (uložený v
  `localStorage`, viz `server/useMultiplayerSurvivalOnline.ts`). Klient
  nikdy sám neurčuje `playerId` — jen posílá `input` bez identity, server ho
  spáruje se socketem.
- **`MultiplayerSurvivalState.roundStatus`**: `"waiting"` (místnost čeká na
  prvního hráče) → `"playing"` (běží, `remainingMs` počítá dolů) → `"won"`
  (čas doběhl, nikdo nebyl chycen) / `"lost"` (kteréhokoli hráče chytlo
  monstrum — OKAMŽITĚ, ne až když jsou dole všichni). `engine/tick.ts`
  mimo `"playing"` engine vůbec nesimuluje (early-return beze změny).
- **Join během rozehrané hry**: další hráč se přidá do BĚŽÍCÍHO kola na
  bezpečný spawn, časovač se mu neresetuje (`joinRoom` volá
  `startRoundIfWaiting`, což je no-op, když kolo už běží).
- **Disconnect**: hráč se OKAMŽITĚ odebere z `players[]` (monstrum ho pak
  logicky přestane cílit, viz `ai/monsterAi.ts#findNearestAlivePlayer`),
  slot/token zůstává rezervovaný pro rejoin. Když odejdou úplně všichni,
  místnost se vrátí do `"waiting"` (`server/room.ts#resetRoomToWaiting`).
- **Restart**: `restartRound` (vyžádaný `restart_round` socket eventem,
  no-op dokud kolo neskončilo) dá aktuálně připojeným hráčům čerstvý spawn a
  plný časovač, monstrum se vrátí do výchozího stavu. Funguje opakovaně bez
  restartu Node procesu.
- **Barvy hráčů** jsou odvozené stabilně z `playerId` (`"player-3"` → barva
  č. 3), ne z pozice v poli — pozice se mění, jak hráči odcházejí/přibývají,
  ale barva konkrétního hráče musí zůstat stejná po celé kolo (viz
  `rendering/renderCanvas.ts#playerColorIndex`).

## UI

- `app/multiplayer-survival/page.tsx` — **veřejná vstupní stránka**
  (produkční, ne dev): titulek, krátká instrukce, tlačítko "Připojit se do
  hry". WebSocket připojení se zakládá až po kliknutí (mount
  `MultiplayerSurvivalGameView`), ne při načtení stránky.
- `components/multiplayer-survival/MultiplayerSurvivalGameView.tsx` —
  sdílená "připojený hráč hraje" obrazovka (canvas, HUD s časem/počtem
  hráčů/ammo, waiting/won/lost overlay s tlačítkem na nové kolo). Používá ji
  jak veřejná stránka, tak `app/dev/multiplayer-survival-online/page.tsx`
  (ta se liší jen tím, že connectuje OKAMŽITĚ při mountu, pro rychlé lokální
  testování dvou oken).
- Ovládání je STEJNÉ v každém okně: WASD i šipky hýbou vlastní postavou
  tohohle okna, mezerník střílí. `/dev/multiplayer-survival` (jedna
  klávesnice, dva lokální hráči WASD/šipky v JEDNOM okně) zůstává jako
  explicitní debug nástroj, není to produkční ani výchozí režim.

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

## Jak spustit lokálně

Dva nezávislé procesy — Next.js frontend a samostatný WebSocket server
(dlouho běžící Node proces, NENÍ součástí Next.js appky, viz
`server/server.ts`):

```bash
# terminál 1 — WebSocket server (port 4001)
npm run dev:mp-survival-server

# terminál 2 — Next.js frontend (port 3000)
npm run dev
```

Pak otevři:

- `http://localhost:3000/multiplayer-survival` — **veřejná** vstupní
  stránka (produkční UX). Otevři ji ve DVOU oknech (běžné + anonymní, ať
  mají oddělený `localStorage` token), v obou klikni "Připojit se do hry" —
  objeví se dva nezávislí hráči, každý ovládaný jen tím oknem.
- `http://localhost:3000/dev/multiplayer-survival-online` — stejná hra, jen
  connectuje okamžitě (bez landing page) a má viditelný debug text
  (playerId, seq, ping) — rychlejší pro opakované testování.
- `http://localhost:3000/dev/multiplayer-survival` — **offline** sandbox,
  žádný websocket: dva LOKÁLNÍ hráči v jednom okně/klávesnici (hráč 1
  WASD+mezerník, hráč 2 šipky+Enter) + debug toggly (vision cone, kolizní
  zdi, `targetPlayerId`, ...). Zůstává čistě jako debug nástroj.

Ovládání (obě WebSocket route): WASD NEBO šipky pro pohyb (obojí funguje v
každém okně současně), mezerník pro výstřel. Nenapojené na Discord login,
leaderboard ani žádný jiný produkční stav.

### Porty a WebSocket URL

- WebSocket server naslouchá na `MULTIPLAYER_SURVIVAL_WS_PORT` (výchozí
  `4001`), CORS povolené originy přes `MULTIPLAYER_SURVIVAL_CORS_ORIGINS`
  (výchozí `http://localhost:3000,http://localhost:3001`).
- Frontend se k němu připojuje na `NEXT_PUBLIC_MULTIPLAYER_SURVIVAL_WS_URL`
  (výchozí `http://localhost:4001`) — nastav tuhle proměnnou na produkční
  `wss://` URL při nasazení (viz níže).

### Jak dočasně zkrátit kolo pro test

Kolo má natvrdo `ROUND_DURATION_MS = 5 minut` (`engine/config.ts`) —
JEDINÉ místo, které tuhle hodnotu určuje. Pro lokální test nastav před
spuštěním serveru:

```bash
MULTIPLAYER_SURVIVAL_ROUND_MS=30000 npm run dev:mp-survival-server
```

Produkční výchozí hodnota (5 minut) se použije, pokud proměnná není
nastavená — nezapomeň ji nenechat nastavenou při reálném nasazení.

## Budoucí schopnosti monstra (boost) — připraveno, NEZAPOJENO

`engine/monsterBoostConfig.ts` (`getMonsterBoostConfig(roundProgress)`,
`computeRoundProgress(remainingMs, roundDurationMs)`) je čistá konfigurační
funkce pro budoucí asymetrický režim (hráčem ovládané monstrum) — viz
zadání "Budoucí schopnosti hráčem ovládaného monstra". Zatím záměrně
NENÍ zapojená do `ai/monsterAi.ts` ani nikam jinam:

- **Role jsou natvrdo oddělené** — přeživší (`PlayerState.hasShotgun`/
  `ammo`) můžou střílet a sbírat předměty, monstrum ne a nikdy nebude (ani
  hráčem ovládané) — útočí jen kontaktem/schopnostmi. Boost je první taková
  schopnost.
- Boost je **cooldownem omezená aktivace** (`durationMs`/`cooldownMs`), ne
  trvale zvýšená rychlost — na začátku kola slabý a vzácný
  (`speedMultiplier 1.15`, `1s`, cooldown `22s`), na konci silný a častý
  (`1.6×`, `2.5s`, cooldown `6s`), lineárně interpolované podle
  `roundProgress`, aby tlak na přeživší postupně rostl a zabránil pasivnímu
  čekání do konce časovače.
- **Proč se dnes nezapojuje ani do AI monstra**: `tickMonsterAi`
  (`ai/monsterAi.ts`) je tenký wrapper okolo `updateEnemyAi` z produkčního
  `game/minigame/logic.ts` — zavedení cooldownového boostu do AI by
  znamenalo buď zásah do sdílené produkční funkce (riziko pro ostrou
  minihru), nebo duplikaci jejího pohybového/kolizního kódu tady (riziko
  driftu). Pro první veřejnou verzi (jen AI monstrum, žádný player-monster
  režim) to není nutné — konfigurace je hotová a otestovaná
  (`monsterBoostConfig.test.ts`), zapojení počká na skutečný player-monster
  controller, který stejně bude potřebovat vlastní tick smyčku sdílenou s
  AI (viz zadání "budoucí player controller a současný AI controller mají
  používat stejnou mechaniku pohybu/kolizí/boostu, lišit se má jen zdroj
  vstupů").
- Server MUSÍ zůstat autoritativní nad zahájením/délkou/cooldownem/max.
  rychlostí/kolizemi boostu i nad zákazem střelby monstra — klient si
  nesmí sám rozhodnout, že boost běží nebo jakou má rychlost, až se boost
  skutečně zapojí.

## Co bude potřeba pro veřejné nasazení

- WebSocket server (`server/server.ts`) je dlouho běžící Node proces —
  NEBĚŽÍ jako Vercel serverless funkce. Potřebuje vlastní hosting (VPS,
  Fly.io, Railway, Render, ...) s `wss://` (TLS) před sebou, typicky přes
  reverse proxy/load balancer terminující TLS.
- Frontend (Next.js) může zůstat na Vercelu jako dnes — nastav mu
  `NEXT_PUBLIC_MULTIPLAYER_SURVIVAL_WS_URL=wss://<doména-serveru>`.
  `next.config`/`vercel.ts` úpravu nepotřebuje, je to jen env proměnná
  čtená v `app/multiplayer-survival/page.tsx` a
  `app/dev/multiplayer-survival-online/page.tsx`.
- Server potřebuje `MULTIPLAYER_SURVIVAL_CORS_ORIGINS` nastavené na
  skutečnou produkční doménu frontendu (jinak socket.io handshake spadne na
  CORS).
- Žádná databáze/perzistence — místnost žije jen v paměti procesu a zmizí
  při restartu (to je pro první veřejnou verzi záměrně v pořádku, viz
  zadání "nepřidávej zatím složitý systém").
- Konkrétní cloudová platforma pro WebSocket server zatím není zvolená —
  tahle dokumentace záměrně necílí na jednu konkrétní volbu.
