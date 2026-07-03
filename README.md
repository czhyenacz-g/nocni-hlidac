# nocni-hlidac

Veřejný název: **Noční hlídač**
První kapitola: **Objekt 13: První směna**
Série / engine: **Noční služba**

Klaustrofobická lekací hra v prohlížeči. Hráč sedí v malé bezpečnostní místnosti,
sleduje kamery, ovládá dveře a světlo, šetří energii a snaží se přežít směnu.

## Jak spustit lokálně

```bash
npm install
npm run dev
# → http://localhost:3000/play
```

Kořenová stránka `/` rovnou přesměrovává na `/play`, kde běží celý herní stavový automat
(hlavní menu → hra → smrt/výhra).

## Jak deployovat

Projekt je napojený na Vercel (auto-deploy z GitHubu při push do `main`).

Manuálně:

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Co umí první verze (MVP)

- Hlavní menu, spuštění hry, obrazovka smrti, obrazovka vítězství
- Jedna hratelná směna (`night01`, ~2:30 min)
- 3 kamery, jedny dveře, jedno světlo, energie
- Jeden nepřítel (`basicIntruder`) postupující po trase ke dveřím
- Restart aktuální směny po smrti
- Základní jumpscare overlay a zvuk
- Zvuková vrstva (`AudioManager`) s placeholder zvuky — hra nespadne, i když audio soubory chybí
- Postupná vizuální desaturace obrazu podle napětí (`tensionLevel`)

## Co zatím neumí

- Další směny/noci (architektura je na to připravená, viz `TECH_DESIGN.md`)
- Skutečná pixel-art grafika (zatím CSS placeholder)
- Skutečné audio soubory (zatím jen konfigurace a fallback, viz `AUDIO_DESIGN.md`)
- Ukládání postupu, žebříčky, více nepřátel

## Struktura projektu

```
app/
  page.tsx              # redirect na /play
  play/page.tsx          # vlastník herního stavu, propojuje reducer/loop/audio/atmosféru
  layout.tsx             # root layout, metadata, globální styly

components/
  screens/                # MainMenuScreen, GameScreen, DeathScreen, WinScreen
  game/                   # CameraPanel, DoorControl, LightControl, PowerMeter, ...

game/
  core/                   # types, gameState, gameActions, gameReducer, gameLoop
  nights/                 # definice směn (night01.ts)
  cameras/                # definice kamer pro Objekt 13
  enemies/                # definice nepřátel (basicIntruder.ts)
  audio/                  # AudioManager, audio eventy a konfigurace
  visuals/                # výpočet napětí a desaturace
  jumpscares/             # definice lekaček
  balancing/              # ladicí konstanty

content/
  copy.ts                 # herní texty

styles/
  pixel.css               # pixel-art placeholder styl
  atmosphere.css           # CSS proměnné pro desaturaci/kontrast/blikání

assets/
  audio/, images/          # zdrojové materiály (servírované soubory patří do public/assets/)
```

Podrobněji viz `TECH_DESIGN.md`, `GAME_DESIGN.md`, `AUDIO_DESIGN.md`.
