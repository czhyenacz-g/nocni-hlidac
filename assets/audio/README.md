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
