// Obecná definice achievementů (viz components/game/AchievementToast.tsx,
// game/core/achievementStorage.ts) — zatím jen toast popup při odemčení,
// žádný dashboard/seznam. Připraveno na to, aby později přibyly další
// achievementy beze změny toastu/storage.

export type AchievementId = "meet_hynek";

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  meet_hynek: {
    id: "meet_hynek",
    title: "Setkání s Hynkem",
    description: "Úmrtí hned první den.",
  },
};

/** Bezpečný přístup k achievementu — `null`, pokud by `id` neodpovídalo žádnému záznamu (dnes se to nemůže stát, `AchievementId` je uzavřený union, ale volající na tenhle fallback spoléhá stejně jako u getCinematicScene). */
export function getAchievement(id: AchievementId): Achievement | null {
  return ACHIEVEMENTS[id] ?? null;
}
