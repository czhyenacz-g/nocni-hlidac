// Ladicí konstanty pro první směnu. Držet mimo herní logiku, aby šly snadno měnit.

// Verze v patičce (MainMenuScreen.tsx) je teď plně automatická, viz
// game/core/buildInfo.ts#APP_VERSION — žádné ruční verzování tady.

import { EnemyStage } from "../core/types";

export const GAME_TICK_MS = 100;

// Minimální doba (ms), po kterou monstrum musí zůstat ve stage, než ho
// ENEMY_ADVANCE vůbec vezme v úvahu pro běžný pravděpodobnostní hod (viz
// zadání "hráč má reálnou šanci monstrum najít, zapnout sonické dělo a
// reagovat", game/core/monsterMinStay.ts). Chybějící klíč (`outer_yard`,
// `at_door`, `breach`, `attack`) = žádné omezení — `outer_yard` záměrně
// vynechané (zadání explicitně vyjmenovává jen tyhle čtyři), `at_door` má
// svoje vlastní standoff/door chování beze změny (viz doorHoldRangeMs).
// NEBLOKUJE explicitní scriptované přesuny (repely, gave_up, brokovnice,
// office threat, forced-retreat okna) — ty žijí ve vlastních větvích
// gameReducer.ts, které tuhle konstantu vůbec nečtou.
export const MONSTER_MIN_LOCATION_STAY_MS: Partial<Record<EnemyStage, number>> = {
  outside: 6000,
  left_hallway: 5000,
  right_hallway: 5000,
  door_hallway: 4000,
};

// Pravděpodobnosti PŘESNĚ pro jeden ENEMY_ADVANCE hod, kdy je aktivní
// sonické dělo namířené na kameru, na které se monstrum skutečně nachází
// (viz zadání, game/core/sonicCannon.ts#isSonicCannonAffectingEnemy) —
// NAHRAZUJÍ `night.enemy.advanceChance`/`retreatChance` jen pro TENHLE
// jeden hod, normální hodnoty se nijak nemění. Součet musí dát 1.
export const SONIC_CANNON_RETREAT_CHANCE = 0.32;
export const SONIC_CANNON_STAY_CHANCE = 0.6;
export const SONIC_CANNON_ADVANCE_CHANCE = 0.08;

// Jak dlouho (ms) po sonickém "retreat" rozhodnutí zůstane Ghoul VIDITELNĚ na
// PŮVODNÍ (sledované) stage, než se `enemyStage` skutečně přesune (viz
// zadání "sonic hit → přehrání reakce/ústupu v původní lokaci → dokončení
// animace → teprve potom stepBackOneStage"). Bez tohohle okna by se stage
// změnila ve STEJNÉM tiku jako rozhodnutí, takže by
// `getCameraImageSrc#isFleeingRetreat` (cameraAssets.object13.ts) nikdy
// neviděl monstrum na kameře, kterou hráč zrovna sleduje — viz
// GameState.sonicCannonPendingRetreat. Zhruba jeden `enemyTickMs`, ať hráč
// stihne animaci ústupu doopravdy zaregistrovat.
export const SONIC_CANNON_RETREAT_REVEAL_MS = 1500;

export const MAX_POWER = 100;

export const LOW_POWER_THRESHOLD = 25;
export const CRITICAL_POWER_THRESHOLD = 10;

export const FLASHLIGHT_DURATION_MS = 2000;

export const DEBUG_PANEL_ENABLED = true;

// Falešný briefing/loading screen mezi menu a startem směny — viz
// LoadingScreen.tsx a content/loadingHints.ts. Kolik hintů se vybere — jen 1
// (LoadingScreen ukazuje vždy jeden hint, ne víc různých najednou; pokud má
// dvě věty, odhalí je postupně, viz LoadingScreen.tsx#splitSentences).
export const LOADING_SCREEN_DURATION_MS = 4000;
export const LOADING_SCREEN_HINT_COUNT = 1;

// Krátký "reveal" moment před finalizací smrti "door_open_at_attack" — hráč
// uvidí monstrum ve dveřích (door_open_death_0), teprve pak DeathScreen. Viz
// GameState.doorDeathRevealUntilMs, gameReducer.ts ENEMY_ADVANCE/TICK.
export const DOOR_DEATH_REVEAL_DURATION_MS = 500;

// "GAME OVER" reveal na DeathScreen.tsx (viz zadání "vrátit krátký GAME OVER
// reveal před zobrazením restart dialogu") — 4s celoobrazovkový poslední
// attack/death obrázek aktivního monstra (viz game/death/gameOverReveal.ts)
// PŘED existujícím dialogRevealed průběhem téhle obrazovky (ghoul_death
// animace + terminálový dialog, beze změny). TICK v tuhle chvíli už neběží
// (isRunning je false hned jak screen přejde na "death", stejně jako u
// VŠECH ostatních smrtí) — proto se tenhle konkrétní reveal, na rozdíl od
// doorDeathRevealUntilMs/titanOverloadDeathRevealUntilMs výše, časuje
// STEJNÝM stávajícím vzorem jako DeathScreen.tsx#dialogRevealed
// (setTimeout v komponentě), ne novým GameState polem + TICKem.
export const GAME_OVER_REVEAL_DURATION_MS = 4000;

// Titan (viz zadání "Titan pro 15. noc") setrvá v každé běžné route stage
// (mimo "attack"/"graveyard") přesně tuhle dobu, než postoupí o jednu dál
// (viz game/enemies/resolveTitanAdvance.ts) — deterministicky odvozeno z
// existujícího GameState.enemyLocationEnteredAtMs (žádný nový časovací
// mechanismus, viz zadání "6. TITAN TIMER").
export const TITAN_STAGE_STAY_MS = 20_000;

// Noc(i), kdy je aktivní monstrum Titan, už NENÍ jedna pevná konstanta (viz
// zadání "tři náhodná setkání s Titanem během 30 nocí") — nahrazeno
// persistovanou trojicí náhodně vylosovaných čísel, viz
// game/core/titanEncounterNights.ts (`getTitanEncounterNights`/
// `resetTitanEncounterNights`) a game/nights/nightRegistry.ts
// (`resolveNightDefinition(nightNumber, titanNights)`).

// Kroky ústupu (monster_retreat_steps) hrají krátce PO řevu (monster_retreat_roar,
// stejný trigger — monsterRetreatRoarSeq), ne současně — nejdřív leknutí, pak
// slyšitelné vzdalování. Viz app/play/page.tsx.
export const MONSTER_RETREAT_STEPS_DELAY_MS = 400;

// Grace period po návratu z EmergencyMiniGame s aktivní officeThreatOnReturn
// (viz GameState.enemyDoorAttackGraceUntilMs, gameReducer.ts
// APPLY_OFFICE_THREAT_ON_RETURN/ENEMY_ADVANCE, doorEncounter.ts#isDoorAttackGraceActive)
// — po tuhle dobu (ms od návratu) nesmí otevřené dveře + monstrum u dveří
// dokončit smrtelný útok, ať má hráč reálnou šanci dveře zavřít. Zavřené
// dveře blokují útok/spustí door bang stejně jako kdykoliv jindy, grace na
// to nemá vliv. "low" hrozba se k samotným dveřím typicky vůbec nedostane,
// ale i tak dostane krátkou grace pro jistotu (další přirozený postup by ji
// tam mohl brzy dotáhnout).
export const OFFICE_THREAT_GRACE_LOW_MS = 1000;
export const OFFICE_THREAT_GRACE_MEDIUM_MS = 1800;
export const OFFICE_THREAT_GRACE_HIGH_MS = 1500;

// Reakční okno po "monster_reached_office" (viz zadání, EmergencyWorldEffect
// v game/minigame/types.ts, gameReducer.ts APPLY_MONSTER_REACHED_OFFICE_AFTERMATH)
// — monstrum tentokrát FYZICKY doběhlo až ke kanceláři (ne jen "bylo poblíž"
// jako u officeThreatOnReturn výše), hráč proto potřebuje reálně delší čas
// doběhnout ke dveřím než OFFICE_THREAT_GRACE_HIGH_MS. Stejný mechanismus
// (GameState.enemyDoorAttackGraceUntilMs, doorEncounter.ts#isDoorAttackGraceActive),
// jen delší, vlastní konstanta — nemění balancing existující officeThreatOnReturn cesty.
export const OFFICE_BREACH_REACTION_WINDOW_MS = 5_000;

// Bušení do dveří (monster_door_bang, viz GameState.doorBangSeq,
// game/audio/doorBangPlayback.ts#chooseDoorBangPlaybackPlan) — doorBangSeq se
// může zvyšovat opakovaně (monstrum tlačí na zavřené dveře tik za tikem), ale
// samotné PŘEHRÁNÍ zvuku má cooldown proti spamu (viz app/play/page.tsx) —
// gameplay (doorBangSeq samotné) se tímhle nemění, jen audio vrstva navrch.
export const MONSTER_DOOR_BANG_COOLDOWN_MS = 3200;
// Jeden zablokovaný útok zní jako 1 nebo 2 rychle po sobě jdoucí údery (viz
// chooseDoorBangPlaybackPlan) — druhý úder (pokud padne) přijde s náhodným
// zpožděním v tomhle rozsahu, ať to zní přirozeně, ne jako metronom.
export const MONSTER_DOOR_BANG_REPEAT_MIN_DELAY_MS = 180;
export const MONSTER_DOOR_BANG_REPEAT_MAX_DELAY_MS = 320;

// Jak často (ms) se v detailu kamery pomalu prostřídá obrázek bez monstra —
// viz game/cameras/cameraAssets.object13.ts#getCameraImageSrc. Záměrně
// pomalé (ne animace) — jen ať obraz kamery nepůsobí jako jedna mrtvá fotka.
export const CAMERA_IMAGE_CYCLE_MS = 4000;

// O kolik ms se zpozdí blikání šipky "Zkontrolovat generátor" po vstupu do
// generatorState "criticalBeeping" — viz game/core/generatorUrgency.ts.
// Rychlé pípání + rychlý pokles energie mají být jediná okamžitá
// signalizace; blikající tlačítko je až druhotné potvrzení o chvíli později.
export const GENERATOR_URGENT_BLINK_DELAY_MS = 2000;

// Heartbeat/stres vrstva (viz game/audio/heartbeatStress.ts,
// game/audio/useHeartbeatStress.ts) — jak rychle se plynulá stress hodnota
// (0..1) přibližuje k targetStress. Růst rychlejší než pokles: hráč má stres
// pocítit skoro okamžitě, ale uklidnění má být pozvolné, ne skokové.
export const HEARTBEAT_STRESS_RISE_MS = 1000;
// Playtest feedback: pokles působil moc rychle — zpomaleno ~5x (7 s -> 35 s).
export const HEARTBEAT_STRESS_FALL_MS = 35000;

// Dočasné dev zobrazení "Stres: X" v HUDu vedle energie (viz PowerMeter.tsx,
// GameScreen.tsx) — vázané na DEBUG_PANEL_ENABLED (build-time flag), ale
// GameScreen.tsx navíc vyžaduje `debugPanelVisible` (skutečně OTEVŘENÝ
// DebugPanel, ne jen povolený sestavením) — na žádost "pokud nejsem v debug
// modu, odstraň ukazatel stresu", ať se text neplete běžnému hráči do HUDu,
// dokud dev panel skutečně nezapne pravým klikem na "Noc {n}".
export const STRESS_DEV_HUD_ENABLED = DEBUG_PANEL_ENABLED;

// Playtest feedback: heartbeat byl pořád moc tichý i po +12dB boostu souborů
// (viz assets/audio/README.md) — o 20 % hlasitěji, pak po dalším kole ještě o
// 30 % navrch (1.2 -> 1.56), pak ještě o 15 % navrch (1.56 -> 1.794) přes
// tenhle násobič na výsledné computeHeartbeatVolumes (viz heartbeatStress.ts).
export const HEARTBEAT_VOLUME_MULTIPLIER = 1.794;

// Ambient (ambience_loop) se má při vysokém stresu ztišit, ať heartbeat víc
// vynikne — na maximu stresu klesne na tenhle podíl své základní hlasitosti
// (viz computeAmbientStressMultiplier v heartbeatStress.ts).
export const MIN_AMBIENT_STRESS_MULTIPLIER = 0.2;

// Jednorázový (ne akumulující se) bonus stresu, dokud generátor běží ve fázi
// "criticalBeeping" (porucha, rychlé pípání + rychlý pokles nouzové energie)
// — viz computeGeneratorStressBonus v heartbeatStress.ts.
export const BACKUP_POWER_STRESS_BONUS = 20;

// Stejný princip pro "restarting" (hráč omylem restartoval FUNKČNÍ generátor)
// — energie mizí stejně rychle jako u criticalBeeping (viz applyPowerDelta),
// navíc pípání teď taky slyšet (viz updateGenerator v gameReducer.ts), takže
// bonus je vyšší — vyšší stres za vlastní chybu, ne za skutečnou poruchu.
export const GENERATOR_RESTART_STRESS_BONUS = 40;

// Nízká energie sama o sobě zvedá stres/heartbeat (viz computeLowPowerStressBonus
// v heartbeatStress.ts) — nad tímhle procentem energie žádný bonus, pod ním
// +10 stresu za každých dalších 10 % ztráty (49 % -> 10, 39 % -> 20, ...).
export const LOW_POWER_STRESS_NO_BONUS_THRESHOLD_PERCENT = 50;
// Velikost jednoho "schodu" energie (v %), po kterém přibude LOW_POWER_STRESS_NO_BONUS_THRESHOLD_PERCENT
// další bonus — 10 % energie = jeden schod.
export const LOW_POWER_STRESS_BUCKET_PERCENT = 10;
// Při 0 % energie musí být výsledný stres na maximu bez ohledu na ostatní
// faktory (poloha/generátor) — dost vysoký bonus, ať `Math.min(100, ...)`
// součet v useHeartbeatStress.ts vždycky ořízne na 100.
export const LOW_POWER_STRESS_MAX_BONUS = 100;

// Horor efekt: při vyšším stresu ubývá "Čas do úsvitu" pomaleji (subjektivně
// se noc vleče) — viz game/core/stressTimeScale.ts#computeStressTimeScale.
// Nikdy neskáče čas nahoru, jen zpomaluje odpočet; 0 = normální rychlost,
// MAX_STRESS_TIME_SLOWDOWN = maximální zpomalení při stresu 100 %.
export const STRESS_TIME_SLOWDOWN_ENABLED = true;
export const MAX_STRESS_TIME_SLOWDOWN = 0.5;

// Ruční výměna prasklé žárovky (viz game/core/types.ts BulbReplacementState,
// gameReducer.ts, DoorView.tsx) — jak dlouho (ms) trvá, než se žárovka opraví.
// Zkráceno na žádost z 10 s na 7 s.
export const BULB_REPLACE_DURATION_MS = 7_000;
// Jak dlouho (ms) po úspěšném dokončení výměny zůstane v DoorView vidět
// krátká potvrzovací hláška ("Žárovka vyměněna.", viz DoorView.tsx,
// bulbReplaceSuccessSeq) — čistě kosmetický, lokální React timeout v
// komponentě, ne herní stav (na rozdíl od progresu výměny samotné).
export const BULB_REPLACE_SUCCESS_MESSAGE_MS = 1800;

// Jak dlouho (ms) zůstane v GeneratorView vidět posměšná hláška po zbytečném
// restartu FUNKČNÍHO generátoru (viz GameState.generatorAccidentalRestartSeq,
// content/copy.ts generatorAccidentalRestartMessage) — stejný čistě kosmetický
// lokální React timeout vzor jako BULB_REPLACE_SUCCESS_MESSAGE_MS výše.
export const GENERATOR_ACCIDENTAL_RESTART_MESSAGE_MS = 2500;

// Jak dlouho (ms) zůstane v LeftWallView vidět hláška po kliknutí na dávkovač
// munice BEZ brokovnice (viz content/copy.ts#requestAmmoNoWeaponLabel) —
// stejný čistě kosmetický lokální React timeout vzor jako
// BULB_REPLACE_SUCCESS_MESSAGE_MS/GENERATOR_ACCIDENTAL_RESTART_MESSAGE_MS výše.
export const REQUEST_AMMO_NO_WEAPON_MESSAGE_MS = 2500;

// Jak dlouho (ms) PowerMeter.tsx animuje výplň postupně po RECHARGE_POWER
// (viz zadání "uspokojivý efekt" po přinesení baterie, GameState.powerRechargeSeq)
// — čistě vizuální CSS transition-duration, ne herní stav. Normální
// odčerpávání energie v TICKu zůstává bez animace (mění se plynule každý
// snímek samo o sobě), tahle delší tranzice se aplikuje jen na tenhle jeden
// diskrétní skok.
export const POWER_RECHARGE_ANIMATION_MS = 2000;

// Nouzová výprava "Jít ven" (viz game/core/types.ts EmergencyRunWindupState,
// gameReducer.ts, LeftWallView.tsx) — stejný "drž tlačítko, ať to má cenu"
// vzor jako ruční výměna žárovky výše: hráč musí tlačítko držet
// EMERGENCY_RUN_WINDUP_DURATION_MS, než se EmergencyMiniGame skutečně spustí
// (viz app/play/page.tsx#handleStartEmergencyRunWindup) — po tu dobu dál běží
// normální herní smyčka (TICK/ENEMY_ADVANCE), takže hráč je stejně jako u
// výměny žárovky reálně v ohrožení, ne jen "čeká na loading".
export const EMERGENCY_RUN_WINDUP_DURATION_MS = 3000;

// "Nechat si to projít hlavou" (viz zadání) — vedlejší tlačítko na left_wall,
// vidět jen s brokovnicí (GameState.hasShotgun), stejný "drž tlačítko" vzor
// jako EMERGENCY_RUN_WINDUP_DURATION_MS výše, jen delší a bez spuštění
// minihry na konci — po dokončení se jen zobrazí hláška (viz
// game/core/types.ts ThinkItOverWindupState, app/play/page.tsx).
export const THINK_IT_OVER_WINDUP_DURATION_MS = 10_000;

// "PŘETÍŽIT GENERÁTOR" (viz GeneratorView.tsx, gameReducer.ts
// START_GENERATOR_OVERLOAD_WINDUP/START_GENERATOR_OVERLOAD) — hráč tlačítko
// drží GENERATOR_OVERLOAD_WINDUP_DURATION_MS (STEJNÁ hodnota jako
// EMERGENCY_RUN_WINDUP_DURATION_MS výše — "stejný mechanismus jako Nouzové
// opuštění kanceláře", viz zadání; vlastní konstanta jen ať jde odemknutí
// tlačítka a jeho trvání laďovat nezávisle na emergency run, kdyby se to v
// budoucnu rozešlo). Po doběhnutí držení následuje samotné přetížení, které
// trvá GENERATOR_OVERLOAD_DOOR_DURATION_MS — po tu dobu se generátor chová
// energeticky stejně jako "restarting" (viz gameReducer.ts#updateGenerator,
// beze změny té logiky) a dveře zůstávají zamčené na door_generator_overload
// obrázku, než se na konci nevratně zničí (GameState.doorDestroyed).
export const GENERATOR_OVERLOAD_WINDUP_DURATION_MS = EMERGENCY_RUN_WINDUP_DURATION_MS;
export const GENERATOR_OVERLOAD_DOOR_DURATION_MS = 10_000;

// Titan zabitý přetížením u dveří (viz gameReducer.ts#updateDoorGeneratorOverload,
// EnemyStage "graveyard") — čistě prezentační "reveal" mrtvého Titana
// (titan_doors_overdrive_5.webp + potvrzující zpráva v DoorView.tsx), NEnÍ
// gameplay stav (neovlivňuje monsterDefeated/isRunning/screen, viz zadání).
// Stejný "krátký pevný reveal po rozhodnutém výsledku" vzor jako
// DOOR_DEATH_REVEAL_DURATION_MS výše, jen delší a bez vlivu na smrt hráče.
export const TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS = 3000;

// Sekvence útoku/smrti (viz app/play/page.tsx, efekt na state.screen ===
// "death", AUDIO_DESIGN.md "Ticho před lekačkou"): ambience plynule ztlumí
// přes AMBIENCE_DEATH_FADE_MS, pak JUMPSCARE_SILENT_GAP_MS ticha, teprve
// potom zahraje jumpscare — ticho těsně před lekačkou je součást efektu, ne
// jen okamžik navíc.
export const AMBIENCE_DEATH_FADE_MS = 300;
export const JUMPSCARE_SILENT_GAP_MS = 200;

// Poslední fáze blackoutu (viz getBlackoutPhaseIndex, AUDIO_DESIGN.md
// "Blackout") už nehraje žádný zvuk navíc — místo toho ambient plynule
// doztichne úplně, ať hráč čeká na smrt potichu, ne s dalším efektem.
export const BLACKOUT_FINAL_AMBIENCE_FADE_MS = 600;

// Jak dlouho po dokončení death sekvence (viz components/death/DeathSequenceOverlay.tsx,
// game/death/liveDeathSequenceConfig.ts) zůstane naposledy zobrazený frame
// (monster image + GAME OVER, zamrzlý po fázi "complete") vidět, než se
// namountuje DeathScreen s dialogem "Předčasný konec směny" (viz
// app/play/page.tsx, zadání "ať hráč nejdřív vidí obrázek s monstrem"). Jen
// pro živou hru — /death-test svůj vlastní DEATH_SEQUENCE_COMPLETE_AFTER_MS
// timing (viz deathSequenceTiming.ts) tímhle neovlivňuje.
export const DEATH_SCREEN_REVEAL_DELAY_MS = 2000;

// Krátká tichá pauza mezi smrtí v Noci 1 a zobrazením cinematic scény (viz
// content/cinematics.ts, app/play/page.tsx) — ambience se ztlumí (sdílené s
// AMBIENCE_DEATH_FADE_MS výše), pak tahle pauza, teprve pak CinematicScreen.
// Jen pro Noc 1, ne pro plošnou death sekvenci.
export const CINEMATIC_PRE_DELAY_MS = 1000;

// Achievement toast (viz components/game/AchievementToast.tsx) — jak dlouho
// zůstane plně vidět, než začne mizet, a jak dlouho trvá samotný
// slide-in/slide-out přechod (opacity + transform). Součet je celková doba
// "cca 4 sekundy" ze zadání.
export const ACHIEVEMENT_TOAST_VISIBLE_MS = 3600;
export const ACHIEVEMENT_TOAST_TRANSITION_MS = 400;
