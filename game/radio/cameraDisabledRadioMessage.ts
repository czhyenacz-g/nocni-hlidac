/**
 * Malá, samostatná definice rádiové zprávy pro vyřazení kamery Ghoulem (viz
 * zadání) — ZÁMĚRNĚ NENÍ napojená na `game/audio/audioEvents.ts`/
 * `audioConfig.ts` jako `monsterRepelRadioMessages.ts`/`releaseMonsterMessages.ts`
 * (`id: AudioEventId`) — tahle zpráva zatím nemá žádný zvukový soubor a
 * nemá se pro ni ani generovat fallback synth (viz zadání "v této úpravě
 * žádný zvuk negeneruj"). `text` je zdroj pravdy, `audioSrc` je jen
 * budoucí metadata.
 *
 * Až přibude reálný soubor: zaregistruj ho jako nový `AUDIO_EVENTS`/
 * `AUDIO_CONFIG` event (stejná konvence jako zbytek projektu, viz CLAUDE.md
 * "Nový zvuk = nový event + config, ne `new Audio()` přímo"), nastav sem
 * `audioSrc` na jeho cestu, a v `useCameraDisabledRadioMessage.ts` přidej
 * `audioManager.play(<ten nový AudioEventId>)` vedle zobrazení textu.
 * Skutečné přehrávání VŽDY jde přes `audioManager`, nikdy přímo `new Audio()`.
 */
export interface CameraDisabledRadioMessage {
  id: string;
  text: string;
  audioSrc: string | null;
}

export const GHOUL_CAMERA_DISABLED_MESSAGE: CameraDisabledRadioMessage = {
  id: "ghoul-camera-disabled",
  text: "To monstrum vyřadilo kameru! Opravit to půjde až ráno!",
  audioSrc: null,
};

/** Cca 4-5s (viz zadání) — mírně delší než sonic-cannon rádiové hlášky, ať hráč stihne text v klidu přečíst. */
export const CAMERA_DISABLED_OVERLAY_DURATION_MS = 4500;
