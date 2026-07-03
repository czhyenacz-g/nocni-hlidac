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
- [x] Světlo dává nepříteli u dveří reálný efekt (2× rychlejší odehnání), enemyTickMs
      zvýšen na 2 s, blikající hotspot na generátor v DeskView při poruše
- [x] 4. kamera (Chodba před dveřmi) + trasa nepřítele přes ni, `at_door` oddělený od
      kamer, pravděpodobnostní pohyb s `retreatChance` (ústup), `camera_noise` jen
      když je nepřítel na kameře nejblíž hráči
- [ ] Playtest a doladění balancu (šance postupu nepřítele, retreatChance, spotřeba
      energie, rychlost dobíjení, časové okno poruchy generátoru, tempo kritického
      pípání, rozsah doorHoldRangeMs a doorHoldLightAccelMultiplier)

## Další kroky po MVP

- Skutečná pixel-art grafika (sprity pro místnost, kamery, nepřítele, generátor)
- Vlastní/kvalitnější audio místo Kenney.nl CC0 placeholderů (zejména `ambience_loop`,
  který teď je jen krátký smyčkovaný efekt, ne skutečná ambientní kompozice); doplnit
  reálné soubory `generator_beep.mp3` a `generator_warning_beep.mp3` (zatím jen
  konfigurace, viz `assets/audio/README.md`)
- Druhá směna (`night02.ts`) s jiným nepřítelem/balancem
- Alternativní trasa přes levou chodbu (`left_hallway`) — kamera i typ existují,
  jen ji zatím žádná trasa nevyužívá
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
