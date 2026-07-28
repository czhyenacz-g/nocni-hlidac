// Headless engine vstup pro multiplayer-survival prototyp (viz README.md) —
// žádný React, žádná route, žádný websocket. Deterministický, pokud je
// `rng` dodané zvenku (stejný princip jako game/minigame/logic.ts). Jde
// spustit v testu bez DOM (viz engine/tick.test.ts).
//
// Veškerá geometrie/kolize/AI/pickup timing je IMPORTOVANÁ přímo z
// game/minigame/logic.ts (moveWithWallSliding, isEnemyHit, circlesTouch,
// directionFromVector, updateLootingProgressMs) — žádná duplikace téhle
// logiky tady, viz README.md "Co bylo importováno z původní minihry".

import { circlesTouch, directionFromVector, isEnemyHit, moveWithWallSliding, updateLootingProgressMs } from "../../minigame/logic";
import { tickMonsterAi } from "../ai/monsterAi";
import { PROTOTYPE_MAP, PROTOTYPE_MONSTER_SPAWNS, PROTOTYPE_PICKUPS, PROTOTYPE_PLAYER_SPAWNS } from "../maps/prototypeMap";
import { AMMO_START, CONE_ANGLE_RAD, CONE_RANGE, ENEMY_RADIUS, ITEM_RADIUS, LOOT_PICKUP_DURATION_MS, PLAYER_RADIUS, PLAYER_SPEED, ROUND_DURATION_MS, SHOT_FLASH_DURATION_MS } from "./config";
import { MonsterState, MultiplayerSurvivalInputs, MultiplayerSurvivalState, PickupState, PlayerState } from "../state/types";

/**
 * `playerIds`/`monsterIds` řídí, kolik entit počáteční stav dostane — dnes
 * volané vždy s jedním hráčem a jedním monstrem (viz zadání "minimální
 * hratelný základ"), ale `players`/`monsters` jsou pole od začátku, ať
 * přidání druhého hráče/monstra později není zásah do datového modelu.
 * Spawny se berou ze skutečných slotů skladového patra (viz maps/prototypeMap.ts)
 * — pokud je hráčů/monster víc, než má mapa slotů, další se rozmístí s
 * malým odsazením od posledního reálného slotu (mapa má dnes jen jeden
 * `player_start`).
 */
export function createInitialMultiplayerSurvivalState(playerIds: string[] = ["player-1"], monsterIds: string[] = ["monster-1"]): MultiplayerSurvivalState {
  const players: PlayerState[] = playerIds.map((id, index) => {
    // Mapa má dnes jen jeden reálný `player_start` slot (office_start_01) —
    // další hráči navíc se odsadí jen na ose X, uvnitř kanceláře (room
    // "office" má x 560-840), ať odsazení nevystrčí spawn mimo mapu/do zdi
    // (kancelář je jen 80px vysoká místnost při spodním okraji mapy, takže
    // odsazení na Y by snadno přeteklo přes mapWidth/mapHeight clamp).
    const spawn = PROTOTYPE_PLAYER_SPAWNS[index] ?? { x: PROTOTYPE_PLAYER_SPAWNS[0].x + index * 30, y: PROTOTYPE_PLAYER_SPAWNS[0].y };
    return {
      id,
      x: spawn.x,
      y: spawn.y,
      radius: PLAYER_RADIUS,
      direction: "up",
      speed: PLAYER_SPEED,
      alive: true,
      hasShotgun: true,
      ammo: AMMO_START,
      shotFlashRemainingMs: 0,
      lootingProgressMs: 0,
      collectedItemIds: [],
    };
  });

  const monsters: MonsterState[] = monsterIds.map((id, index) => {
    const spawn = PROTOTYPE_MONSTER_SPAWNS[index % PROTOTYPE_MONSTER_SPAWNS.length];
    return {
      id,
      x: spawn.x,
      y: spawn.y,
      radius: ENEMY_RADIUS,
      alive: true,
      mode: "investigating",
      investigationTarget: { x: spawn.x, y: spawn.y },
      waitRemainingMs: 0,
      stunRemainingMs: 0,
      visionAngle: 0,
      stuckCheckPosition: { x: spawn.x, y: spawn.y },
      stuckCheckElapsedMs: 0,
      stuckTotalMs: 0,
      enraged: false,
      targetPlayerId: null,
    };
  });

  return {
    // Bez hráčů (viz server/room.ts#createDevRoom, volané dřív, než kdokoliv
    // připojí) není co "hrát" — kolo čeká, dokud první join nespustí
    // room.ts#startRound. Dev sandbox (/dev/multiplayer-survival) volá tuhle
    // funkci rovnou s hráči od začátku, takže tam kolo běží okamžitě.
    roundStatus: playerIds.length > 0 ? "playing" : "waiting",
    roundEndReason: null,
    remainingMs: ROUND_DURATION_MS,
    elapsedMs: 0,
    map: PROTOTYPE_MAP,
    players,
    monsters,
    pickups: PROTOTYPE_PICKUPS.map((pickup) => ({ ...pickup })),
  };
}

function applyPlayerMovement(player: PlayerState, input: MultiplayerSurvivalInputs[number] | undefined, walls: MultiplayerSurvivalState["map"]["walls"], mapWidth: number, mapHeight: number): PlayerState {
  if (!player.alive || !input) return player;

  const dx = input.moveX * player.speed;
  const dy = input.moveY * player.speed;
  const moved = moveWithWallSliding(player.x, player.y, dx, dy, player.radius, walls, mapWidth, mapHeight);
  const direction = dx === 0 && dy === 0 ? player.direction : directionFromVector(dx, dy, player.direction);

  return { ...player, x: moved.x, y: moved.y, direction };
}

/**
 * Automatické sebrání po odstátí v dosahu (stejná mechanika jako
 * EmergencyMiniGame.tsx#pickup — `circlesTouch` + `updateLootingProgressMs`,
 * obě importované, ne kopírované) — na rozdíl od ostré minihry tu NENÍ
 * "hlavní objective vs. extra loot" rozlišení, každý pickup na mapě je
 * rovnocenný a jde sebrat kdykoliv. Hráč, co právě stojí v dosahu
 * NEJBLIŽŠÍHO nesebraného pickupu, akumuluje čas; pohyb kamkoliv jinam
 * (jiný pickup / mimo dosah) progres vynuluje, stejně jako produkční verze.
 */
function applyPickupProgress(
  player: PlayerState,
  wasStationary: boolean,
  pickups: PickupState[],
  deltaMs: number,
): { player: PlayerState; collectedPickupId: string | null } {
  if (!player.alive) return { player, collectedPickupId: null };

  const nearestUncollected = pickups
    .filter((pickup) => !pickup.collected)
    .find((pickup) => circlesTouch(player.x, player.y, player.radius, pickup.x, pickup.y, ITEM_RADIUS));

  if (!nearestUncollected) {
    return player.lootingProgressMs === 0 ? { player, collectedPickupId: null } : { player: { ...player, lootingProgressMs: 0 }, collectedPickupId: null };
  }

  const nextProgressMs = updateLootingProgressMs(true, wasStationary, player.lootingProgressMs, deltaMs);
  if (nextProgressMs < LOOT_PICKUP_DURATION_MS) {
    return { player: { ...player, lootingProgressMs: nextProgressMs }, collectedPickupId: null };
  }

  return {
    player: { ...player, lootingProgressMs: 0, collectedItemIds: [...player.collectedItemIds, nearestUncollected.itemId] },
    collectedPickupId: nearestUncollected.id,
  };
}

/**
 * Zásah monstra brokovnicí — `isEnemyHit` (importovaná, čistá) rozhodne, jestli
 * zásah PROJDE (výseč + line-of-sight); tahle funkce navíc nastaví
 * `stunRemainingMs` (stejná mechanika jako EmergencyMiniGame.tsx#fireShot,
 * jen bez equipment/status side-effektů, které jsou single-player specifické).
 */
function applyShotsToMonster(monster: MonsterState, shooters: PlayerState[], walls: MultiplayerSurvivalState["map"]["walls"]): MonsterState {
  if (!monster.alive || monster.stunRemainingMs > 0) return monster;

  const hit = shooters.some(
    (player) =>
      player.alive &&
      isEnemyHit({
        player: { x: player.x, y: player.y, direction: player.direction },
        enemy: { x: monster.x, y: monster.y, radius: monster.radius, alive: monster.alive },
        coneAngleRad: CONE_ANGLE_RAD,
        range: CONE_RANGE,
        walls,
      }),
  );

  if (!hit) return monster;
  return { ...monster, stunRemainingMs: 10_000 };
}

/**
 * Jeden krok simulace — pohyb hráčů, pickupy, AI monster, zásahy a dotyk
 * hráč/monstrum. Nemutuje vstupní `state`, vrací nový objekt (stejný
 * princip jako updateEnemyAi).
 */
export function tickMultiplayerSurvival(state: MultiplayerSurvivalState, inputs: MultiplayerSurvivalInputs, deltaMs: number): MultiplayerSurvivalState {
  // Kolo, které čeká na hráče nebo už skončilo (výhra/prohra), se dál
  // nesimuluje — žádný pohyb, žádná AI, žádný odpočet času. Rozjet ho zase
  // je výhradně serverová akce (room.ts#startRound/restartRound), ne tik.
  if (state.roundStatus !== "playing") return state;

  const { map } = state;
  const inputByPlayerId = new Map(inputs.map((input) => [input.playerId, input]));

  const movedPlayers = state.players.map((player) => applyPlayerMovement(player, inputByPlayerId.get(player.id), map.walls, map.width, map.height));

  let pickups = state.pickups;
  const playersAfterPickups = movedPlayers.map((player) => {
    const input = inputByPlayerId.get(player.id);
    const wasStationary = !input || (input.moveX === 0 && input.moveY === 0);
    const { player: updatedPlayer, collectedPickupId } = applyPickupProgress(player, wasStationary, pickups, deltaMs);
    if (collectedPickupId) {
      pickups = pickups.map((pickup) => (pickup.id === collectedPickupId ? { ...pickup, collected: true } : pickup));
    }
    return updatedPlayer;
  });

  const shooters = playersAfterPickups.filter((player) => {
    const input = inputByPlayerId.get(player.id);
    return player.alive && player.hasShotgun && player.ammo > 0 && input?.firing;
  });

  // Náboj (a shot-flash "bliknutí" výseče) se spotřebuje pokaždé, když hráč
  // vystřelí, bez ohledu na to, jestli zásah prošel — stejné pravidlo jako
  // EmergencyMiniGame.tsx#fireShot.
  const playersAfterShooting = playersAfterPickups.map((player) => {
    const isShooter = shooters.includes(player);
    if (isShooter) return { ...player, ammo: player.ammo - 1, shotFlashRemainingMs: SHOT_FLASH_DURATION_MS };
    return player.shotFlashRemainingMs > 0 ? { ...player, shotFlashRemainingMs: Math.max(0, player.shotFlashRemainingMs - deltaMs) } : player;
  });

  const monstersAfterAi = state.monsters.map((monster) => {
    if (!monster.alive) return monster;
    // updateEnemyAi (uvnitř tickMonsterAi) si samo řeší i "wounded" větev
    // (jen odpočítá stunRemainingMs, případně přejde do enraged po zotavení)
    // — žádná zvláštní větev tady navíc, ať se nedubluje/neobchází jeho
    // vlastní one-shot enraged přechod (viz README.md).
    const aiUpdated = tickMonsterAi(monster, playersAfterShooting, map.walls, deltaMs);
    return applyShotsToMonster(aiUpdated, shooters, map.walls);
  });

  // Dotyk živého (a neomráčeného) monstra s hráčem srazí hráče k zemi — žádný
  // respawn/damage systém zatím, jen `alive: false`, stejné minimum jako
  // existující "game over on touch" princip v EmergencyMiniGame.tsx.
  const finalPlayers = playersAfterShooting.map((player) => {
    if (!player.alive) return player;
    const touchedByLivingMonster = monstersAfterAi.some((monster) => monster.alive && monster.stunRemainingMs <= 0 && circlesTouch(player.x, player.y, player.radius, monster.x, monster.y, monster.radius));
    return touchedByLivingMonster ? { ...player, alive: false } : player;
  });

  // "Chycení" = kterýkoli DŘÍVE živý hráč je po tomhle tiku dole — kolo končí
  // OKAMŽITĚ (na rozdíl od dřívějšího "all_players_down"), viz zadání
  // "chycení kteréhokoli aktivního hráče monstrem ukončí celé kolo".
  const caughtThisTick = state.players.some((before) => {
    if (!before.alive) return false;
    const after = finalPlayers.find((player) => player.id === before.id);
    return after !== undefined && !after.alive;
  });

  const remainingMs = Math.max(0, state.remainingMs - deltaMs);

  const roundStatus = caughtThisTick ? "lost" : remainingMs <= 0 ? "won" : "playing";
  const roundEndReason = caughtThisTick ? "caught" : remainingMs <= 0 ? "timeout" : null;

  return {
    roundStatus,
    roundEndReason,
    remainingMs,
    elapsedMs: state.elapsedMs + deltaMs,
    map,
    players: finalPlayers,
    monsters: monstersAfterAi,
    pickups,
  };
}
