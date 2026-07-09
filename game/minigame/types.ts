// Typy pro izolovaný prototyp minihry (nouzová obchůzka / boj s monstrem,
// viz app/minihra/page.tsx) — NEZÁVISLÉ na hlavní hře (/play). Žádný typ
// odsud se nesdílí s game/core/types.ts.

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

// 8 směrů (45° kroky) — kardinální + diagonální, ať se hráč při diagonálním
// pohybu (např. W+D) může dívat/střílet i mezi dvě osy, ne jen po jedné z nich.
export type Direction = "up" | "down" | "left" | "right" | "up-left" | "up-right" | "down-left" | "down-right";

export interface Player {
  x: number;
  y: number;
  radius: number;
  direction: Direction;
  speed: number;
  /** Jestli má hráč vůbec brokovnici — bez ní mezerník nikdy nevystřelí, ať je `ammo` cokoliv (viz resolveEquipmentFromInput/canFireWeapon v logic.ts). */
  hasShotgun: boolean;
  /** Zbývající náboje. Bez brokovnice (`hasShotgun === false`) se normalizuje na 0 (viz resolveEquipmentFromInput). */
  ammo: number;
}

// Chování nepřítele (viz game/minigame/logic.ts#updateEnemyAi):
// "investigating" — jde na přibližný podezřelý bod (investigationTarget),
//   ne přímo na hráče.
// "waiting" — dorazil na podezřelý bod, 2–3 s čeká/hlídá, než zvolí další bod.
// "chasing" — vidí hráče (vision cone + line-of-sight), jde přímo po něm; v
//   blízkém dosahu (shotgunRange) zrychlí o 50 %.
// "wounded" — dočasně omráčený po zásahu brokovnicí (viz stunRemainingMs);
//   přebíjí ostatní tři, nehýbe se, nevyhodnocuje vidění.
// "office_bound" — monstrum zamířilo na kancelář (viz zadání "zamčené
//   dveře", Enemy.officeTarget níže, EmergencyMiniGame.tsx#tick) — přebíjí
//   vidění/honičku hráče (hráč ho STÁLE může vidět/utíkat/střelit, ale
//   monstrum si ho už nevšímá), dokud fyzicky nedorazí k officeTarget
//   NEBO dokud ho zásah nepřevede na "wounded" (po odeznění se vrátí zpět
//   do "office_bound", ne do běžné AI, viz updateEnemyAi v logic.ts).
export type EnemyMode = "investigating" | "waiting" | "chasing" | "wounded" | "office_bound";

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  alive: boolean;
  mode: EnemyMode;
  /** Aktuální cíl "investigating" — přibližný bod poblíž (poslední známé) polohy hráče, NE přesná pozice hráče. */
  investigationTarget: Vec2;
  /** > 0 = zbývá čekat ve "waiting" (viz ENEMY_WAIT_MIN_MS/MAX_MS). */
  waitRemainingMs: number;
  /** > 0 = omráčený po zásahu brokovnicí (viz ENEMY_STUN_DURATION_MS) — nehýbe se, nezpůsobí game over, odpočítává se v ms. */
  stunRemainingMs: number;
  /** Aktuální úhel (rad) výseče vidění nepřítele — navazuje na směr pohybu/cíle/hráče podle módu, viz updateEnemyAi. Libovolný úhel, ne omezený na 8 Direction hodnot (na rozdíl od hráče). */
  visionAngle: number;
  /**
   * Anti-stuck detekce (viz updateEnemyAi/trackStuck v logic.ts) — jen pro
   * "investigating"/"chasing" (módy, kde se má enemy fakticky hýbat).
   * Pozice při poslední kontrole pohybu (každých STUCK_CHECK_INTERVAL_MS).
   */
  stuckCheckPosition: Vec2;
  /** Kolik ms uplynulo od poslední kontroly pohybu — jakmile dosáhne STUCK_CHECK_INTERVAL_MS, porovná se posun a časovač se vynuluje. */
  stuckCheckElapsedMs: number;
  /** Kumulovaný čas (ms), po který se enemy mezi kontrolami posunul méně než STUCK_MOVE_THRESHOLD_PX — >= STUCK_TIMEOUT_MS znamená "zaseknutý o zeď". */
  stuckTotalMs: number;
  /**
   * Trvale `true` od okamžiku, kdy se enemy poprvé zotaví ze zranění
   * (`stunRemainingMs` doběhne na 0, viz updateEnemyAi) — nikdy se nevrací
   * zpět na `false` (jen restart minihry / createInitialEnemy ho vynuluje).
   * Zrychluje "investigating" pohyb na `config.chaseSpeed` místo
   * `config.searchSpeed` (viz updateEnemyAi) — monstrum je po zásahu
   * naštvanější, i když zrovna nehoní hráče na dohled.
   */
  enraged: boolean;
  /**
   * Nastaví se PŘESNĚ jednou za výpravu, jakmile EMERGENCY_MONSTER_OFFICE_TARGET_DELAY_MS
   * uplyne (viz isMonsterOfficeThreatArmed, EmergencyMiniGame.tsx#tick) —
   * monstrum od teď trvale ignoruje hráče a míří sem (updateEnemyAi
   * #office_bound), dokud tam fyzicky nedorazí (viz `mode ===
   * "office_bound"` + kontrola v tick() proti `game.exitZone`) NEBO dokud
   * minihra neskončí. Zůstává nastavené i přes "wounded" mezistav — po
   * odeznění omráčení se monstrum vrátí přímo do "office_bound", NE do
   * běžného investigating/enraged (viz updateEnemyAi). `undefined` =
   * normální AI, žádný commitnutý cíl.
   */
  officeTarget?: Vec2;
}

export type MiniGameStatus = "playing" | "won" | "gameOver";

// ── Kontrakt pro budoucí spuštění z hlavní hry (viz
// components/minigame/EmergencyMiniGame.tsx, app/minihra/page.tsx) — hlavní
// hra (/play) zatím minihru vůbec nespouští, tohle je jen připravené
// rozhraní (vstup/výstup), žádná skutečná integrace.

export type MiniGameObjective = "return_to_office" | "collect_item" | "survive";
export type MiniGameItemId = "fuse" | "bulb" | "key" | "toolbox" | "battery" | "shotgun" | "ammo";
export type MiniGameDifficulty = "easy" | "medium" | "hard";
export type MiniGameStartLocation = "office" | "hall" | "generator";

// ── Mise (viz game/minigame/logic.ts#completeObjective/canReturnToOffice) ──
// Základní smyčka: kancelář → jdu ven → splním úkol → vracím se do kanceláře
// → teprve TEĎ se zavolá onComplete. Sebrání věci samo o sobě minihru
// NEKONČÍ — jen přepne misi do "returning", hráč se pak musí fyzicky vrátit
// do EXIT_ZONE a stisknout E (viz EmergencyMiniGame.tsx#handleObjectiveKey).
export type EmergencyMissionPhase = "outbound" | "returning" | "completed";

export type EmergencyCompletedObjective =
  | { type: "collected_item"; itemId: MiniGameItemId }
  | { type: "reached_location"; locationId: string };

export interface EmergencyMissionState {
  phase: EmergencyMissionPhase;
  /** Vyplní se, jakmile hráč splní dílčí úkol (např. sebere věc) — chybí, dokud mise běží "outbound", i pro objective bez dílčího úkolu (return_to_office). */
  completedObjective?: EmergencyCompletedObjective;
}

// Skutečná výbava hráče na vstupu do minihry (viz
// game/minigame/logic.ts#resolveEquipmentFromInput) — má hráč brokovnici
// vůbec, a kolik do ní má nábojů. Bez brokovnice je minihra čistá skrývačka;
// s brokovnicí, ale bez nábojů, hráč zbraň nosí, ale nemůže vystřelit.
export interface EmergencyMiniGameEquipment {
  hasShotgun: boolean;
  ammo: number;
}

export interface EmergencyMiniGameInput {
  objective: MiniGameObjective;
  /** Jen relevantní pro objective "collect_item" — chybí-li, view/logika použije obecné "item". */
  itemToCollect?: MiniGameItemId;
  /**
   * Doplňkový loot navíc k `itemToCollect` (viz zadání "sandbox výprava",
   * game/minigame/layoutPlacement.ts#resolveMiniGamePlacement) — battery/bulb
   * garantované na každé výpravě, shotgun podmíněně (viz
   * game/core/emergencyMiniGameIntegration.ts#resolveExtraLootItems). Chybí-li/
   * prázdné, mapa má jen `itemToCollect` jako dřív. Volající NIKDY sem
   * nedává stejnou položku jako `itemToCollect` (byla by tak dvakrát).
   */
  extraLootItems?: MiniGameItemId[];
  /** Výbava hráče — chybí-li, default je brokovnice + 1 náboj (viz resolveEquipmentFromInput). */
  equipment?: EmergencyMiniGameEquipment;
  /**
   * @deprecated Nahrazeno `equipment`. Držené jen kvůli zpětné kompatibilitě
   * starších vstupů — `resolveEquipmentFromInput` ho použije POUZE pokud
   * `equipment` chybí (`{ hasShotgun: shots > 0, ammo: shots }`). Nové
   * scénáře/volání už `shots` nepoužívají, viz game/minigame/debugScenarios.ts.
   */
  shots?: number;
  /** Připraveno pro budoucí škálování obtížnosti (rychlost/vidění nepřítele apod.) — MVP gameplay na tomhle zatím nestaví. */
  difficulty?: MiniGameDifficulty;
  /** Připraveno pro budoucí výběr startovní pozice/mapy — MVP vždy startuje na stejném místě bez ohledu na tohle pole. */
  startLocation?: MiniGameStartLocation;
  /**
   * Která datově definovaná mapa (viz game/minigame/layoutTypes.ts,
   * game/minigame/layouts/index.ts) — chybí-li, použije se
   * DEFAULT_MINIGAME_LAYOUT_ID (service_floor_alpha, kompatibilní baseline).
   */
  layoutId?: string;
  /**
   * Seed pro deterministický výběr slotů (start/exit/monster spawn/objective,
   * viz game/minigame/layoutPlacement.ts#resolveMiniGamePlacement) — chybí-li,
   * EmergencyMiniGame.tsx vygeneruje nedeterministický seed sám (viz
   * createRandomSeed v seededRandom.ts); debug scénáře ho dávají explicitně,
   * ať jsou reprodukovatelné.
   */
  seed?: string;
}

// ── Efekty pro hlavní hru (viz
// game/minigame/logic.ts#createWorldEffectsForCompletedObjective) — minihra
// (/play zatím nespouští) je jen PŘIPRAVUJE v resultu, žádné napojení na
// game/core zatím neexistuje. Hlavní hra si je z `returned.worldEffects`
// jednou v budoucnu sama přečte a aplikuje (dobití energie, oprava
// generátoru, ...) — tenhle soubor/typ o tom nic neví a nesmí.
export type EmergencyWorldEffect =
  | { type: "energy_recharged"; amount: number }
  | { type: "generator_repaired" }
  | { type: "bulbs_serviced" }
  | { type: "shotgun_acquired" }
  | { type: "ammo_acquired"; amount: number }
  /**
   * Monstrum si po EMERGENCY_MONSTER_OFFICE_TARGET_DELAY_MS venku
   * netrpělivě počkalo a zamířilo na kancelář/generátor (viz zadání
   * "zamčené dveře", EmergencyMiniGame.tsx#tick) — NENÍ vázané na žádný
   * sebraný item, `createReturnedResult` ho přidá nezávisle na
   * `collectedItems`. Hlavní hra (app/play/page.tsx) na tohle reaguje
   * stejně jako na `officeThreatOnReturn` — posune enemyStage blíž ke
   * dveřím, nikdy nezpůsobí smrt přímo.
   */
  | { type: "monster_reached_office" };

// ── Hrozba přenesená zpět do hlavní hry (viz
// game/minigame/officeThreat.ts#evaluateOfficeThreatOnReturn) — vyhodnotí se
// jen při "returned" (útěk/smrt v minihře žádnou hrozbu nepřenáší, viz
// EmergencyMiniGameResult níže). Hlavní hra (app/play/page.tsx) z tohohle
// PŘELOŽÍ jen `intensity` na vlastní GameAction (APPLY_OFFICE_THREAT_ON_RETURN)
// — game/core/* si tenhle typ NIKDY nesmí importovat (stejná nezávislost
// jako zbytek game/minigame/*, viz komentář nahoře v tomhle souboru).
export type OfficeThreatReason = "monster_chasing" | "monster_near_office" | "monster_near_player";
export type OfficeThreatIntensity = "low" | "medium" | "high";

export interface OfficeThreatOnReturn {
  active: boolean;
  reason: OfficeThreatReason;
  intensity: OfficeThreatIntensity;
}

// "collected_item" už NENÍ finální outcome — sebrání věci je jen mezistav
// mise (viz EmergencyMissionPhase výše). Jediný způsob, jak minihra vrátí
// splněný dílčí úkol volajícímu, je "returned" s vyplněným completedObjective
// (+ odpovídající worldEffects, viz createWorldEffectsForCompletedObjective).
export type EmergencyMiniGameResult =
  | { outcome: "dead"; reason: "monster"; elapsedMs: number; shotsUsed: number }
  | {
      outcome: "returned";
      elapsedMs: number;
      shotsUsed: number;
      completedObjective?: EmergencyCompletedObjective;
      worldEffects?: EmergencyWorldEffect[];
      /** Chybí/`active: false`, pokud monstrum na návrat nemělo vliv — viz evaluateOfficeThreatOnReturn. */
      officeThreatOnReturn?: OfficeThreatOnReturn;
      /**
       * `true`, jen když hráč BĚHEM tyhle výpravy skutečně trefil monstrum
       * brokovnicí (viz isEnemyHit/applyShot) A bezpečně se vrátil —
       * nezávislé na `completedObjective`/`worldEffects` (zásah nesouvisí s
       * tím, co hráč zrovna sbíral). Samotné vystřelení/minutí tohle
       * nenastaví; smrt venku tenhle result vůbec nevznikne (viz outcome
       * "dead"), takže nedokončený zásah se sem nikdy nedostane. Hlavní hra
       * (viz game/core/monsterEnding.ts, app/play/page.tsx) z něj teprve
       * TADY, po návratu, potvrdí zásah — nikdy dřív.
       */
      monsterHit?: boolean;
      /**
       * Všechny věci skutečně sebrané za tuhle výpravu — hlavní objective
       * (pokud byl splněný) I doplňkový loot dohromady (viz zadání "sandbox
       * výprava", EmergencyMiniGameInput.extraLootItems). `worldEffects` se
       * z tohohle pole odvozuje (jeden `worldEffectsForItem` na položku),
       * `collectedItems` samo navíc slouží i pro UI text ("Baterie sebrána.
       * Žárovka sebrána."). Chybí/prázdné, pokud hráč nic nesebral.
       */
      collectedItems?: MiniGameItemId[];
    }
  | { outcome: "failed"; reason: "objective_failed"; elapsedMs: number; shotsUsed: number };
