# Audio Design

## Proč je zvuk důležitý

Pro klaustrofobickou lekací hru je zvuk minimálně stejně důležitý jako obraz — napětí se
staví hlavně ambientní atmosférou a náhlými zvukovými akcenty, ne jen vizuálem. Proto má
audio od první verze vlastní samostatnou vrstvu (`game/audio/`), ne jen náhodné `<audio>`
tagy rozházené po komponentách.

## Seznam zvuků pro MVP

Definováno v `game/audio/audioEvents.ts` a nakonfigurováno v `game/audio/audioConfig.ts`:

- `ambience_loop` — tiché pozadí, hraje smyčkou po celou dobu směny
- `heartbeat` — zvuk překvapení (tlukot srdce, ne generický šum): hraje jen když je
  nepřítel zrovna na kameře nejblíž hráči, a jen jednou za tuto "návštěvu" (viz
  "Zvukové události" níže). Zatím jen syntetizovaný fallback (dvě nízké "lub-dub"
  noty), žádný reálný soubor.
- `heartbeat_stress_slow` / `heartbeat_stress_fast` — nekonečné loopy pro průběžnou
  stres vrstvu (viz `GAME_DESIGN.md` "Stres a heartbeat", `TECH_DESIGN.md`
  `game/audio/useHeartbeatStress.ts`), na rozdíl od `heartbeat` výše nejsou
  jednorázové leknutí, ale plynulý podklad, jehož hlasitost/crossfade se řídí
  aktuální hladinou stresu. Skutečné soubory (`heartbeat_slow_reverb.mp3` /
  `heartbeat_fast_reverb.mp3`, CC0, OpenGameArt.org).
- `door_close` / `door_open` — cvaknutí dveří
- `light_click` — cvaknutí světla
- `enemy_step` — kroky/pohyb nepřítele na trase
- `enemy_near` — nepřítel je blízko (u dveří)
- `power_low` — varování při nízké energii
- `jumpscare` — zvuk při útoku/smrti
- `shift_win` — zvuk při přežití směny
- `ui_click` — obecný UI klik (např. tlačítko Start, otočení mezi pohledy)
- `generator_beep` — pípnutí generátoru: normálně každých 5 s, v kritickém stavu
  (`criticalBeeping`) stejný zvuk 2×/s (viz "Generátor" níže) — žádný samostatný "warning" zvuk
- `monster_retreat_roar` — jednorázový řev při door-light repelu (viz "Světlo a dveře" v
  `GAME_DESIGN.md`) — hraje přesně jednou za repel, nikdy opakovaně na tik
- `blackout_howl` — vzdálené zavytí jednou na začátku blackoutu (viz "Blackout" v
  `GAME_DESIGN.md`); normální pípání generátoru se v blackoutu samo zastaví (jeho `TICK`
  větev se nevolá), žádný speciální "vypni zvuk" krok není potřeba
- Poslední atmosférická fáze blackoutu (těsně před koncem) nemá vlastní zvukový event —
  místo dalšího efektu ambient plynule doztichne úplně (viz "Blackout" níže)

## Ambientní zvuková vrstva

Žádná klasická výrazná hudba. Cíl je nenápadná ambientní atmosféra: slabý dron, nízký tón,
šum elektroinstalace, nepravidelné vzdálené zvuky. V první verzi je to reprezentováno jedním
`ambience_loop` placeholder souborem — rozšíření na vrstvenou/dynamickou ambienci (podle
`tensionLevel`) je připravené jako další krok, ne v MVP.

## Generátor — první zvuková gameplay mechanika

Normální stav generátoru není ticho, ale pravidelné pípání (`generator_beep`
každých 5 s) — to je hráčovi jediný signál, že je vše v pořádku. Když se
generátor porouchá, na 10 sekund úplně ztichne (žádný zvuk, ne jiný zvuk) — ticho
samo je varování a dává hráči férový reakční čas. Pokud nezareaguje, spustí se
**stejné** `generator_beep`, jen 2×/s (`night.generator.criticalBeepIntervalMs`,
500 ms) — žádný samostatný "warning" zvuk, ať je jasné, že jde o tentýž generátor,
jen v naléhavějším tempu — a zůstane, dokud hráč generátor v `GeneratorView`
nerestartuje. Rychlé pípání + rychlý pokles energie na `PowerMeter` (extra
spotřeba v `criticalBeeping`, viz "Výpočet energie" v `TECH_DESIGN.md`) je
záměrně **jediná okamžitá** signalizace — šipka "Zkontrolovat generátor →" v
`DeskView.tsx` začne blikat až se zpožděním (`GENERATOR_URGENT_BLINK_DELAY_MS`,
`game/core/generatorUrgency.ts`), ne hned. Vizuální kontrolka v
`GeneratorView.tsx` (stabilní/zhaslá/blikající) je jen pomocná, vidět jen když
se hráč na generátor přímo dívá — hlavní signál má být zvuk, viz
`GAME_DESIGN.md` sekce "Generátor".

## Zvukové události

Herní logika a UI komponenty nevolají `new Audio()` přímo — volají
`audioManager.play(AUDIO_EVENTS.xxx)` (nebo `startLoop`/`stopLoop` pro smyčky). Napojení na
konkrétní herní stav je v `app/play/page.tsx`: `useEffect` hooky sledují změny stavu
(obrazovka, dveře, světlo, energie, stage nepřítele) a podle nich spouští odpovídající zvuk.

`heartbeat` je výjimka z jednoduchého "one state → one sound" vzoru: hraje se přímo v
`handleSelectCamera` (ne v `useEffect`, protože je vázaný na akci kliknutí, ne na změnu
stavu), a navíc si drží vlastní "už jsem překvapil" flag
(`hasPlayedNearCameraSurpriseRef`) — jinak by hrál při každém kliknutí na kameru, dokud tam
nepřítel je, místo jednou za jeho "návštěvu". Reset flagu má vlastní `useEffect` sledující
`state.enemyStage`.

## Ticho před lekačkou

Přechod na `state.screen === "death"` (`app/play/page.tsx`) spouští jednotnou tříbeatovou
sekvenci pro **oba** důvody smrti (`door_open_at_attack` i `blackout_timeout`), ne okamžité
zastavení ambience a hned `jumpscare`:

1. **Ambience plynule ztiší** — `audioManager.fadeOutLoop(AUDIO_EVENTS.ambienceLoop,
   AMBIENCE_DEATH_FADE_MS)` (300 ms, `game/balancing/constants.ts`), ne tvrdé
   `stopLoop`. `fadeOutLoop` (viz `audioManager.ts`) po dojetí fadu loop zastaví a vrátí mu
   výchozí hlasitost z configu pro příští spuštění.
2. **Ticho** — `JUMPSCARE_SILENT_GAP_MS` (200 ms) naprostého ticha, žádný zvuk nehraje.
3. **`jumpscare`** — zahraje přesně `AMBIENCE_DEATH_FADE_MS + JUMPSCARE_SILENT_GAP_MS`
   (500 ms) od vstupu do "death" (`setTimeout` uvnitř efektu, s cleanupem přes
   `clearTimeout` při dalším přechodu obrazovky).

Definice lekaček (`game/jumpscares/jumpscares.object13.ts`, `silenceBeforeMs`) je zatím
nepoužitá připravená data — skutečné časování řídí konstanty výše, ne tenhle soubor.

## Útok u dveří — krok před jumpscare, ne najednou

Smrt `door_open_at_attack` má navíc krok navíc, ať zní jako "poslední krok, pak útok", ne
jako dva zvuky přehrané naráz přes sebe:

- `state.enemyStage === "at_door"` (nepřítel došel ke dveřím, standoff začíná) — hraje
  `enemy_near`, jako dřív.
- Přechod na `state.enemyStage === "attack"` (dveře byly otevřené) sám o sobě **nic
  nepřehrává** — jen `enemy_step`/`enemy_near` efekt ho záměrně přeskakuje, aby se
  nepřekrýval se sekvencí níže.
- Skutečná sekvence běží v efektu na `state.screen === "death"` (viz "Ticho před lekačkou"
  výše): pro `deathReason === "door_open_at_attack"` se `enemy_step` (poslední krok těsně
  za dveřmi) přehraje hned na vstupu do "death", souběžně se startem ambience fadu — stihne
  doznít dávno předtím, než po 500 ms přijde `jumpscare`, takže zůstávají zřetelně oddělené.
  Pro `blackout_timeout` se `enemy_step` nehraje, jen fade → ticho → `jumpscare`. `win`
  (`shift_win`) zůstává beze změny, instantní, žádný fade/gap.

## Jak funguje AudioManager

`game/audio/audioManager.ts` je jednoduchá třída se singleton instancí (`audioManager`):

- `init()` — vytvoří `HTMLAudioElement` pro každý event z `AUDIO_CONFIG`. Musí se volat až
  po první uživatelské interakci (kliknutí na "Spustit směnu"), kvůli autoplay policy
  prohlížečů.
- `play(id)` — přehraje zvuk od začátku; chybu při přehrání (chybějící/nenačtený soubor)
  tiše zachytí a pokud event má `fallbackSynth`, zahraje místo něj syntetizovaný tón
  (`playFallbackSynth`, viz níže).
- `startLoop(id)` / `stopLoop(id)` — spustí/zastaví smyčkový zvuk (ambience).
- `setMuted(bool)` — globální mute, pozastaví i běžící smyčky.
- `playFallbackSynth(synth)` (privátní) — vytvoří/znovupoužije jeden sdílený `AudioContext`
  a přehraje sekvenci oscilátorů podle `FallbackSynthConfig` (viz "Syntetizovaný fallback"
  níže). Selhání (např. limit počtu `AudioContext`) se tiše ignoruje stejně jako u
  souborového přehrávání.

## Jak přidat nový zvuk

1. Přidej klíč do `AUDIO_EVENTS` v `game/audio/audioEvents.ts`.
2. Přidej odpovídající záznam do `AUDIO_CONFIG` v `game/audio/audioConfig.ts` (cesta v
   `/public/assets/audio/`, hlasitost, `loop`), volitelně `fallbackSynth`, pokud chceš
   slyšet aspoň placeholder tón, než bude hotový skutečný soubor.
3. Zavolej `audioManager.play(AUDIO_EVENTS.novyZvuk)` (nebo `startLoop`) na místě, kde má
   zvuk hrát — typicky v `useEffect` v `app/play/page.tsx`, který sleduje relevantní část
   stavu.
4. Soubor samotný přidej do `public/assets/audio/` — dokud tam není, hra funguje dál beze
   změny chování (viz pravidlo níže).

## Jak se audio váže na stav hry

`app/play/page.tsx` drží `useRef` na předchozí hodnoty klíčových částí stavu (obrazovka,
dveře, světlo, energie, stage nepřítele, `generatorBeepSeq`) a v `useEffect` porovnává se
stavem aktuálním — při přechodu spustí odpovídající zvuk. Díky tomu je vazba na stav
explicitní a na jednom místě, ne rozeseta po komponentách.

Generátor je ukázka stejného vzoru pro periodický, ne jen jednorázový zvuk:
`gameReducer.ts` při každém pípnutí zvýší `generatorBeepSeq` o 1 (čistá herní logika,
žádné volání audia), a `app/play/page.tsx` na tuto změnu reaguje přehráním `generator_beep`
— stejný zvuk v `normal` i `criticalBeeping`, jen s jiným tempem (`beepIntervalMs` vs.
`criticalBeepIntervalMs` v `night01.ts`, viz reducer) — reducer o zvuku neví nic, jen
"oznámí", že nastal beep.

`monster_retreat_roar` funguje stejně: `gameReducer.ts#updateDoorLightRepel` (volané z
`TICK`, ne `ENEMY_ADVANCE` — viz TECH_DESIGN.md) při repelu zvýší `monsterRetreatRoarSeq` o 1
a nic nepřehrává. `app/play/page.tsx` sleduje `state.monsterRetreatRoarSeq` přes `useRef` a na
změnu zahraje zvuk přesně jednou — díky tomu, že reducer sám nikdy nevolá `audioManager`, je
nemožné, aby se řev spustil vícekrát za tik nebo z jiného místa v kódu.

`blackout_howl` sleduje přechod hodnoty, ne čítač — `app/play/page.tsx` porovnává
`state.gameStatus` s předchozí hodnotou (`useRef`) a zahraje zvuk jen na hraně
`"normal" → "blackout"`, ne při každém ticku, kdy `gameStatus === "blackout"` platí.

## Blackout — audio fáze

Blackout není jen ticho s odpočtem — má vlastní zvukovou sekvenci, ať je smrt na konci
čitelná jako `blackout_timeout`, ne jako nejasný útok:

0. **Start** (`gameStatus` hrana `"normal" → "blackout"`) — `blackout_howl`.
1. **Fáze 1** (`blackoutElapsedMs` překročí první práh `phaseThresholdsMs[0]`) — `enemy_step`
   (vzdálený krok), stejný zvuk jako běžný pohyb nepřítele mimo blackout.
2. **Fáze 2** (druhý práh) — `enemy_near` (kroky se zrychlují/blíží).
3. **Fáze 3** (třetí práh, těsně před koncem) — žádný nový zvuk. Místo dalšího efektu
   (dřív `blackout_door_hit`) se `ambience_loop` plynule ztiší úplně
   (`audioManager.fadeOutLoop(ambienceLoop, BLACKOUT_FINAL_AMBIENCE_FADE_MS)`,
   `game/balancing/constants.ts`) — hráč čeká na smrt potichu, ne s dalším "leknutím" navíc.
4. **Konec** (`blackoutElapsedMs >= durationMs`, `screen` přejde na `"death"`) — `jumpscare`,
   stejný efekt jako u každé jiné smrti, žádný speciální blackout kód navíc. Ambient je v tu
   chvíli už tichý z fáze 3, takže se death-sekvenční fade (viz "Ticho před lekačkou" výše)
   nemá co dál ztlumit.

Mechanismus je stejný sekvenční-čítač vzor jako `generatorBeepSeq`/`monsterRetreatRoarSeq`:
`gameReducer.ts` v `TICK` větvi pro `gameStatus === "blackout"` porovná
`getBlackoutPhaseIndex` (`game/visuals/blackoutPhase.ts`) pro starou a novou hodnotu
`blackoutElapsedMs` a při posunu fáze zvýší `blackoutPhaseSeq` o 1 — žádné volání audia z
reduceru. `app/play/page.tsx` sleduje `blackoutPhaseSeq` přes `useRef` a při změně přehraje
zvuk odpovídající aktuální fázi (`getBlackoutPhaseIndex` přepočítané v efektu).

`BlackoutView.tsx` texty (`content/copy.ts` `COPY.blackout.phaseTexts`) jsou navržené tak, aby
odpovídaly těmto skutečně přehrávaným zvukům — žádný text neslibuje krok/dech, který by se
nepřehrál (viz GAME_DESIGN.md "Blackout").

## Syntetizovaný fallback (bez čekání na audio soubory)

`generator_beep`, `monster_retreat_roar`, `heartbeat`, `blackout_howl` a
`bulb_break` mají v `audioConfig.ts` navíc `fallbackSynth` — krátkou sekvenci tónů (frekvence, délka,
tvar vlny) syntetizovanou přes nativní Web Audio API, žádná externí knihovna.
`AudioManager.play()` ho spustí automaticky, když `audio.play()` na chybějící/nenačtený
soubor selže (stejný `.catch()`, který jinak zvuk jen tiše zahodí). Jakmile do
`public/assets/audio/` přibude skutečný soubor, fallback se přestane používat sám od
sebe — nic se v kódu, který zvuk spouští, nemusí měnit. Hodnoty (frekvence/délka/
hlasitost) jsou centralizované v `audioConfig.ts`, ať se dají snadno doladit.

## Pravidlo: hra nesmí spadnout při chybějících audio souborech

`AudioManager.play()` i `startLoop()` obalují `audio.play()` do `try/catch` a `.catch()` na
vrácený promise. Pokud soubor neexistuje nebo přehrání selže (např. kvůli autoplay policy),
chyba se tiše ignoruje a hra pokračuje beze změny — audio je "nice to have", ne kritická
závislost. `public/assets/audio/` teď obsahuje reálné placeholder zvuky (CC0, Kenney.nl —
viz `assets/audio/README.md`), ale pravidlo platí bez ohledu na to, jestli soubor existuje:
kdykoliv v budoucnu nějaký chybí, chybí, nebo se poškodí, hra musí fungovat dál.
