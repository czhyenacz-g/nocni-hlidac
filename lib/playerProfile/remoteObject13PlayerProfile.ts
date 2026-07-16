import { hubGet, hubPutDetailed } from "../hubClient";
import { isValidObject13PlayerProfileDto, Object13PlayerProfileDto } from "../../game/core/object13PlayerProfile";

/**
 * GET /nocni-hlidac/player-profile?discordUserId=... (krok 1A, viz
 * project-hub-api report) — stejný "tichá null na cokoliv, co se pokazí"
 * vzor jako lib/hardcoreProfile/remoteHardcoreProfile.ts#fetchRemoteHardcoreProfile
 * (hubGet už sám o sobě nikdy nevyhodí). `discordUserId` musí pocházet jen
 * ze server-side session (viz lib/playerProfile/playerProfileRequestHandlers.ts),
 * nikdy z klienta přímo. Odpověď se navíc ověří `isValidObject13PlayerProfileDto`
 * — VPS je sice "náš" server, ale tahle vrstva ho nedůvěřuje naslepo o nic
 * víc než hardcoreProfile (viz zadání "server-side modul musí bezpečně
 * validovat odpověď, odmítnout neplatný tvar").
 */
export async function fetchRemoteObject13PlayerProfile(discordUserId: string): Promise<Object13PlayerProfileDto | null> {
  const raw = await hubGet<unknown>(`/nocni-hlidac/player-profile?discordUserId=${encodeURIComponent(discordUserId)}`);
  return isValidObject13PlayerProfileDto(raw) ? raw : null;
}

/** Co se posílá na VPS PUT — `discordUserId` tu už je (server-side, ze session), na rozdíl od `IncomingObject13PlayerProfilePutBody` (browser -> Next.js proxy), který ho záměrně nezná. */
export interface RemoteObject13PlayerProfilePutPayload {
  discordUserId: string;
  expectedRevision: number;
  profileVersion: number;
  profileData: Record<string, unknown>;
}

/**
 * Rozlišuje přesně tolik výsledků, kolik `playerProfileRequestHandlers.ts`
 * potřebuje pro mapování na HTTP odpověď klientovi (viz zadání "rozliš 404,
 * 409, 413, 500, timeout, neplatnou odpověď") — `unavailable` sdružuje
 * network chybu/timeout/nekonfigurované API/neplatnou odpověď/500, protože
 * klientovi na tomhle rozlišení nezáleží (viz zadání "nevystavuj interní
 * chyby VPS přímo browseru").
 */
export type RemoteObject13PlayerProfilePutResult =
  | { outcome: "saved"; profile: Object13PlayerProfileDto }
  | { outcome: "conflict"; currentRevision: number; currentProfile: Object13PlayerProfileDto | null }
  | { outcome: "too_large" }
  | { outcome: "not_found" }
  | { outcome: "unavailable" };

/**
 * PUT /nocni-hlidac/player-profile — `hubPutDetailed` (ne `hubPost`) proto,
 * že tahle funkce musí rozlišit 200 od 409/413/404, ne jen "ok, nebo null"
 * (viz lib/hubClient.ts#HubResponse). Odpověď na 200 i profil uvnitř 409
 * konfliktu se OBĚ ověří `isValidObject13PlayerProfileDto` — neplatný tvar
 * (ať už na 200, nebo vnořený v 409 konfliktu) se nikdy nepředá dál jako
 * důvěryhodný profil.
 */
export async function putRemoteObject13PlayerProfile(
  payload: RemoteObject13PlayerProfilePutPayload,
): Promise<RemoteObject13PlayerProfilePutResult> {
  const { status, body } = await hubPutDetailed<unknown>("/nocni-hlidac/player-profile", payload);

  if (status === 200 && isValidObject13PlayerProfileDto(body)) {
    return { outcome: "saved", profile: body };
  }
  if (status === 409) {
    const conflict = body as { currentRevision?: unknown; profile?: unknown } | null;
    const currentRevision = typeof conflict?.currentRevision === "number" ? conflict.currentRevision : 0;
    const currentProfile = isValidObject13PlayerProfileDto(conflict?.profile) ? conflict.profile : null;
    return { outcome: "conflict", currentRevision, currentProfile };
  }
  if (status === 413) return { outcome: "too_large" };
  if (status === 404) return { outcome: "not_found" };
  return { outcome: "unavailable" };
}
