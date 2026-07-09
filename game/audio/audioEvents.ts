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
} as const;

export type AudioEventId = (typeof AUDIO_EVENTS)[keyof typeof AUDIO_EVENTS];
