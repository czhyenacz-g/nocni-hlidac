// Čisté mapování stisknutých kláves na pohybový vektor — žádné
// addEventListener tady, to dělá app/dev/multiplayer-survival/page.tsx.
// Oddělené od React vrstvy, ať je testovatelné bez DOM.

export interface KeyboardMoveState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  firing: boolean;
}

export const EMPTY_KEYBOARD_MOVE_STATE: KeyboardMoveState = { up: false, down: false, left: false, right: false, firing: false };

/** Normalizovaný (-1..1) pohybový vektor z aktuálně stisknutých kláves — diagonální pohyb NENÍ rychlejší (dělené odmocninou ze 2). */
export function resolveMoveVectorFromKeys(keys: KeyboardMoveState): { moveX: number; moveY: number } {
  const rawX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const rawY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (rawX === 0 && rawY === 0) return { moveX: 0, moveY: 0 };
  const length = Math.sqrt(rawX * rawX + rawY * rawY);
  return { moveX: rawX / length, moveY: rawY / length };
}
