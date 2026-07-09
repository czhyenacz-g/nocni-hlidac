# Audio assety

Skutečné servírované soubory jsou v `/public/assets/audio/`, na ně odkazuje
`game/audio/audioConfig.ts`. I kdyby soubor chyběl, `AudioManager`
(`game/audio/audioManager.ts`) selhání přehrání tiše ignoruje, takže hra funguje i bez nich.

## Zdroj (placeholder zvuky pro první verzi)

Všechny zvuky pochází z [Kenney.nl](https://kenney.nl), licence **Creative Commons CC0**.
Kompletní seznam balíčků, mapování zdroj→finální název a datum importu viz **`CREDITS.md`**
v kořeni repozitáře.

Toto je první placeholder výběr, ne finální zvukový design — `ambience_loop.mp3` je krátký
efekt smyčkovaný přes `loop: true`, ne skutečně nekonečná ambientní kompozice (viz
`AUDIO_DESIGN.md`, sekce "Ambientní zvuková vrstva" pro plán rozšíření).

## Chybějící soubory (očekávané, zatím bez placeholderu)

- `generator_beep.mp3` — normální pípnutí generátoru (`AUDIO_EVENTS.generatorBeep`)
- `generator_warning_beep.mp3` — rychlé varovné pípání v kritickém stavu
  (`AUDIO_EVENTS.generatorWarningBeep`)

Dokud nejsou doplněné, hra funguje beze změny — `AudioManager` chybějící soubor jen
tiše ignoruje (viz pravidlo výše). U těchto navíc `game/audio/audioConfig.ts`
definuje `fallbackSynth` — krátký tón/sekvenci syntetizovanou přímo přes Web Audio API
(`AudioManager.playFallbackSynth`, žádná externí knihovna), takže i bez hotových
souborů je slyšet aspoň placeholder pípnutí/řev. Jakmile soubor přibude, fallback se
přestane používat sám od sebe.

## Monster door bang

`monster_door_bang.mp3` — bušení do dveří při zablokovaném útoku (viz
`AUDIO_EVENTS.monsterDoorBang`, `game/core/doorEncounter.ts`, GAME_DESIGN.md "Dveře").
Zdroj: [194365__macif__door-knocking-angry.wav — "Door knocking (Angry).wav"](https://freesound.org/people/Macif/sounds/194365/)
(Freesound.org, autor **Macif**, licence **CC0** — bez nutnosti attribution, ale
uvedeno tady pro pořádek/vysledovatelnost). Staženo 2026-07-08, raw originál
zůstává v `assets/audio/downloads/freesound/door_pound/`. Peak byl už na `0dB`
(mean_volume −21,5 dB — krátký úder s tichým okolím, ne plochý zvuk), takže beze
změny gainu, jen konverze na mp3 (`ffmpeg -codec:a libmp3lame -b:a 128k`).
Nahrazuje dřívější syntetizovaný fallback (jeden krátký nízký "úder" tón), který
se teď použije, jen kdyby se `monster_door_bang.mp3` nepodařilo načíst.

## Monster retreat roar

`monster_retreat_roar.mp3` — řev při door-light repelu (`AUDIO_EVENTS.monsterRetreatRoar`,
viz GAME_DESIGN.md "Světlo a dveře"). Zdroj: `614013__aarontheonly__roar9.wav` (soubor
dodaný uživatelem do `public/assets/audio/`, licence/atribuce neuvedena). Originál byl tichý
(mean_volume ~-27 dB, peak -11,1 dB) — servírovaná kopie má `+10dB` gain
(`ffmpeg -af "volume=10dB"`, peak teď ~-1,2 dB). Nahrazuje dřívější syntetizovaný fallback,
který se teď použije, jen kdyby se `monster_retreat_roar.mp3` z nějakého důvodu nepodařilo
načíst.

## Bulb break

`bulb_break.mp3` — praskne žárovka v místnosti (`AUDIO_EVENTS.bulbBreak`, viz
`game/core/roomBulbs.ts`, GAME_DESIGN.md "Žárovky"). Zdroj:
[541828__iainmccurdy__smash-light-bulb.wav](https://freesound.org/people/iainmccurdy/sounds/541828/)
(Freesound.org, autor iainmccurdy). Peak byl už skoro na `0dB` (-0,6 dB po konverzi), takže
beze změny gainu, jen konverze na mp3. Nahrazuje dřívější syntetizovaný fallback (krátké
pípnutí), který se teď použije, jen kdyby se `bulb_break.mp3` nepodařilo načíst.

Poznámka: v `public/assets/audio/` je navíc `33629__themfish__bulb_smash.mp3` — dřívější
alternativní kandidát, dnes nikde v `audioConfig.ts` nezapojený (zůstává jen jako soubor na
disku, ne aktivní asset).

## Blackout howl

`blackout_howl.mp3` — vzdálené zavytí přesně v okamžiku, kdy baterie klesne na 0 a začne
blackout (`AUDIO_EVENTS.blackoutHowl`, viz GAME_DESIGN.md "Blackout"). Zdroj:
`860536__windowsgamer23d__call-end.m4a` (soubor dodaný uživatelem do
`public/assets/audio/`, licence/atribuce neuvedena). Originál byl tišší (mean_volume
~-21,6 dB, peak -13,3 dB) — servírovaná kopie má `+12dB` gain (`ffmpeg -af "volume=12dB"`,
peak teď ~-1,3 dB) a je zkonvertovaná z `.m4a` na `.mp3`. Nahrazuje dřívější syntetizovaný
fallback (sestupná sekvence tónů), který se teď použije, jen kdyby se `blackout_howl.mp3`
nepodařilo načíst.

## Heartbeat/stres vrstva

`heartbeat_slow_reverb.mp3` a `heartbeat_fast_reverb.mp3` — dva nekonečné loopy pro
`AUDIO_EVENTS.heartbeatStressSlow`/`heartbeatStressFast` (viz
`game/audio/useHeartbeatStress.ts`, `GAME_DESIGN.md` "Stres a heartbeat"). Zdroj:
[OpenGameArt.org — Heartbeat sounds](https://opengameart.org/content/heartbeat-sounds),
licence **CC0**. Staženo přes `assets/audio/downloads/opengameart/heartbeat/` (raw
originály + další nevyužité varianty, viz README tam), tyhle dva soubory zkopírované
sem jsou skutečně zapojené v `audioConfig.ts`.

Originální OpenGameArt soubory byly hodně tiché (mean_volume ~-30 dB, o ~23 dB tišší než
`ambience_loop.mp3`) — po prvním playtestu (heartbeat nebyl vůbec slyšet) byl na tyhle dvě
servírované kopie aplikovaný `+12dB` gain (`ffmpeg -af "volume=12dB"`, peak teď ~-2,2 dB).
Raw originály v `downloads/opengameart/heartbeat/` zůstávají netknuté (nezesílené).

## Emergency run siréna

`emergency_run_siren.mp3` — hraje nepřetržitě po dobu držení tlačítka "Nouzově opustit
místnost" (`AUDIO_EVENTS.emergencyRunSiren`, viz `app/play/page.tsx` efekt na
`state.emergencyRunWindup.active`). Zdroj:
[172353__theblockofsound235__emergency-wail-loop-whelen.wav](https://freesound.org/people/theblockofsound235/sounds/172353/)
(Freesound.org, licence **CC0**) — reálná civilní poplachová siréna (Whelen WPS-3016), WAIL
tón, 11s bezešvá smyčka. Kandidát byl nejdřív k poslechu na `/dev-sound`
(`public/dev-sound-candidates/siren/`), servírovaná kopie je jen zkopírovaná beze změny
gainu (peak už -3,3 dB, mean_volume -14,1 dB — hlasitá už v originále). Nahrazuje dřívější
syntetizovaný fallback (dva střídavé tóny), který se teď použije, jen kdyby se
`emergency_run_siren.mp3` nepodařilo načíst.

## Hardcore výběr

`hardcore_select_roar.mp3` — krátký řev při kliknutí na HARDCORE v hlavním menu
(`AUDIO_EVENTS.hardcoreSelectRoar`, viz `components/screens/MainMenuScreen.tsx`
`#handleSelectHardcore`). Zdroj: `monster_roar/roar_08.mp3` — jeden z 12 klipů rozřezaných
(ffmpeg silencedetect) z [479380__breviceps__dragon-roars-growls-snarls.wav](https://freesound.org/people/Breviceps/sounds/479380/)
(Freesound.org, autor **Breviceps**, licence **CC0**). Kandidát byl nejdřív k poslechu na
`/dev-sound` (`public/dev-sound-candidates/monster_roar/`), servírovaná kopie je jen
zkopírovaná beze změny gainu (peak už -0,4 dB, mean_volume -11,8 dB, 2,2 s).

## Finální řev monstra (hidden true ending)

`monster_final_death_roar.mp3` — hraje na 10. (finálním) potvrzeném zásahu monstra
(`AUDIO_EVENTS.monsterFinalDeathRoar`, viz `game/core/monsterEnding.ts`,
`components/minigame/EmergencyMiniGame.tsx#fireShot`). Znamená smrt, ne ústup — nikdy
nezaměňovat s `monster_retreat_roar.mp3` (dočasné odehnání dveře+světlem, monstrum se
vrací). Zdroj: `monster_roar/roar_12.mp3` — poslední (12.) z klipů rozřezaných z
[479380__breviceps__dragon-roars-growls-snarls.wav](https://freesound.org/people/Breviceps/sounds/479380/)
(Freesound.org, autor **Breviceps**, licence **CC0**), stejná dávka jako
`hardcore_select_roar.mp3` výše. Servírovaná kopie je jen zkopírovaná beze změny gainu
(peak už -0,3 dB, mean_volume -17,6 dB, 3,8 s).
