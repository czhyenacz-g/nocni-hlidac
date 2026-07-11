// Odvozený stav (viz CLAUDE.md "odvozený stav patří do samostatné čisté
// funkce") — které menu pozadí zobrazit, spočítané čistě z existujících
// vstupů (Discord login stav + trvalá monster defeat odměna, viz
// game/core/monsterDefeatReward.ts), ne rozeseté podmínky přímo v
// MainMenuScreen.tsx.

export type MainMenuBackgroundKind = "default" | "login" | "post_monster";

export interface ResolveMainMenuBackgroundInput {
  isDiscordLoggedIn: boolean;
  hasDefeatedMonster: boolean;
  doubleBarrelUnlocked: boolean;
}

/**
 * Priorita (viz zadání):
 * 1. `post_monster` — trvalá veteran odměna (hasDefeatedMonster NEBO
 *    doubleBarrelUnlocked) má vždy přednost, nezávisle na Discord loginu.
 *    Login pozadí ji NIKDY nesmí přebít.
 * 2. `login` — přihlášený přes Discord, ale ještě bez veteran odměny.
 * 3. `default` — nepřihlášený hráč bez odměny.
 */
export function resolveMainMenuBackground(input: ResolveMainMenuBackgroundInput): MainMenuBackgroundKind {
  if (input.hasDefeatedMonster || input.doubleBarrelUnlocked) return "post_monster";
  if (input.isDiscordLoggedIn) return "login";
  return "default";
}
