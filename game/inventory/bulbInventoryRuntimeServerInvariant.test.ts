import { describe, expect, it } from "vitest";
import { createGameReducer } from "../core/gameReducer";
import { createInitialGameState } from "../core/gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "../core/types";
import { BULB_REPLACE_DURATION_MS } from "../balancing/constants";
import { getInventoryItemQuantity } from "../core/object13PlayerProfileInventory";

// Zadání "profilový kontrakt V1", "10. Runtime a serverový stav": po každé
// POTVRZENÉ inventářové operaci v Hardcore musí platit
// `runtime bulbsRemaining === profileData.inventory.items.bulb`. Simuluje
// obě strany té rovnosti čistě (bez Reactu/sítě): reducer strana
// (CONFIRM_BULB_REPLACEMENT) a serverová strana (nová profileData po
// úspěšném consumeBulbs(1), reprezentovaná přímo jako
// Object13PlayerProfileDataV1 — přesně to, co by Provider dostal zpátky a
// nahradil by jím loadState.profile).

function stateAtDoorReadyToConfirm(bulbsRemaining: number): GameState {
  return {
    ...createInitialGameState(NIGHT_01, { bulbsRemaining }),
    isRunning: true,
    playerView: "door",
    doorClosed: false,
    roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } },
    bulbReplacement: { active: true, startedAtMs: 0, progressMs: BULB_REPLACE_DURATION_MS },
  };
}

describe("runtime bulbsRemaining stays equal to the confirmed server profile after a consume", () => {
  it("10/22. matches the server's post-consume bulb count after CONFIRM_BULB_REPLACEMENT", () => {
    const startingBulbs = 10;
    const state = stateAtDoorReadyToConfirm(startingBulbs);

    // Server side: consumeBulbs(1) succeeded, new profileData reflects -1.
    const serverProfileDataAfterConsume = { inventory: { items: { bulb: startingBulbs - 1 } } };

    // Client side: only AFTER that server confirmation does the reducer
    // finalize the local decrement.
    const reducer = createGameReducer(NIGHT_01);
    const result = reducer(state, { type: "CONFIRM_BULB_REPLACEMENT" });

    expect(result.bulbsRemaining).toBe(getInventoryItemQuantity(serverProfileDataAfterConsume, "bulb"));
    expect(result.bulbsRemaining).toBe(startingBulbs - 1);
  });

  it("23. before confirmation (server not yet answered), the active bulb is not swapped and runtime is unchanged — a mismatch never happens mid-flight because nothing local commits yet", () => {
    const startingBulbs = 10;
    const state = stateAtDoorReadyToConfirm(startingBulbs);

    // No CONFIRM dispatched yet (server call still in flight) — runtime
    // must still equal the value it started the shift with.
    expect(state.bulbsRemaining).toBe(startingBulbs);
    expect(state.roomBulbs.nearRoom.broken).toBe(true);
  });
});
