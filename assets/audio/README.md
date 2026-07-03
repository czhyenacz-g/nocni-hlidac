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
tiše ignoruje (viz pravidlo výše).
