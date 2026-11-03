// Готовые оформления баннера события («подборка»): градиент + значок.
// В базе у события хранится только id оформления (events.bannerPreset),
// а рисуется оно в компоненте EventBanner — картинки хранить не нужно.
export type BannerPreset = {
  id: string
  label: string
  gradient: string
  emoji: string
  // Слова из названия вида спорта, для которых это оформление предлагается первым.
  keywords: string[]
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: "ocean",
    label: "Вода",
    gradient: "linear-gradient(135deg,#0ea5e9,#1e3a8a)",
    emoji: "🏊",
    keywords: ["плаван", "водн", "гребл", "парус", "серф", "синхрон", "прыжки в воду"],
  },
  {
    id: "ice",
    label: "Лёд и снег",
    gradient: "linear-gradient(135deg,#67e8f9,#4338ca)",
    emoji: "⛷️",
    keywords: ["лыж", "хоккей", "биатлон", "конько", "сноуборд", "фигурн", "кёрлинг", "санный"],
  },
  {
    id: "track",
    label: "Стадион",
    gradient: "linear-gradient(135deg,#fb923c,#b91c1c)",
    emoji: "🏃",
    keywords: ["легк", "бег", "марафон", "многоборь", "ходьб"],
  },
  {
    id: "grass",
    label: "Поле",
    gradient: "linear-gradient(135deg,#4ade80,#166534)",
    emoji: "⚽",
    keywords: ["футбол", "регби", "гольф", "бейсбол", "хоккей на траве", "лапта", "софтбол"],
  },
  {
    id: "fire",
    label: "Единоборства",
    gradient: "linear-gradient(135deg,#f43f5e,#7c2d12)",
    emoji: "🥋",
    keywords: ["бокс", "борьб", "дзюдо", "карате", "самбо", "единоборств", "кикбоксинг", "тхэквондо", "ушу", "фехтован"],
  },
  {
    id: "night",
    label: "Интеллект",
    gradient: "linear-gradient(135deg,#6366f1,#0f172a)",
    emoji: "♟️",
    keywords: ["шахмат", "шашк", "го", "бридж", "киберспорт", "компьютерн"],
  },
  {
    id: "hall",
    label: "Зал",
    gradient: "linear-gradient(135deg,#facc15,#c2410c)",
    emoji: "🏀",
    keywords: ["баскетбол", "волейбол", "гандбол", "теннис", "бадминтон", "гимнаст", "акробат", "тяжёлая", "пауэрлифтинг"],
  },
  {
    id: "classic",
    label: "Классика",
    gradient: "linear-gradient(135deg,#10b981,#0f766e)",
    emoji: "🏆",
    keywords: [],
  },
]

export function getPreset(id: string | undefined | null): BannerPreset | undefined {
  return BANNER_PRESETS.find((p) => p.id === id)
}

// Подборка для вида спорта: подходящие по названию оформления идут первыми.
export function presetsForSport(sportName: string | undefined): BannerPreset[] {
  const name = (sportName ?? "").toLowerCase()
  const matches = (p: BannerPreset) => p.keywords.some((k) => name.includes(k))
  return [...BANNER_PRESETS.filter(matches), ...BANNER_PRESETS.filter((p) => !matches(p))]
}
