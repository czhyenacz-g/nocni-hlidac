// Jmenné konstanty zvukových událostí. UI a herní logika je používají místo syrových řetězců.
export const AUDIO_EVENTS = {
  ambienceLoop: "ambience_loop",
  cameraNoise: "camera_noise",
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
  generatorWarningBeep: "generator_warning_beep",
  monsterRetreatRoar: "monster_retreat_roar",
} as const;

export type AudioEventId = (typeof AUDIO_EVENTS)[keyof typeof AUDIO_EVENTS];
