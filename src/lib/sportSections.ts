export type SportSection = "recognized" | "all_russian" | "national" | "applied"

export const SPORT_SECTION_LABELS: Record<SportSection, string> = {
  recognized: "Признанные виды спорта",
  all_russian: "Общероссийские виды спорта",
  national: "Национальные виды спорта",
  applied: "Военно- и служебно-прикладные виды спорта",
}

export const SPORT_SECTION_ORDER: SportSection[] = [
  "all_russian",
  "recognized",
  "national",
  "applied",
]

export type EventRank = "local" | "regional" | "national" | "international"

export const EVENT_RANK_LABELS: Record<EventRank, string> = {
  local: "Местный",
  regional: "Региональный",
  national: "Всероссийский",
  international: "Международный",
}

export const EVENT_RANK_OPTIONS: EventRank[] = [
  "local",
  "regional",
  "national",
  "international",
]
