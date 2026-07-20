// Jmenné konstanty zvukových událostí. UI a herní logika je používají místo syrových řetězců.
export const AUDIO_EVENTS = {
  ambienceLoop: "ambience_loop",
  heartbeat: "heartbeat",
  heartbeatStressSlow: "heartbeat_stress_slow",
  heartbeatStressFast: "heartbeat_stress_fast",
  doorClose: "door_close",
  doorOpen: "door_open",
  lightClick: "light_click",
  enemyStep: "enemy_step",
  enemyNear: "enemy_near",
  powerLow: "power_low",
  jumpscare: "jumpscare",
  shiftWin: "shift_win",
  uiClick: "ui_click",
  generatorBeep: "generator_beep",
  monsterRetreatRoar: "monster_retreat_roar",
  // Bušení do dveří, když monstrum u zavřených dveří útočí, ale dveře ho
  // zablokují (viz game/core/doorEncounter.ts#isDoorAttackBlockedByClosedDoor,
  // GameState.doorBangSeq) — potvrzení nárazu, ne jumpscare výkřik.
  monsterDoorBang: "monster_door_bang",
  // Kroky monstra při ústupu po repelu světlem (viz monsterRetreatRoarSeq) —
  // hraje krátce po monsterRetreatRoar, ne samostatně spouštěné.
  monsterRetreatSteps: "monster_retreat_steps",
  blackoutHowl: "blackout_howl",
  // Blackout scare sequence (viz GameState.blackoutPhaseSeq/blackoutRoarSeq,
  // gameReducer.ts TICK "gameStatus === blackout") — vzdálené/blížící se
  // kroky v místnosti bez proudu mají znít jako těžká přítomnost, ne jako
  // normální enemyStep/enemyNear za denního provozu, proto vlastní eventy.
  blackoutStepsFar: "blackout_steps_far",
  blackoutStepsNear: "blackout_steps_near",
  // Krátce PŘED finálním jumpscare/smrtí (viz BlackoutDefinition.roarLeadMs) —
  // odlišené od monsterRetreatRoar (ústup) i jumpscare (samotná smrt).
  blackoutMonsterRoar: "blackout_monster_roar",
  bulbBreak: "bulb_break",
  bulbReplaceSuccess: "bulb_replace_success",
  // Zásah monstra brokovnicí v EmergencyMiniGame (viz
  // components/minigame/EmergencyMiniGame.tsx#fireShot, isEnemyHit) — krátký
  // bolestivý řev, ne smrtelný jumpscare (monstrum je jen "wounded", ne mrtvé).
  monsterWounded: "monster_wounded",
  // Sebrání lootu v EmergencyMiniGame (baterie/žárovka/brokovnice, viz
  // shouldAutoCollectItem/extraLoot v EmergencyMiniGame.tsx) — hlasitější
  // varianta uiClick, ať sběr věci má jasnou zvukovou odezvu.
  itemPickup: "item_pickup",
  // Držení tlačítka "Nouzově opustit místnost" (viz zadání,
  // GameState.emergencyRunWindup, app/play/page.tsx efekt na
  // state.emergencyRunWindup.active) — poplašná siréna, hraje jen po dobu
  // držení, ne jednorázově.
  emergencyRunSiren: "emergency_run_siren",
  // Výběr HARDCORE na hlavním menu (viz zadání, MainMenuScreen.tsx
  // #handleSelectHardcore) — krátký řev monstra místo obyčejného uiClick,
  // ať volba nejtěžšího režimu má vlastní výraznou zvukovou odezvu.
  hardcoreSelectRoar: "hardcore_select_roar",
  // Finální potvrzený zásah monstra — hidden true ending (viz
  // game/core/monsterEnding.ts, EmergencyMiniGame.tsx#fireShot
  // isMonsterHitFinal). Znamená SMRT, ne ústup — NIKDY nezaměňovat s
  // monsterRetreatRoar (to je jen dočasné odehnání, monstrum se vrací).
  monsterFinalDeathRoar: "monster_final_death_roar",
  // Nová dosažení na výsledkové obrazovce (viz zadání "Napojit achievementy
  // na výsledkové obrazovky", components/achievements/AchievementResultPanel.tsx) —
  // hraje NEJVÝŠ jednou na obrazovku, bez ohledu na to, kolik achievementů
  // se zobrazí najednou. Nikdy během aktivní hry, nikdy na /profile.
  achievementUnlock: "achievement_unlock",
  // ── Death sekvence (viz zadání "6. úkol" + "dodělej zvuky do /death-test",
  // components/death/DeathSequenceOverlay.tsx, game/death/deathSequenceConfig.ts) ──
  // Čtyři samostatné eventy podle čtyř volume posuvníků v DeathTestControls.tsx
  // (roarVolume/impactVolume/glitchVolume/deathVolume) — VLASTNÍ, ne sdílené s
  // jumpscare/monsterFinalDeathRoar, ať ladění na /death-test nikdy neovlivní
  // hlasitost skutečných herních zvuků (audioManager.setVolume mění hlasitost
  // trvale, ne jen pro jedno přehrání). Zatím používá jen /death-test — napojení
  // na skutečné smrti (a případné sjednocení s existujícími eventy) je
  // samostatný budoucí krok.
  //
  // Řev monstra na "impact" fázi (shake začíná) — spolu s deathSequenceImpact.
  deathSequenceRoar: "death_sequence_roar",
  // Fyzický "úder"/rána na "impact" fázi — nižší, kratší než roar, hraje spolu s ním.
  deathSequenceImpact: "death_sequence_impact",
  // Rušení signálu na "death_frame" fázi (kdy se zobrazí "SIGNÁL ZTRACEN").
  deathSequenceGlitch: "death_sequence_glitch",
  // Finální "je konec" stinger na "game_over" fázi (kdy se zobrazí "GAME OVER").
  deathSequenceFinal: "death_sequence_final",
  // ── Rádiová hláška "vypuštění monstra" (viz zadání "první jednoduchá verze
  // rádia", game/radio/releaseMonsterMessages.ts, game/radio/useRadioMessage.ts) ──
  // 11 samostatných eventů, ne jeden sdílený s dynamickým src — AudioManager
  // mapuje id na PŘEDEM načtený <audio> element 1:1 (viz audioManager.ts#init),
  // žádné přepínání src za běhu. Náhodný výběr jednoho z nich řeší
  // game/radio/releaseMonsterMessages.ts#pickRandomReleaseMonsterMessage,
  // TADY je jen samotná sada eventů/souborů.
  radioReleaseMonster01: "radio_release_monster_01",
  radioReleaseMonster02: "radio_release_monster_02",
  radioReleaseMonster03: "radio_release_monster_03",
  radioReleaseMonster04: "radio_release_monster_04",
  radioReleaseMonster05: "radio_release_monster_05",
  radioReleaseMonster06: "radio_release_monster_06",
  radioReleaseMonster07: "radio_release_monster_07",
  radioReleaseMonster08: "radio_release_monster_08",
  radioReleaseMonster09: "radio_release_monster_09",
  radioReleaseMonster10: "radio_release_monster_10",
  radioReleaseMonster11: "radio_release_monster_11",
  // ── Rádiová hláška "reakce na sonické dělo" (viz zadání, game/core/sonicCannon.ts,
  // game/radio/monsterRepelRadioMessages.ts) — tři kanonické kategorie
  // (success/stay/fail podle GameState.lastSonicCannonResult), každá s
  // vlastní sadou variant, stejný "1 event = 1 předem načtený <audio>
  // element" důvod jako radioReleaseMonster* výše.
  radioMonsterRepelSuccess0: "radio_monster_repel_success_0",
  radioMonsterRepelSuccess1: "radio_monster_repel_success_1",
  radioMonsterRepelSuccess2: "radio_monster_repel_success_2",
  radioMonsterRepelSuccess3: "radio_monster_repel_success_3",
  radioMonsterRepelStay0: "radio_monster_repel_stay_0",
  radioMonsterRepelStay1: "radio_monster_repel_stay_1",
  radioMonsterRepelStay2: "radio_monster_repel_stay_2",
  radioMonsterRepelFail0: "radio_monster_repel_fail_0",
  radioMonsterRepelFail1: "radio_monster_repel_fail_1",
  radioMonsterRepelFail2: "radio_monster_repel_fail_2",
  // Provozní bzučení sonického děla, dokud state.sonicCannonActive === true
  // (viz zadání "doladit sonické dělo") — vlastní loop event, žádné sdílení
  // s ambienceLoop/heartbeat*. Cvaknutí při zapnutí/vypnutí ZÁMĚRNĚ NEMÁ
  // vlastní event — znovupoužívá existující `lightClick` (viz
  // app/dev-sound/soundRegistry.ts, "Cvaknutí vypínače" sedí i sem).
  sonicCannonHum: "sonic_cannon_hum",
  // ── Dávkovač munice na LeftWallView.tsx (viz zadání "systém brokovnice a
  // přebíjení") — tři samostatné eventy. ammoDispenseClick = úspěšné přidání
  // náboje. ammoRequestRejected = kliknutí bez efektu (sdílený pro OBA
  // odmítací případy — plná zbraň i žádná zbraň zatím nalezená — stejná
  // "click dá zvukovou odezvu, ne ticho" konvence jako emergency-run
  // tlačítko se zavřenými dveřmi, ale funkčně jde o stejné "nic se
  // nestalo" odmítnutí, ne dva různé stavy hodné vlastního zvuku).
  // weaponEmptyClick = pokus o výstřel v EmergencyMiniGame.tsx#fireShot bez
  // náboje (viz applyShot#fired === false) — hráč zůstává v minihře, musí
  // se fyzicky vrátit a dobít.
  ammoDispenseClick: "ammo_dispense_click",
  ammoRequestRejected: "ammo_request_rejected",
  weaponEmptyClick: "weapon_empty_click",
  // ── Vzácný útok Ghoula na kameru (viz zadání, game/core/cameraDamage.ts) ──
  // Dva samostatné eventy podle dvou seq počítadel (GameState.cameraAttackStartedSeq/
  // cameraOfflineSeq) — začátek poškozování (idle -> attacking) a úplné
  // přerušení signálu (attacking -> offline), stejný "jeden event na jednu
  // diskrétní událost" vzor jako doorBang/bulbBreak/monsterRetreatRoar.
  cameraDamageStart: "camera_damage_start",
  cameraSignalLost: "camera_signal_lost",
  // Kroky Ghoula z mikrofonu offline kamery (viz zadání "vyřazení kamery
  // znamená pouze ztrátu obrazu, ne zvuku") — existující candidate asset
  // (freesound.org/people/SecureSubset/sounds/813622/, CC0, dosud jen v
  // /dev-sound candidate listu, žádný duplicitní soubor, viz audioConfig.ts).
  disabledCameraFootsteps: "disabled_camera_footsteps",
  // Rádiová hláška "kamera zničena" (viz zadání, game/radio/cameraDisabledRadioMessage.ts)
  // — tři skutečně namluvené varianty (camera_destroid_full_1.wav, přepsáno
  // přes Whisper — viz TECH_DESIGN.md), náhodný výběr jedné při každém
  // dokončeném vyřazení kamery, stejný "1 event = 1 předem načtený <audio>
  // element" vzor jako radioReleaseMonster*/radioMonsterRepel*.
  radioCameraDestroyed0: "radio_camera_destroyed_0",
  radioCameraDestroyed1: "radio_camera_destroyed_1",
  radioCameraDestroyed2: "radio_camera_destroyed_2",
  // Krátký řev/zavytí Ghoula PŘESNĚ v okamžiku, kdy začne útočit na kameru
  // (viz GameState.cameraAttackStartedSeq, game/radio/ghoulCameraAttackWarningMessage.ts)
  // — dvě varianty, náhodný výběr jedné při každém útoku (stejný "1 event =
  // 1 předem načtený <audio> element" vzor jako radioCameraDestroyed*/
  // radioMonsterRepel*), hraje SOUČASNĚ s cameraDamageStart (elektronický
  // "začátek poškození" zvuk výše) — vrstva stvůry navrch vrstvy techniky.
  ghoulCameraAttackWarning0: "ghoul_camera_attack_warning_0",
  ghoulCameraAttackWarning1: "ghoul_camera_attack_warning_1",
  // Titanův útěk (viz zadání "5 hlášek namluvených v tomto pořadí",
  // game/radio/titanEscapeMessages.ts) — pět skutečně namluvených variant,
  // NÁHODNĚ vybraná JEDNA se přehraje přesně jednou při ZAHÁJENÍ Titanova
  // setkání (ne při každé změně stage), stejný "1 event = 1 předem načtený
  // <audio> element" vzor jako radioReleaseMonster*/radioMonsterRepel*.
  // Nahrazuje dřívější dlouhou vícekrokovou tutorialovou/kontextovou
  // rádiovou vrstvu (viz git historie) — jedna krátká hláška místo
  // postupných nápověd napříč Titanovou trasou.
  titanEscape01: "titan_escape_01",
  titanEscape02: "titan_escape_02",
  titanEscape03: "titan_escape_03",
  titanEscape04: "titan_escape_04",
  titanEscape05: "titan_escape_05",
  // Titanovy kroky na štěrku (viz zadání "Titan nemá během přibližování
  // správné kroky a stres") — smyčka po celou dobu aktivního encounteru
  // (isTitanEncounterActive, viz game/core/titanEncounter.ts), hlasitost se
  // plynule mění podle Titanovy stage (viz game/audio/titanFootsteps.ts).
  // Soubor byl už dřív připravený jako "budoucí gigant" kandidát (viz
  // app/dev-sound/page.tsx historie) — teď skutečně použitý pro Titana,
  // žádná duplicitní kopie souboru (viz audioConfig.ts).
  titanFootsteps: "titan_footsteps",
} as const;

export type AudioEventId = (typeof AUDIO_EVENTS)[keyof typeof AUDIO_EVENTS];
