// Čistá rozhodovací/mapovací vrstva pro inventářové operace se žárovkami
// (viz zadání "profilový kontrakt V1" — oprava architektonické odchylky:
// "KAŽDÁ TRVALÁ INVENTÁŘOVÁ ZMĚNA V HARDCORE MUSÍ BÝT EXPLICITNĚ POTVRZENA
// SERVEREM V OKAMŽIKU, KDY K NÍ DOJDE"). Žádné React, žádný fetch, žádný
// dispatch tady — jen (1) rozhodnutí "lokálně, nebo přes server?" a (2)
// mapování syrového výsledku serverové operace na jednoduchý výsledek, který
// volající (app/play/page.tsx) použije k rozhodnutí o následném dispatchi.
// Skutečné volání Provideru (`consumeBulbs`/`addBulbs`) i dispatch reducer
// akce (`CONFIRM_BULB_REPLACEMENT`) zůstávají v app/play/page.tsx — tahle
// vrstva je odděluje od gameReducer.ts, ne od Reactu úplně.

import { GameMode, GAME_MODE_CONFIG } from "../core/gameMode";
import { Object13PlayerProfileInventoryOperationResult, Object13PlayerProfileLoadState } from "../core/object13PlayerProfile";

export type BulbInventoryPersistenceMode = "local" | "server";

/**
 * "local" = Training nebo anonymní hráč — potvrzení proběhne OKAMŽITĚ, žádné
 * čekání na server. "server" = Hardcore s `ready` profilem — potvrzení musí
 * počkat na explicitní odpověď serveru (viz zadání "ne na konci směny").
 * Hardcore bez `ready` profilu se sem vůbec nedostane (MainMenuScreen.tsx už
 * takový run nepustí spustit), ale kdyby přesto nastalo (VPS spadlo
 * uprostřed běžící směny), volající musí tenhle stav ošetřit zvlášť —
 * viz `resolveBulbInventoryPersistenceMode`'s volající v app/play/page.tsx.
 */
export function resolveBulbInventoryPersistenceMode(
  gameMode: GameMode,
  loadState: Object13PlayerProfileLoadState,
): BulbInventoryPersistenceMode {
  if (GAME_MODE_CONFIG[gameMode].persistInventory && loadState.status === "ready") return "server";
  return "local";
}

export type BulbInventoryOperationState =
  | { status: "idle" }
  | { status: "consuming" }
  | { status: "adding" }
  | { status: "error"; error: string };

export type BulbInventoryConfirmOutcome =
  | { outcome: "confirmed" }
  | { outcome: "insufficient_inventory" }
  | { outcome: "exceeds_maximum" }
  | { outcome: "conflict" }
  | { outcome: "unavailable" };

/**
 * Mapuje syrový výsledek `Object13PlayerProfileProvider#addBulbs`/`consumeBulbs`
 * na jednoduchý výsledek, podle kterého volající rozhodne dispatch
 * (`CONFIRM_BULB_REPLACEMENT`) nebo zamítnutí (`CANCEL_BULB_REPLACEMENT` /
 * žádná akce). `"error"` status (network/jiná neočekávaná chyba) se mapuje
 * na `"unavailable"` — volajícímu na přesném důvodu nezáleží, jde jen o to,
 * že potvrzení nepřišlo a operaci nejde dokončit.
 */
export function deriveBulbInventoryConfirmOutcome(
  result: Object13PlayerProfileInventoryOperationResult,
): BulbInventoryConfirmOutcome {
  switch (result.status) {
    case "updated":
      return { outcome: "confirmed" };
    case "insufficient_inventory":
      return { outcome: "insufficient_inventory" };
    case "exceeds_maximum":
      return { outcome: "exceeds_maximum" };
    case "conflict":
      return { outcome: "conflict" };
    default:
      return { outcome: "unavailable" };
  }
}

export type BulbReplacementConfirmAction =
  | { type: "none" }
  | { type: "confirm_immediately" }
  | { type: "cancel_blocked_needs_reload" }
  | { type: "call_server" };

/**
 * Čisté rozhodnutí "co dělat, když je ruční výměna žárovky u dveří
 * ready-to-confirm" (viz gameReducer.ts#isBulbReplacementReadyToConfirm) —
 * VEŠKERÁ rozhodovací logika efektu v app/play/page.tsx je tady, aby šla
 * plně otestovat bez Reactu/jsdom (viz zadání "16. Testy klientské
 * orchestrace" — "pokud je React orchestrace obtížně testovatelná bez
 * jsdom, odděl ji do čisté state machine"). `app/play/page.tsx` jen volá
 * tuhle funkci a provede odpovídající vedlejší efekt (dispatch/fetch) podle
 * vráceného `type` — žádná vlastní větvící logika navíc.
 *
 * - `"none"`: není co dělat (není ready, nebo už běží jiná operace).
 * - `"confirm_immediately"`: Training/anonymní — rovnou dispatch
 *   CONFIRM_BULB_REPLACEMENT, žádné čekání na server.
 * - `"cancel_blocked_needs_reload"`: dřívější operace skončila nejasně
 *   (`unavailable`) a čeká se na explicitní `reload()` — rozehraná výměna
 *   se zruší beze spotřeby, ať progres nezůstane navěky na 100 %.
 * - `"call_server"`: Hardcore + `ready` profil — teprve PO úspěšné odpovědi
 *   serveru smí volající dispatchnout CONFIRM_BULB_REPLACEMENT.
 */
export function decideBulbReplacementConfirmAction(params: {
  readyToConfirm: boolean;
  operationPending: boolean;
  needsReload: boolean;
  gameMode: GameMode;
  loadState: Object13PlayerProfileLoadState;
}): BulbReplacementConfirmAction {
  if (!params.readyToConfirm) return { type: "none" };
  if (params.operationPending) return { type: "none" };
  if (params.needsReload) return { type: "cancel_blocked_needs_reload" };
  const mode = resolveBulbInventoryPersistenceMode(params.gameMode, params.loadState);
  return mode === "local" ? { type: "confirm_immediately" } : { type: "call_server" };
}
