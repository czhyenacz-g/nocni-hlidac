# Noční hlídač — pravidla pro další vývoj

Tento repozitář byl založen ze starteru (viz zbytek souboru níže pro obecný setup), ale
od teď je to samostatná hra: **Noční hlídač / Objekt 13: První směna**. Engine se jmenuje
**Noční služba** a vzniká postupným čištěním z první hratelné směny — necílíme dopředu na
obecný engine pro cokoliv.

## Nejdůležitější zásada

Nejdřív musí existovat malá funkční hratelná verze. Až potom rozšiřování. Nepřidávej
funkce, abstrakce ani konfigurovatelnost, které aktuální směna nepotřebuje.

## Zákaz monolitických souborů

- Co obrazovka, to samostatný soubor v `components/screens/`.
- Co směna/noc, to samostatná definice v `game/nights/`.
- Co typ nepřítele, to samostatný soubor (nebo jasně oddělená definice) v `game/enemies/`.
- Herní stav (`game/core/`) musí zůstat oddělený od UI (`components/`).
- Pravidla hry (reducer, definice směn/nepřátel/kamer) musí být oddělená od vizuálních
  komponent.
- Texty (`content/copy.ts`), konfigurace směn, definice kamer a nepřítele nikdy nedávat
  přímo do hlavní komponenty (`app/play/page.tsx`) — jen se tam propojují.
- Co pohled hráče (`GameState.playerView`, např. `"desk" | "door" | "generator"`), to
  samostatná komponenta v `components/game/` (`DeskView.tsx`, `DoorView.tsx`,
  `GeneratorView.tsx`, ...) — `GameScreen.tsx` jen vybírá, který pohled vykreslit podle
  `state.playerView`, žádnou herní logiku sama neobsahuje. Přechody mezi pohledy jsou
  vlastní akce (`LOOK_AT_*`) v `gameReducer.ts`, ne lokální React state v komponentě.
  Pokud má akce smysl jen v konkrétním pohledu (např. `TOGGLE_DOOR` jen v `"door"`,
  `RESTART_GENERATOR` jen mimo `"normal"`), vynuť to přímo v reduceru, ne jen v UI.
- Seznam kamer je vždy konfigurační (`NightDefinition.cameras` + `defaultCameraId` v
  `game/nights/night01.ts`, definice v `game/cameras/`), nikdy hardcoded v
  `CameraPanel.tsx`/`CameraMonitorGrid.tsx`/`CameraMonitorTile.tsx`/`CameraDetailView.tsx`/
  `CameraView.tsx` ani jinde v UI. Nepředpokládej v kódu konkrétní počet ani konkrétní camera
  id — příští směna může mít jiný počet a jinou kombinaci. Totéž platí pro
  `EnemyDefinition.route`: stage nepřítele nejsou to samé jako camera id (např. `at_door`
  není kamera) a UI ani reducer nesmí předpokládat, že každá stage odpovídá nějaké kameře.
- Kamerové UI na desktopu není čtyři obyčejná tlačítka — je to overview/detail model
  (`GameState.cameraViewMode: "overview" | "detail"`): `CameraMonitorGrid.tsx` ukazuje
  všechny kamery jako mřížku malých monitorů (jen štítek + šum, žádný živý obraz),
  `CameraDetailView.tsx` zvětší jednu vybranou kameru se skutečným obsahem a tlačítkem
  zpět. Overview se nikdy nepočítá jako aktivní sledování (`cameraOpen` je `true` jen v
  detailu) — nepřidávej cestu, jak by šlo sledovat nepřítele jen z přehledu, to by
  rozbilo herní důvod, proč overview/detail vůbec existuje (viz GAME_DESIGN.md "Kamery").
- Atmosférická pozadí obrazovek (menu, loading, hraní, smrt, výhra, `/about`) patří do
  `game/visuals/backgroundImages.ts` (`BACKGROUND_SCENES`), nikdy natvrdo (URL obrázku, počet
  snímků, gradient) v `MainMenuScreen.tsx`/`GameScreen.tsx`/`WinScreen.tsx`/atd. Vykresluje je
  vždy `components/SceneBackground.tsx` — nová screen komponenta jen přidá `<SceneBackground
  scene={BACKGROUND_SCENES.xxx} />` jako první potomek `<main className="relative ...">`, žádnou
  vlastní crossfade/flicker logiku. Přidání/výměna obrázku nebo efektu (víc snímků, `flicker`)
  je vždy jen datová změna v `BACKGROUND_SCENES`. Dvě pravidla, jejichž porušení pozadí
  neviditelným (viz TECH_DESIGN.md "Scénová pozadí"): (1) to `<main>` nesmí mít vlastní `bg-*`
  třídu (main bez vlastního `z-index` nezakládá stacking context, takže vlastní pozadí by
  `SceneBackground` potomka s `-z-10` zakrylo); (2) `SceneBackground` musí být v `<main>`, které
  pokrývá celou šířku obrazovky, ne uvnitř vnitřního `max-w-md` obalu.
- Texty pro LoadingScreen (a jakýkoliv další "hint"/servisní obsah) patří do
  `content/loadingHints.ts` (nebo obdobného content souboru), nikdy natvrdo do
  `LoadingScreen.tsx`. Výběr/filtrování hintů (`selectLoadingHints`) je čistá funkce v
  content vrstvě, ne v komponentě ani v `gameReducer.ts` — je to obsahové rozhodnutí, ne
  herní pravidlo.
- Odvozený stav, který se dá spočítat čistě z existujících polí `GameState` (např.
  `isCameraFocused` v `game/core/cameraFocus.ts`, fáze blackoutu v
  `game/visuals/blackoutPhase.ts`), patří do samostatné čisté funkce v `game/core/` nebo
  `game/visuals/`, ne do komponenty a ne jako duplicitní pole přepočítávané v `TICK`.
  Komponenta (např. `CameraView.tsx`, `BlackoutView.tsx`) dostane výsledek jako prop a jen
  ho zobrazí.
- `gameStatus: "blackout"` je alternativní režim `TICK`u, ne varianta uvnitř běžné herní
  logiky — má vlastní větev na začátku `TICK` (žádné volání `applyPowerDelta`/
  `updateGenerator`/`updateDoorLightRepel`, ty počítají s normálním provozem) a vlastní
  view komponentu (`BlackoutView.tsx`), která nahrazuje DeskView/DoorView/GeneratorView
  vcelku — nerozpadávej blackout na dílčí "blackout mód" uvnitř každé view komponenty
  zvlášť.
- `GameState.doorDeathRevealUntilMs` (krátký ~700ms "reveal" před finalizací smrti
  `door_open_at_attack`, viz TECH_DESIGN.md "Útok u dveří má krátký reveal") je záměrně
  jednoúčelový lokální mezistav jen pro tenhle jeden případ — NEZOBECŇUJ ho na univerzální
  "pre-death"/"attack warning" mezistav pro všechny způsoby smrti. Blackout i jakákoli budoucí
  jiná smrt musí dál nastavovat `screen: "death"` přímo, beze změny. Nastavuje se navíc jen
  když je hráč v okamžiku útoku už v `DoorView` (`state.playerView === "door"`) — smrt při
  sledování kamer/generátoru zůstává klasická/instantní a **nevynucuje** přepnutí na
  `DoorView` (na výslovnou žádost — tenhle případ má dostat vlastní obrazovku později, ne
  být narvaný do DoorView flow).

## Povinnost držet audio odděleně

Veškerá audio logika žije v `game/audio/` (`audioManager.ts`, `audioEvents.ts`,
`audioConfig.ts`). Komponenty a herní logika volají jen `audioManager.play(...)` /
`startLoop(...)` / `stopLoop(...)`. Nový zvuk = nový event + config, ne `new Audio()`
přímo v komponentě. Přehrání chybějícího/nenačteného souboru se musí vždy tiše ignorovat —
hra nesmí spadnout kvůli chybějícímu audio souboru (viz `AUDIO_DESIGN.md`).

## Povinnost držet vizuální atmosféru odděleně

Desaturace/kontrast/blikání se počítá v `game/visuals/` (`atmosphereState.ts`,
`visualEffects.ts`) z `tensionLevel`, ne jako náhodné CSS podmínky rozeseté po
komponentách. Pokud přibude nový vizuální efekt vázaný na napětí, patří do
`visualEffects.ts` a do `styles/atmosphere.css`, ne do jednotlivých screen komponent.

## Povinnost aktualizovat dokumentaci po větších změnách

Po každé větší změně (nová směna, nový nepřítel, změna herních pravidel, změna audio/
vizuální vrstvy) aktualizuj odpovídající `GAME_DESIGN.md`, `TECH_DESIGN.md`,
`AUDIO_DESIGN.md` a `TODO.md`.

## Povolení: konverze obrázků do WebP

Nástroj `cwebp` (a obdobné čistě lokální konverzní nástroje) smí Claude používat bez ptaní
na povolení — včetně kopírování/přesouvání zdrojových i výstupních souborů obrázků v rámci
`public/`. Nejde o destruktivní ani sdílenou akci (jen lokální konverze souborů v repu), proto
nepotřebuje explicitní souhlas pokaždé znovu.

---

# Starter — instrukce pro Claude

Tento repozitář je šablona pro rychlé zakládání nových Next.js projektů.
Hynek řekne název a nápad → Claude udělá vše ostatní.

Následující sekce je obecný starter postup (env setup, tokeny, jak založit *nový*
projekt) — ponecháno jako referenční dokumentace, pro tento konkrétní projekt (Noční
hlídač) už bylo provedeno.

---

## Nastavení nového MacBooku (udělat jednou)

Bez těchto nástrojů Claude nemůže plně automatizovat zakládání projektů.
Projdi kroky v tomto pořadí.

### 1. Xcode Command Line Tools (git, make, atd.)
```bash
xcode-select --install
```

### 2. Homebrew (package manager)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Node.js (přes nvm — správa verzí)
```bash
brew install nvm
# přidej do ~/.zshrc:
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
# pak:
source ~/.zshrc
nvm install --lts
nvm use --lts
```

### 4. GitHub CLI
```bash
brew install gh
gh auth login
# → zvolí: GitHub.com → HTTPS → Login with a browser
```

### 5. Vercel CLI
```bash
npm i -g vercel
vercel login
# → přihlásí přes browser
```

### 6. SSH klíč pro GitHub (pro git push)
```bash
ssh-keygen -t ed25519 -C "tvuj@email.cz"
# Enter třikrát (výchozí cesta, bez hesla)
cat ~/.ssh/id_ed25519.pub
# zkopíruj výstup a přidej na github.com/settings/keys
```

### 7. Git konfigurace
```bash
git config --global user.name "darbujan"
git config --global user.email "tvuj@email.cz"
```

### 8. Vercel — napoj GitHub účet
Na vercel.com → Settings → Git → Connect GitHub účet `czhyenacz-g`.
Zaškrtni "Auto-deploy on push" pro všechna repozitáře.

### Ověření že vše funguje
```bash
node --version      # v20+
git --version       # 2.x
gh auth status      # Logged in to github.com
vercel whoami       # tvoje jméno na Vercel
```

---

## Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Vercel Analytics** (`@vercel/analytics`)
- **GoatCounter** (volitelně, nastavit v `app/config/analytics.ts`)
- Deploy: **Vercel** (auto-deploy z GitHubu na push do `main`)

---

## Tokeny (API přístupy)

Uloženy v `~/PhpstormProjects/starter/.tokens` — soubor není commitován (.gitignore).

Obsahuje:
- `GITHUB_TOKEN` — pro vytváření GitHub repozitářů přes API
- `VERCEL_TOKEN` — pro vytváření a deploy Vercel projektů přes API

Před každou akcí načti tokeny:
```bash
source ~/PhpstormProjects/starter/.tokens
```

---

## Jak založit nový projekt

### 1. Zkopíruj starter

```bash
cp -r ~/PhpstormProjects/starter ~/PhpstormProjects/PROJEKT_NAZEV
cd ~/PhpstormProjects/PROJEKT_NAZEV
rm -rf .git node_modules .next
```

### 2. Nahraď placeholdery

V celém projektu vyhledej a nahraď:
- `PROJECT_NAME` → název projektu (např. "Kolik piv to je?")
- `PROJECT_DESCRIPTION` → jeden řádek co to dělá
- `PROJECT_DOMAIN` → doména (např. `kolikpiv.cz`) nebo zatím `TODO`

Soubory kde se placeholdery vyskytují:
- `app/layout.tsx` — metadata (title, description, OG)
- `app/page.tsx` — hlavní stránka
- `app/api/og/route.tsx` — OG image
- `package.json` — `"name"` pole

### 3. Inicializuj Git a pushnui na GitHub

```bash
git init
git add .
git commit -m "init"
# Vytvoř repo na github.com/czhyenacz-g (nebo přes gh CLI):
gh repo create czhyenacz-g/PROJEKT_NAZEV --public --source=. --push
```

Pokud `gh` není nainstalované:
```bash
brew install gh
gh auth login
```

### 4. Napoj Vercel

Buď automaticky (pokud je Vercel napojený na GitHub org) — stačí push.

Nebo manuálně:
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 5. Nainstaluj závislosti a spusť lokálně

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Struktura projektu

```
app/
  layout.tsx          # Root layout, metadata, analytics
  page.tsx            # Hlavní stránka
  globals.css         # Tailwind direktivy
  config/
    analytics.ts      # GoatCounter kód
  api/
    og/
      route.tsx       # Dynamický OG image endpoint
```

---

## Konvence

- **Tmavý theme**: `bg-gray-900 text-white` na body (v layout.tsx)
- **Max šířka obsahu**: `max-w-md` nebo `max-w-lg` + `mx-auto`
- **Barvy**: amber pro akcenty (`text-amber-400`, `bg-amber-600`)
- **Jazyk**: česky, neformální tón
- **Komponenty**: pokud je stránka interaktivní, přidej `"use client"` komponentu do `app/components/`
- **Sdílení**: OG image přes `/api/og` s query params (`title`, `sub`, vlastní)

---

## E-mail (Zoho Mail)

Pro každou novou doménu se nastavuje přesměrování e-mailu přes **Zoho Mail** (bezplatný plán, vlastní doména).

### Postup
1. Přihlas se na [zoho.com/mail](https://www.zoho.com/mail/) (účet Hynek)
2. Přidej doménu: Settings → Domains → Add Domain → zadej `DOMENA.cz`
3. Ověř doménu přidáním TXT záznamu do DNS (Zoho zobrazí přesnou hodnotu)
4. Nastav MX záznamy dle instrukcí Zoho (obvykle `mx.zoho.eu`)
5. Vytvoř aliasy / přesměrování: Settings → Email Forwarding → přidej `info@DOMENA.cz` → přesměruj na `hynek@darbujan.cz`

### Checklist pro e-mail
- [ ] Doména přidána a ověřena v Zoho Mail
- [ ] MX záznamy nastaveny v DNS
- [ ] Přesměrování `info@DOMENA.cz → hynek@darbujan.cz` funguje

---

## Checklist pro nový projekt

- [ ] Nahrazeny všechny `PROJECT_*` placeholdery
- [ ] `package.json` má správné `"name"`
- [ ] `npm install` proběhl
- [ ] `npm run dev` funguje na localhost:3000
- [ ] Git repo vytvořeno a pushnuté
- [ ] Vercel nasadil — URL funguje
- [ ] OG image funguje: `https://DOMENA/api/og?title=Test`
- [ ] E-mail přesměrování přes Zoho Mail nastaveno

---

## Vzorový projekt

Referenční implementace: `~/PhpstormProjects/kolikpiv.cz/kolikpiv/`

Obsahuje příklady:
- Kalkulačka s výsledkem a sdílením
- Dynamický OG image s parametry
- Share text s URL params
- GoatCounter + Vercel Analytics
- QR kód generování
- LocalStorage pro uložení nastavení
