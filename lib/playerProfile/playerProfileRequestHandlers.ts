import { DiscordPlayer } from "../auth/types";
import {
  Object13PlayerProfileDto,
  validateIncomingObject13PlayerProfileInventoryOperationBody,
  validateIncomingObject13PlayerProfilePutBody,
} from "../../game/core/object13PlayerProfile";
import { Object13InventoryItemId } from "../../game/core/object13PlayerProfileInventory";
import {
  addRemoteObject13PlayerProfileInventoryItem,
  consumeRemoteObject13PlayerProfileInventoryItem,
  fetchRemoteObject13PlayerProfile,
  putRemoteObject13PlayerProfile,
  RemoteObject13PlayerProfileInventoryOperationPayload,
  RemoteObject13PlayerProfileInventoryOperationResult,
} from "./remoteObject13PlayerProfile";

/**
 * Session-in/response-out logika sdílená mezi app/api/player/profile/route.ts
 * GET/PUT handlery — session je záměrně parametr, ne interní `getSession()`
 * volání, ať se dá otestovat bez cookies/request mockingu (stejný vzor jako
 * lib/hardcoreProfile/hardcoreProfileRequestHandlers.ts,
 * lib/leaderboard/guardRunRequestHandlers.ts).
 *
 * Response tvar je záměrně JINÝ než hardcoreProfileRequestHandlers.ts
 * (tam `{ ok: true, profile }` / `{ ok: false, error }`) — tady se na
 * úspěch vrací `Object13PlayerProfileDto` PŘÍMO (bez obálky), na chybu jen
 * `{ error: string, ...extra }` (viz zadání "krok 1B", přesné tvary
 * vyžádané pro 401/409/413/unavailable). Dva nezávislé kontrakty vedle
 * sebe, žádné sdílení typu mezi hardcore a obecným profilem.
 */

export type PlayerProfileGetResponseBody = Object13PlayerProfileDto | { error: string };

export interface PlayerProfileGetResponse {
  status: number;
  body: PlayerProfileGetResponseBody;
}

/**
 * Anonymní (nepřihlášený) požadavek nikdy nevolá VPS — `discordUserId` smí
 * pocházet jen ze server-side session (viz zadání "Browser nesmí mít
 * možnost načíst profil jiného Discord uživatele přidáním query
 * parametru" — tahle funkce se na query vůbec nedívá, jediný vstup je
 * `session`).
 */
export async function handleGetPlayerProfileRequest(session: DiscordPlayer | null): Promise<PlayerProfileGetResponse> {
  if (!session) {
    console.warn("[playerProfileRequestHandlers] get called without a valid session");
    return { status: 401, body: { error: "unauthorized" } };
  }

  const profile = await fetchRemoteObject13PlayerProfile(session.discordUserId);
  if (!profile) {
    console.warn(
      `[playerProfileRequestHandlers] get: hub returned no profile (not configured, failing, or invalid shape), discordUserId: ${session.discordUserId}`,
    );
    return { status: 502, body: { error: "profile_unavailable" } };
  }
  return { status: 200, body: profile };
}

export type PlayerProfilePutErrorBody =
  | { error: "unauthorized" }
  | { error: "invalid_request" }
  | { error: "profile_conflict"; currentRevision: number; currentProfile?: Object13PlayerProfileDto }
  | { error: "profile_too_large" }
  | { error: "profile_not_found" }
  | { error: "profile_unavailable" };

export type PlayerProfilePutResponseBody = Object13PlayerProfileDto | PlayerProfilePutErrorBody;

export interface PlayerProfilePutResponse {
  status: number;
  body: PlayerProfilePutResponseBody;
}

/**
 * `rawBody` je ještě neparsované/nedůvěryhodné JSON tělo requestu z
 * browseru — `validateIncomingObject13PlayerProfilePutBody` (game/core/object13PlayerProfile.ts)
 * ho ověří PŘED jakýmkoliv voláním VPS (viz zadání test "Neplatný browser
 * payload vrátí 400 bez volání VPS"). `discordUserId` se z `rawBody`
 * NIKDY nečte — jde výhradně ze `session.discordUserId` (viz zadání
 * "Browser NESMÍ posílat discordUserId jako autoritativní hodnotu"), takže
 * validátor tenhle typ vůbec nezná.
 */
export async function handlePutPlayerProfileRequest(
  session: DiscordPlayer | null,
  rawBody: unknown,
): Promise<PlayerProfilePutResponse> {
  if (!session) {
    console.warn("[playerProfileRequestHandlers] put called without a valid session");
    return { status: 401, body: { error: "unauthorized" } };
  }

  const validated = validateIncomingObject13PlayerProfilePutBody(rawBody);
  if (!validated.ok) {
    return { status: 400, body: { error: "invalid_request" } };
  }

  const result = await putRemoteObject13PlayerProfile({
    discordUserId: session.discordUserId,
    expectedRevision: validated.data.expectedRevision,
    profileVersion: validated.data.profileVersion,
    profileData: validated.data.profileData,
  });

  switch (result.outcome) {
    case "saved":
      return { status: 200, body: result.profile };
    case "conflict":
      return {
        status: 409,
        body: {
          error: "profile_conflict",
          currentRevision: result.currentRevision,
          ...(result.currentProfile ? { currentProfile: result.currentProfile } : {}),
        },
      };
    case "too_large":
      return { status: 413, body: { error: "profile_too_large" } };
    case "not_found":
      return { status: 404, body: { error: "profile_not_found" } };
    case "unavailable":
      console.warn(
        `[playerProfileRequestHandlers] put: hub returned no result (not configured or failing), discordUserId: ${session.discordUserId}`,
      );
      return { status: 502, body: { error: "profile_unavailable" } };
  }
}

export type PlayerProfileInventoryOperationErrorBody =
  | { error: "unauthorized" }
  | { error: "invalid_request" }
  | { error: "profile_conflict"; currentRevision: number; currentProfile?: Object13PlayerProfileDto }
  | { error: "exceeds_maximum" }
  | { error: "insufficient_inventory" }
  | { error: "profile_not_found" }
  | { error: "profile_unavailable" };

export type PlayerProfileInventoryOperationResponseBody = Object13PlayerProfileDto | PlayerProfileInventoryOperationErrorBody;

export interface PlayerProfileInventoryOperationResponse {
  status: number;
  body: PlayerProfileInventoryOperationResponseBody;
}

/**
 * Sdílená implementace pro `/api/player/profile/inventory/bulb/add|consume`
 * — parametrizovaná `itemId` a konkrétní VPS operací (add vs consume), ať
 * budoucí druhá položka inventáře nepotřebuje kopii celé funkce. Běžná
 * herní logika volá VÝHRADNĚ tudy, nikdy `handlePutPlayerProfileRequest`
 * (viz zadání "obecný PUT nesmí být používán běžnou herní logikou pro
 * změnu žárovek").
 */
async function handleInventoryOperationRequest(
  session: DiscordPlayer | null,
  rawBody: unknown,
  itemId: Object13InventoryItemId,
  operation: (
    itemId: Object13InventoryItemId,
    payload: RemoteObject13PlayerProfileInventoryOperationPayload,
  ) => Promise<RemoteObject13PlayerProfileInventoryOperationResult>,
): Promise<PlayerProfileInventoryOperationResponse> {
  if (!session) {
    console.warn("[playerProfileRequestHandlers] inventory operation called without a valid session");
    return { status: 401, body: { error: "unauthorized" } };
  }

  const validated = validateIncomingObject13PlayerProfileInventoryOperationBody(rawBody);
  if (!validated.ok) {
    return { status: 400, body: { error: "invalid_request" } };
  }

  const result = await operation(itemId, {
    discordUserId: session.discordUserId,
    amount: validated.data.amount,
    expectedRevision: validated.data.expectedRevision,
  });

  switch (result.outcome) {
    case "updated":
      return { status: 200, body: result.profile };
    case "conflict":
      return {
        status: 409,
        body: {
          error: "profile_conflict",
          currentRevision: result.currentRevision,
          ...(result.currentProfile ? { currentProfile: result.currentProfile } : {}),
        },
      };
    case "exceeds_maximum":
      return { status: 409, body: { error: "exceeds_maximum" } };
    case "insufficient_inventory":
      return { status: 409, body: { error: "insufficient_inventory" } };
    case "not_found":
      return { status: 404, body: { error: "profile_not_found" } };
    case "unavailable":
      console.warn(
        `[playerProfileRequestHandlers] inventory operation: hub returned no result, discordUserId: ${session.discordUserId}`,
      );
      return { status: 502, body: { error: "profile_unavailable" } };
  }
}

export function handleAddBulbInventoryRequest(session: DiscordPlayer | null, rawBody: unknown): Promise<PlayerProfileInventoryOperationResponse> {
  return handleInventoryOperationRequest(session, rawBody, "bulb", addRemoteObject13PlayerProfileInventoryItem);
}

export function handleConsumeBulbInventoryRequest(session: DiscordPlayer | null, rawBody: unknown): Promise<PlayerProfileInventoryOperationResponse> {
  return handleInventoryOperationRequest(session, rawBody, "bulb", consumeRemoteObject13PlayerProfileInventoryItem);
}
