// Obecná definice achievementů (viz components/game/AchievementToast.tsx,
// game/core/achievementStorage.ts) — zatím jen toast popup při odemčení,
// žádný dashboard/seznam. Připraveno na to, aby později přibyly další
// achievementy beze změny toastu/storage.

export type AchievementId = "meet_hynek";

export interface Achievement {
  id: AchievementId;
}

// title/description žijí v content/copy.ts#achievementDefinitions (klíč =
// AchievementId, viz i18n) — tenhle soubor nese jen jazykově nezávislou
// identitu achievementu.
export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  meet_hynek: {
    id: "meet_hynek",
  },
};

/** Bezpečný přístup k achievementu — `null`, pokud by `id` neodpovídalo žádnému záznamu (dnes se to nemůže stát, `AchievementId` je uzavřený union, ale volající na tenhle fallback spoléhá stejně jako u getCinematicScene). */
export function getAchievement(id: AchievementId): Achievement | null {
  return ACHIEVEMENTS[id] ?? null;
}
