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
  bulbBreak: "bulb_break",
  bulbReplaceSuccess: "bulb_replace_success",
} as const;

export type AudioEventId = (typeof AUDIO_EVENTS)[keyof typeof AUDIO_EVENTS];
