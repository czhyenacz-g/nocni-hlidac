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
- `monster_retreat_roar.mp3` — řev při door-light repelu (`AUDIO_EVENTS.monsterRetreatRoar`)
- `blackout_howl.mp3` — vzdálené zavytí na začátku blackoutu (`AUDIO_EVENTS.blackoutHowl`)

Dokud nejsou doplněné, hra funguje beze změny — `AudioManager` chybějící soubor jen
tiše ignoruje (viz pravidlo výše). U těchto čtyř navíc `game/audio/audioConfig.ts`
definuje `fallbackSynth` — krátký tón/sekvenci syntetizovanou přímo přes Web Audio API
(`AudioManager.playFallbackSynth`, žádná externí knihovna), takže i bez hotových
souborů je slyšet aspoň placeholder pípnutí/řev. Jakmile soubor přibude, fallback se
přestane používat sám od sebe.

## Heartbeat/stres vrstva

`heartbeat_slow_reverb.mp3` a `heartbeat_fast_reverb.mp3` — dva nekonečné loopy pro
`AUDIO_EVENTS.heartbeatStressSlow`/`heartbeatStressFast` (viz
`game/audio/useHeartbeatStress.ts`, `GAME_DESIGN.md` "Stres a heartbeat"). Zdroj:
[OpenGameArt.org — Heartbeat sounds](https://opengameart.org/content/heartbeat-sounds),
licence **CC0**. Staženo přes `assets/audio/downloads/opengameart/heartbeat/` (raw
originály + další nevyužité varianty, viz README tam), tyhle dva soubory zkopírované
sem jsou skutečně zapojené v `audioConfig.ts`.
