import type { Metadata } from "next";
import { COPY } from "@/content/copy";
import { getSession } from "@/lib/auth/session";
import { ensureHubPlayer } from "@/lib/leaderboard/ensureHubPlayer";
import { buildDatabasePlayerPreview, buildDatabaseViewer } from "@/lib/database/databaseViewer";
import DatabaseScreen from "@/components/screens/DatabaseScreen";

export const metadata: Metadata = {
  title: COPY.database.seoTitle,
  description: COPY.database.seoDescription,
};

// Veřejné MVP rozhraní interní databáze Objektu 13 (viz zadání,
// docs/database-mvp.md) — Server Component kvůli `metadata` + `getSession()`
// (stejný vzor jako app/leaderboard/page.tsx). Funguje bez přihlášení
// (`getSession()` vrátí `null`, `buildDatabaseViewer(null)` => `{
// isAuthenticated: false }`, žádný redirect/401) i s přihlášením (osobní
// panel dostane skutečná serverová data přes `ensureHubPlayer`, stejné jako
// `/api/auth/me`).
//
// DŮLEŽITÉ: nikdy neposílej `session`/`AuthenticatedPlayer` samotné dál do
// klientské komponenty — `buildDatabaseViewer`/`buildDatabasePlayerPreview`
// (lib/database/databaseViewer.ts) vrací jen bezpečný, normalizovaný tvar
// (viz zadání "neposílej celý interní user objekt do klientské komponenty").
//
// Stránka se nikam neodkazuje (žádný odkaz z navigace/footeru/hry) — dostupná
// jen ručním zadáním URL, viz zadání "Stránka má být přístupná pouze po
// ručním zadání URL /database".
export default async function DatabasePage() {
  const session = await getSession();
  const runState = session ? await ensureHubPlayer(session, "database") : null;

  const viewer = buildDatabaseViewer(session);
  const playerPreview = buildDatabasePlayerPreview(runState);

  return <DatabaseScreen viewer={viewer} playerPreview={playerPreview} />;
}
