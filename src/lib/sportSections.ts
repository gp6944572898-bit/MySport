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

export type EventRank = "amateur" | "local" | "regional" | "national" | "international"

export const EVENT_RANK_LABELS: Record<EventRank, string> = {
  amateur: "Любительский",
  local: "Городской",
  regional: "Региональный",
  national: "Национальный",
  international: "Международный",
}

export const EVENT_RANK_OPTIONS: EventRank[] = [
  "amateur",
  "local",
  "regional",
  "national",
  "international",
]

// Возрастные категории участников для формы события.
export const AGE_CATEGORIES = [
  "до 9 лет",
  "10–12 лет",
  "13–15 лет",
  "16–17 лет",
  "18–34 года",
  "35+ (ветераны)",
  "Без ограничений",
]

export const CURRENCIES = ["RUB", "EUR", "USD"] as const
export type Currency = (typeof CURRENCIES)[number]

// Человекочитаемая цена: «Бесплатно» или «1 500 ₽».
export function formatPrice(price: number | undefined, currency: string | undefined): string {
  if (!price) return "Бесплатно"
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "₽"
  return `${new Intl.NumberFormat("ru-RU").format(price)} ${symbol}`
}
