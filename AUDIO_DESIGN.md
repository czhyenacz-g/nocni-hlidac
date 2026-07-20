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
- `monster_retreat_steps` — kroky ústupu, hrají `MONSTER_RETREAT_STEPS_DELAY_MS` (400 ms)
  po `monster_retreat_roar` (stejný trigger — `monsterRetreatRoarSeq`, viz
  `app/play/page.tsx`), ne současně — nejdřív leknutí, pak slyšitelné vzdalování. Žádný
  reálný soubor zatím neexistuje, jen tichý syntetizovaný fallback.
- `monster_door_bang` — bušení do dveří, když nepřítel u zavřených dveří útočí, ale útok
  je zablokovaný (viz "Dveře" v `GAME_DESIGN.md`, `game/core/doorEncounter.ts`,
  `GameState.doorBangSeq`) — potvrzení nárazu, ne lekací výkřik. Spouští se výhradně jako
  přímý důsledek zablokovaného útoku, nikdy náhodně/časem. Přehraje se jako 1–2 rychle po
  sobě jdoucí údery (viz `chooseDoorBangPlaybackPlan` v `app/play/page.tsx`) a má vlastní
  cooldown proti spamu, dokud monstrum tlačí na dveře opakovaně (viz
  `MONSTER_DOOR_BANG_COOLDOWN_MS`) — obojí čistě audio vrstva, `doorBangSeq`
  samotné se dál zvyšuje při každém zablokovaném útoku beze změny. Reálný soubor
  (`monster_door_bang.mp3`, CC0, Freesound.org — viz `assets/audio/README.md`) už
  existuje, syntetizovaný fallback zůstává pro případ, že by se nepodařilo načíst.
- `blackout_howl` — vzdálené zavytí jednou na začátku blackoutu (viz "Blackout" v
  `GAME_DESIGN.md`); normální pípání generátoru se v blackoutu samo zastaví (jeho `TICK`
  větev se nevolá), žádný speciální "vypni zvuk" krok není potřeba
- `blackout_steps_far` / `blackout_steps_near` — vzdálené/blížící se kroky v blackoutu
  (fáze 1/2, viz `GameState.blackoutPhaseSeq`), záměrně VLASTNÍ eventy, ne znovupoužité
  `enemy_step`/`enemy_near` normálního provozu — v blackoutu má "něco" znít jako těžká
  přítomnost, ne jako běžné přiblížení. Reálný soubor zatím není vybraný (obě "těžké
  monstrum" varianty ve `assets/audio/downloads/freesound/footsteps/` jsou schované pro
  budoucí "gigant" typ nepřítele, ne pro tohle) — zatím jen syntetizovaný fallback.
- `blackout_monster_roar` — krátký, výrazný řev těsně PŘED smrtí (`night.blackout.roarLeadMs`
  ms před `durationMs`, viz `GameState.blackoutRoarSeq`), odlišený od `monster_retreat_roar`
  (ústup) i od finálního `jumpscare` (hraje až o kus později, na `screen === "death"`).
  Reálný soubor (`blackout_monster_roar.mp3`, CC0, Breviceps/Freesound.org — konkrétně
  `roar_08.mp3` z rozřezané 60s nahrávky, viz `assets/audio/downloads/freesound/README.md`)
  už existuje, syntetizovaný fallback zůstává pro případ selhání načtení.
- Poslední atmosférická fáze blackoutu (těsně před koncem) nemá vlastní krokový zvuk —
  místo dalšího efektu ambient plynule doztichne úplně (viz "Blackout" níže); roar výše
  hraje nezávisle na týhle fázi, podle vlastní `roarLeadMs` hranice

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

0. **Start** (`gameStatus` hrana `"normal" → "blackout"`) — `blackout_howl`. Zároveň se
   `power` nastaví na 0, takže `computeLowPowerStressBonus` (viz "Stres a heartbeat" výše)
   od tohohle tiku dál vždycky vrací maximum — heartbeat je dominantní hned od startu
   blackoutu, beze změny v tomhle souboru.
1. **Fáze 1** (`blackoutElapsedMs` překročí první práh `phaseThresholdsMs[0]`) —
   `blackout_steps_far` (vzdálený, těžký krok) — VLASTNÍ event, ne `enemy_step` běžného
   provozu (viz "Zvukové eventy" výše).
2. **Fáze 2** (druhý práh) — `blackout_steps_near` (kroky se zrychlují/blíží).
3. **Fáze 3** (třetí práh, těsně před koncem) — žádný nový krokový zvuk. Místo dalšího
   efektu se `ambience_loop` plynule ztiší úplně
   (`audioManager.fadeOutLoop(ambienceLoop, BLACKOUT_FINAL_AMBIENCE_FADE_MS)`,
   `game/balancing/constants.ts`) — hráč čeká ve tichu (s dominantním heartbeatem, ne s
   ambientem).
4. **Roar** (`blackoutElapsedMs` překročí `durationMs - night.blackout.roarLeadMs`,
   nezávislá hranice na fázích 0–3 výše, vlastní `blackoutRoarSeq`) — `blackout_monster_roar`,
   krátký výrazný řev, POSLEDNÍ varování těsně před smrtí.
5. **Konec** (`blackoutElapsedMs >= durationMs`, `screen` přejde na `"death"`) — pokračuje
   existující obecná smrtová sekvence (fade ambience + ticho + `jumpscare`, viz "Ticho před
   lekačkou" výše) beze změny — žádný speciální blackout kód navíc. Ambient je v tu chvíli
   už tichý z fáze 3, takže se death-sekvenční fade nemá co dál ztlumit.

Mechanismus je stejný sekvenční-čítač vzor jako `generatorBeepSeq`/`monsterRetreatRoarSeq`:
`gameReducer.ts` v `TICK` větvi pro `gameStatus === "blackout"` porovná
`getBlackoutPhaseIndex` (`game/visuals/blackoutPhase.ts`) pro starou a novou hodnotu
`blackoutElapsedMs` a při posunu fáze zvýší `blackoutPhaseSeq` o 1 — žádné volání audia z
reduceru. Nezávisle na tom stejná `TICK` větev porovná `blackoutElapsedMs` s
`durationMs - roarLeadMs` a při prvním překročení zvýší `blackoutRoarSeq` o 1. `app/play/page.tsx`
sleduje oba čítače přes `useRef` a při změně přehraje odpovídající zvuk — žádný vlastní
`setTimeout`, celé časování řídí reálný herní tik (`TICK`), ne React efekt.

`BlackoutView.tsx` texty (`content/copy.ts` `COPY.blackout.phaseTexts`) jsou navržené tak, aby
odpovídaly těmto skutečně přehrávaným zvukům — žádný text neslibuje krok/dech, který by se
nepřehrál (viz GAME_DESIGN.md "Blackout").

## Syntetizovaný fallback (bez čekání na audio soubory)

`generator_beep`, `monster_retreat_roar`, `heartbeat`, `blackout_howl`,
`bulb_break` a `bulb_replace_success` mají v `audioConfig.ts` navíc `fallbackSynth` — krátkou sekvenci tónů (frekvence, délka,
tvar vlny) syntetizovanou přes nativní Web Audio API, žádná externí knihovna.
`AudioManager.play()` ho spustí automaticky, když `audio.play()` na chybějící/nenačtený
soubor selže (stejný `.catch()`, který jinak zvuk jen tiše zahodí). Jakmile do
`public/assets/audio/` přibude skutečný soubor, fallback se přestane používat sám od
sebe — nic se v kódu, který zvuk spouští, nemusí měnit. Hodnoty (frekvence/délka/
hlasitost) jsou centralizované v `audioConfig.ts`, ať se dají snadno doladit.

## Titanovy kroky a bušení na dveře (dvě vzájemně se vylučující smyčky)

Během Titanova encounteru hraje vždy nejvýš JEDNA ze dvou smyček, nikdy obě zároveň —
`computeTitanAudioTrack(stage)` (`game/audio/titanFootsteps.ts`) rozhoduje čistě podle
`state.enemyStage`: `"footsteps"` (`AUDIO_EVENTS.titanFootsteps`, kroky na štěrku) pro
`outside/outer_yard/left_hallway/door_hallway`, `"pounding"` (`AUDIO_EVENTS.titanDoorPounding`,
bušení na dveře) pro `at_door/breach`, `"none"` jinde (mimo aktivní Titanovo setkání —
`isTitanEncounterActive`). `app/play/page.tsx` má jediný `useEffect` reagující na tenhle track
(ne na `enemyStage` přímo), který při KAŽDÉ změně nejdřív zastaví opačnou smyčku a pak spustí
tu správnou — plus samostatná pojistka na odmountování stránky zastaví obě. Hlasitost kroků
plynule roste (`rampLoopVolume`, viz níže) z 50 % (`outside`) na 85 % (`door_hallway`) —
u dveří (`at_door`/`breach`) kroky už nehrají vůbec, takže ramp tam nemá smysl a bušení má
místo toho fixní hlasitost přímo z `audioConfig.ts` (0.9, dominantní ale bez klipování).

## Plynulý přechod hlasitosti smyčky (`AudioManager.rampLoopVolume`)

Na rozdíl od `fadeOutLoop` (vždy směřuje k 0 a na konci zastaví přehrávání) `rampLoopVolume(id,
targetVolume, durationMs)` plynule mění hlasitost k libovolnému cíli stejnou
`requestAnimationFrame` technikou, beze změny stavu přehrávání. Generation counter
(`volumeRampGeneration`) zneplatní předchozí probíhající ramp, pokud se na stejné `id` zavolá
znovu dřív, než doběhne (reálné riziko u rychlých přechodů mezi Titanovými stage) —
`stopLoop` ho navíc vždy zneplatní, ať nemůže starý ramp doběhnout na už zastavenou smyčku.

## Pravidlo: hra nesmí spadnout při chybějících audio souborech

`AudioManager.play()` i `startLoop()` obalují `audio.play()` do `try/catch` a `.catch()` na
vrácený promise. Pokud soubor neexistuje nebo přehrání selže (např. kvůli autoplay policy),
chyba se tiše ignoruje a hra pokračuje beze změny — audio je "nice to have", ne kritická
závislost. `public/assets/audio/` teď obsahuje reálné placeholder zvuky (CC0, Kenney.nl —
viz `assets/audio/README.md`), ale pravidlo platí bez ohledu na to, jestli soubor existuje:
kdykoliv v budoucnu nějaký chybí, chybí, nebo se poškodí, hra musí fungovat dál.
