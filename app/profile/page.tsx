import type { Metadata } from "next";
import { COPY_CS as COPY } from "@/content/copy";
import ProfileScreen from "@/components/screens/ProfileScreen";

export const metadata: Metadata = {
  title: COPY.profile.seoTitle,
  description: COPY.profile.seoDescription,
};

// Profil hlídače (viz zadání) — Server Component jen kvůli metadata exportu
// (stejný vzor jako app/leaderboard/page.tsx, app/terms/page.tsx), samotný
// obsah je čistě lokální localStorage data, takže žije v client komponentě
// (ProfileScreen.tsx). Veřejně dostupné, žádný Discord login vyžadovaný.
export default function ProfilePage() {
  return <ProfileScreen />;
}
