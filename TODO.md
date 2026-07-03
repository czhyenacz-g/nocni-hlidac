# TODO

## Checklist pro první MVP

- [x] Hlavní menu
- [x] Spuštění hry
- [x] Jedna hratelná směna (`night01`)
- [x] Jedna místnost hráče (GameScreen)
- [x] 4 kamery, konfigurační (ne hardcoded v UI)
- [x] Jedny dveře
- [x] Jedno světlo do chodby
- [x] Jeden nepřítel (`basicIntruder`)
- [x] Jednoduchý časovač směny
- [x] Jednoduchá energie
- [x] Obrazovka smrti
- [x] Obrazovka vítězství
- [x] Restart aktuální směny po smrti
- [x] Základní lekačka (overlay + zvuk)
- [x] Zvukové efekty pro napětí a smrt (CC0 placeholder z Kenney.nl + fallback při chybějícím souboru)
- [x] Postupná vizuální desaturace podle napětí
- [x] Build a lokální spuštění bez chyb
- [x] Ovládání dveří přes otočení hráče (DeskView/DoorView, dvoukrokové zavírání)
- [x] Dobíjení energie mimo kamerový pohled (~1 %/3 s, nesmí přebít spotřebu dveří/světla)
- [x] Generátor jako zvuková gameplay mechanika (normální pípání, porucha, ticho,
      kritické pípání + extra spotřeba, restart přes GeneratorView)
- [x] enemyTickMs zvýšen na 2 s, blikající hotspot na generátor v DeskView při poruše
- [x] 4. kamera (Chodba před dveřmi) + trasa nepřítele přes ni, `at_door` oddělený od
      kamer, pravděpodobnostní pohyb s `retreatChance` (ústup), `camera_noise` jen
      když je nepřítel na kameře nejblíž hráči
- [x] Náhodná volba strany (pravá/levá chodba) — `routeVariants`, losuje se jednou při
      startu směny
- [x] Mobilní stabilizace — dotykové cíle (`.tap-target`, `.tap-target-critical`,
      `.view-hotspot`), `.mobile-landscape-hint`, DebugPanel skrytý pod `lg`, viewport meta
- [x] Oprava `camera_noise` (jednorázový za "návštěvu") a zarovnání kamer podle pozice,
      sbalitelný DebugPanel
- [x] Door-light repel: zavřené dveře + zapnuté světlo + nepřítel u dveří ~1,5 s ->
      řev + silný ústup (`doorLightRepelMs` v TICKu, nezávislé na `enemyTickMs`);
      obecný standoff u dveří (6–8 s) je teď nezávislý na světle
      (`doorHoldLightAccelMultiplier` odstraněn)
- [x] LOOK_AT_DOOR/LOOK_AT_GENERATOR zavírají kamery (žádná nezůstane "otevřená" na
      pozadí), `isEnemyBeingWatched` vyžaduje `playerView === "desk"`
- [x] Generátor: omylem restartovaný funkční generátor teď penalizuje (`restarting`,
      5 s tichý výpadek se stejnou extra spotřebou jako `criticalBeeping`), místo aby
      byl no-op
- [x] Syntetizovaný fallback (Web Audio, bez knihovny) pro `generator_beep`,
      `generator_warning_beep`, `monster_retreat_roar` — slyšet i bez hotových
      audio souborů, doladit hodnoty v `audioConfig.ts`
- [ ] Playtest a doladění balancu (šance postupu nepřítele, retreatChance, spotřeba
      energie, rychlost dobíjení, časové okno poruchy generátoru, tempo kritického
      pípání, rozsah doorHoldRangeMs, doorLightRepelRequiredMs, restartPenaltyMs)
- [ ] Ověřit, jestli `enemy_near` (hraje globálně při `at_door`/`attack`, nezávisle na
      tom, kterou kameru zrovna sleduješ) je záměr, nebo má být vázané na aktivní kameru
- [ ] Ruční test na skutečném mobilu (ne jen zmenšené okno v desktop prohlížeči):
      - přepínání desk → door → desk a desk → generator → desk prstem
      - klik na dveře/generátor v DoorView/GeneratorView
      - kamera tlačítka v CameraPanel při 4 kamerách (zalomení na užší obrazovce)
      - `.mobile-landscape-hint` se objeví v portrait a zmizí v landscape
      - žádný hotspot není nalepený na okraj displeje (notch/safe area u `viewportFit: cover`)

## Další kroky po MVP

- Skutečná pixel-art grafika (sprity pro místnost, kamery, nepřítele, generátor)
- Vlastní/kvalitnější audio místo Kenney.nl CC0 placeholderů (zejména `ambience_loop`,
  který teď je jen krátký smyčkovaný efekt, ne skutečná ambientní kompozice); doplnit
  reálné soubory `generator_beep.mp3`, `generator_warning_beep.mp3` a
  `monster_retreat_roar.mp3` (zatím jen konfigurace + syntetizovaný fallback, viz
  `assets/audio/README.md`)
- Druhá směna (`night02.ts`) s jiným nepřítelem/balancem
- Dynamická vrstvená ambience podle `tensionLevel`
- Vylepšený jumpscare (delší/výraznější sekvence, ne jen barevný flash)
- Ukládání nejlepšího výsledku / progressu do localStorage
- Nastavení hlasitosti (ne jen mute/unmute)

## Explicitně odložené věci

- Platby, Discord login, Patreon
- Databáze
- Editor kampaní, více kampaní
- 3D grafika
- Multiplayer
- Složitý backend
- Velký lore systém
- Generický engine pro všechno (vznikne postupně z první hratelné směny)
- Složitá procedurální mapa
