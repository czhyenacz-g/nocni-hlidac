# Diagnostika pohybu monstra + rozšíření DebugPanelu

Datum: 2026-07-05. Čistě diagnostický/nástrojový krok — **žádná herní mechanika se
nezměnila** (viz "Část B" níže pro potvrzení). Zdroj pravdy je vždy aktuální kód
(`game/core/gameReducer.ts`, `game/enemies/basicIntruder.ts`, `game/cameras/cameras.object13.ts`,
`game/difficulty/difficultyConfig.ts`) — tenhle soubor je snímek k datu vzniku, ne
udržovaná dokumentace.

## Část A — Jak to dnes reálně funguje

### 1. Všechny interní `enemyStage`

```
"outside" | "outer_yard" | "right_hallway" | "left_hallway" | "door_hallway" | "at_door" | "breach" | "attack"
```

(`game/core/types.ts`). `"breach"` je připravená pro budoucí trasy — žádná trasa ji dnes
nepoužívá, ale `isAtDoorStage()` na ni reaguje stejně jako na `"at_door"`.

### 2. Aktuální trasa monstra

`BASIC_INTRUDER.routeVariants` (`game/enemies/basicIntruder.ts`) má přesně dvě varianty:

```
["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"]
["outside", "outer_yard", "left_hallway",  "door_hallway", "at_door", "attack"]
```

### 3. Je trasa pevná, nebo může vést přes levou/pravou chodbu?

Žádná trasa nemá obě chodby zároveň — je to buď/anebo. Jedna ze dvou variant se vylosuje
**jednou** při startu směny a platí po celou její dobu (`state.enemyRoute` se dál nemění).

### 4. Jak se vybírá levá/pravá větev

`game/core/gameState.ts#pickRouteVariant`:

```ts
function pickRouteVariant(night: NightDefinition): EnemyStage[] {
  const variants = night.enemy.routeVariants;
  return variants[Math.floor(Math.random() * variants.length)];
}
```

Prostý `Math.random()` index do pole dvou variant — 50/50, žádná váha, žádná závislost na
noci/difficulty/night scalingu. Volá se z `createInitialGameState`, tedy při `START_SHIFT`/
`RESTART_SHIFT`/`START_LOADING`/`GO_TO_MENU` (všechny volají `createInitialGameState`).

### 5. Co znamená "monstrum není vidět na aktuální kameře"

Dvě různé věci se dnes odlišují (přesná místa v `gameReducer.ts`):

- **`isEnemyBeingWatched(state, night)`** (řídí zpomalení postupu přes
  `watchedAdvanceMultiplier` v `ENEMY_ADVANCE`, a taky `applyPowerDelta`'s "sleduje kamery"
  větev nepřímo přes `state.cameraOpen`): `playerView === "desk" && cameraOpen &&
  activeCameraId` musí být pravda, **a navíc** `camera.enemyVisibleAtStage === enemyStage`.
  Selže jak "nesleduje žádnou kameru v detailu", tak "sleduje kameru, ale monstrum je jinde".
- Čistě **"je monstrum na téhle kameře, kdybys ji otevřel"** (`camera.enemyVisibleAtStage
  === enemyStage`) je oddělená, jednodušší podmínka bez ohledu na to, jestli hráč zrovna
  kouká na dveře/generátor/overview. Dřív se to počítalo ad-hoc v `OPEN_CAMERA`
  (`monsterRetreatVerified` výpočet) a v `app/play/page.tsx` (`nearestCamera` heartbeat
  surprise) — teď existuje i jako `buildEnemyDebugInfo(...).visibleOnActiveCamera` (viz
  Část B), čistě pro zobrazení, beze změny chování.

### 6. Může být monstrum interně na lokaci bez viditelné kamery?

Ano. `CameraDefinition.enemyVisibleAtStage` (`game/cameras/cameras.object13.ts`) pokrývá jen
`outer_yard` / `right_hallway` / `left_hallway` / `door_hallway`. Stage `"outside"`,
`"at_door"`, `"breach"` a `"attack"` **nemají žádnou kameru** — `"outside"` je "ještě se
blíží, mimo dohled", `"at_door"`/`"breach"` je doména `DoorView` (ne kamera), `"attack"` je
finální stage při útoku. Na žádné z nich `isEnemyBeingWatched`/`visibleOnActiveCamera` nikdy
nemůže vrátit `true`, ať je vybraná jakákoliv kamera.

### 7. Co se stane, když monstrum čeká u zavřených dveří a "vzdá to"

`ENEMY_ADVANCE`, větev `atDoorStage && state.doorClosed`: `enemyDoorHoldProgressMs` roste o
`night.enemyTickMs` každý tik, dokud nedosáhne náhodně vylosovaného cíle
(`rollDoorHoldTargetMs` → `enemy.doorHoldRangeMs`, u `basicIntruder` 6–8 s). Jakmile
`progress >= target`:

```ts
const retreatedTo = pickMonsterRetreatLocation(route);
```

### 8. Kam přesně se nastaví jeho stage při retreatu

`pickMonsterRetreatLocation(route)` (`gameReducer.ts`) vybere náhodně z
`["outer_yard", "left_hallway", "right_hallway"]` **filtrovaných na to, co skutečně je v
aktivní `route`** (takže nikdy `left_hallway`, pokud běží pravá varianta, a naopak). Pokud by
náhodou žádný kandidát v trase nebyl (nemělo by nastat, `outer_yard` je v obou variantách),
fallback je `"outside"`. `enemyStage` i `monsterRetreatedTo` se nastaví na stejnou hodnotu.

Tohle platí **jen** pro tenhle "vzdal se čekáním" mechanismus. Samostatný, rychlejší
mechanismus — door-light repel (zavřené dveře + rozsvícené světlo + u dveří ≥ 1.5 s,
`updateDoorLightRepel`) — posílá monstrum vždy na pevné `enemy.monsterRetreatStage`
(`"outside"` u `basicIntruder`), **ne** přes `pickMonsterRetreatLocation`. Tenhle druhý
mechanismus taky nenastavuje `monsterRetreatedTo`/`monsterRetreatVerified` vůbec — obchází
celý "musíš ověřit kamerou" systém, protože je to jasně čitelný, okamžitý efekt (řev +
okamžitý ústup), ne tichý odchod.

### 9. Jak se ukládá/pozná, že hráč ho musí znovu ověřit kamerou

Dvě pole v `GameState`: `monsterRetreatedTo: EnemyStage | null` (kam odešlo) a
`monsterRetreatVerified: boolean` (jestli to hráč potvrdil kamerou). Nastavují se spolu v
"gave_up" větvi výše: `monsterRetreatVerified: !rules.monster_check_or_return` — na `easy`
(pravidlo vypnuté) je to hned `true` (žádné ověřování), na `medium`/`hard` `false`.

Potvrzení přichází v `OPEN_CAMERA`:

```ts
const monsterRetreatVerified =
  state.monsterRetreatedTo !== null && camera?.enemyVisibleAtStage === state.enemyStage
    ? true
    : state.monsterRetreatVerified;
```

Tzn. hráč musí otevřít **detail** té kamery, na které je `enemyStage` (== `monsterRetreatedTo`,
dokud se nehne) skutečně vidět. Jakmile jednou nastane, `monsterRetreatVerified` zůstává
`true`, dokud ho něco explicitně nevynuluje (viz níže).

### 10. Co se stane, když hráč otevře dveře před ověřením

`TOGGLE_DOOR`, otevírání (ne zavírání), podmínka:

```ts
if (state.doorClosed && rules.monster_check_or_return && state.monsterRetreatedTo !== null && !state.monsterRetreatVerified) {
  return {
    ...state,
    doorClosed: false,
    enemyStage: "at_door",
    lastEnemyDecision: "returned_unverified",
    enemyAtDoorSinceMs: state.elapsedMs,
    ...
    monsterRetreatedTo: null,
    monsterRetreatVerified: false,
  };
}
```

Dveře se otevřou (žádná blokace kliku), ale monstrum se **okamžitě** teleportuje zpátky na
`"at_door"` — trest, ne smrt. `monsterRetreatedTo`/`monsterRetreatVerified` se vynulují, celý
"gave_up" cyklus může začít znovu od začátku. Na `easy` (`monster_check_or_return` vypnuté)
tahle větev se nikdy nespustí — `monsterRetreatVerified` je vždy `true` od chvíle, kdy monstrum
odešlo, takže běžné otevření dveří proběhne normálně (druhá `return` větev v `TOGGLE_DOOR`,
která navíc i tak vždy vynuluje `monsterRetreatedTo`/`monsterRetreatVerified` na `null`/`false`
pro příští standoff).

### 11. Rozdíly, které kód dnes skutečně rozlišuje

| Situace | Jak se to dnes pozná |
|---|---|
| Monstrum fyzicky není na žádné kameře | `enemyStage` je `outside`/`at_door`/`breach`/`attack` — žádný `CameraDefinition.enemyVisibleAtStage` mu neodpovídá |
| Monstrum je na jiné kameře než ta, na kterou se hráč dívá | `activeCameraId` nastavené, ale `camera.enemyVisibleAtStage !== enemyStage` |
| Monstrum je na "téhle" kameře, ale nezobrazené | **Nenastává** — `cameraOpen`/`activeCameraId` jsou vždy oba nastavené (detail) nebo oba `null`/`false` (overview); overview nikdy nedrží "vybranou, ale nezobrazenou" kameru |
| Monstrum ve stavu retreat/return/waiting | `lastEnemyDecision` (`"waiting_at_door" \| "gave_up" \| "light_repelled" \| "returned_unverified" \| ...`) + `monsterRetreatedTo`/`monsterRetreatVerified` pro retreat/verification specificky |

---

## Část B — Co bylo přidáno do DebugPanelu

**Žádná herní logika se neměnila** — jen nový diagnostický selector a rozšířený výpis.

### Nový soubor: `game/core/enemyDebugInfo.ts`

`buildEnemyDebugInfo(state, night, difficulty): EnemyDebugInfo` — čistá funkce, nic nemutuje,
jen odvozuje z existujícího `GameState`/`NightDefinition`/`Difficulty`:

| Pole | Odkud se bere |
|---|---|
| `stage`, `lastDecision` | přímo `state.enemyStage` / `state.lastEnemyDecision` |
| `route` | přímo `state.enemyRoute` |
| `routeBranch` | **odvozené** — `route.includes("left_hallway")`/`"right_hallway"`, nikde uložené jako pole |
| `activeCameraId`, `cameraViewMode`, `doorClosed`, `lightOn` | přímo ze `state` |
| `visibleOnActiveCamera` | **odvozené** — stejná podmínka jako uvnitř `isEnemyBeingWatched`/`OPEN_CAMERA`, ne uložená |
| `isBeingWatched` | **odvozené** — reimplementace `isEnemyBeingWatched(state, night)` (ta funkce sama není z `gameReducer.ts` exportovaná, takže šlo buď ji exportovat, nebo napsat identickou podmínku tady — zvoleno druhé, ať se `gameReducer.ts` vůbec nemusel měnit) |
| `difficulty`, `monsterCheckOrReturnActive` | z `DIFFICULTY_RULES[difficulty]` — **viz důležitá poznámka níže** |
| `verificationRequired` | **odvozené** — `rules.monster_check_or_return && monsterRetreatedTo !== null && !monsterRetreatVerified` |
| `verificationCameraId` | **odvozené** — hledá kameru, jejíž `enemyVisibleAtStage === monsterRetreatedTo`; dřív se tahle kamera nikde nedopočítávala, hráč/dev si ji musel odvodit sám |
| `openingDoorWouldReturnMonster` | **odvozené** — stejná podmínka jako trestná větev v `TOGGLE_DOOR` |

**Důležitá poznámka k `difficulty`**: `GameState` obtížnost vůbec neobsahuje —
`createGameReducer(night, difficulty)` si ji drží jen ve své uzávěře. `app/play/page.tsx`
dnes volá `createGameReducer(night)` **bez** druhého argumentu, takže reálně běžící
obtížnost je vždy `DEFAULT_DIFFICULTY` (`"medium"`). `DebugPanel.tsx` proto importuje
`DEFAULT_DIFFICULTY` přímo — je to přesné, dokud existuje jen jedna reálně používaná
obtížnost, ale až přibude výběr obtížnosti za běhu, tenhle řádek bude potřeba nahradit
skutečnou hodnotou protaženou jako prop.

### Úprava `components/game/DebugPanel.tsx`

Přidána sekce "Monster debug:" (nahrazuje a rozšiřuje dřívější samostatné řádky
`enemyStage`/`monsterRetreat`/`kamera-detekce`, teď sjednocené na jedno místo):

```
Stage: <enemyStage> (<lastDecision>)
Route: outside → outer_yard → right_hallway → door_hallway → at_door → attack
Branch: right
Active camera: <cameraId | —> (<overview|detail>)
Visible on current camera: yes/no
Being watched: yes/no
Difficulty: medium (monster_check_or_return: active/off)
Retreat target: <stage> (camera: <cameraId|none>)      ← jen když monsterRetreatedTo !== null
Verification required: yes/no
Verification camera: <cameraId|—>                       ← jen když verification required
Opening door consequence: safe / monster returns to door (unverified)
```

### Soubory změněné

- `game/core/enemyDebugInfo.ts` (nový)
- `components/game/DebugPanel.tsx` (rozšířený výpis, žádná herní logika)

### Výsledek

```
npx tsc --noEmit   → OK
npx vitest run     → 8 test files, 57 testů, všechny prošly (beze změny počtu — žádné testy
                      nebyly potřeba/přidány, protože se nezměnilo žádné herní chování)
npm run build      → OK
```
